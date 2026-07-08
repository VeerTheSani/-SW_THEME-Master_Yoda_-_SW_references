# ==============================================================================
# GRAPH MEMORY SERVICE (services/memory.py)
# ==============================================================================
# Deterministic recall over a character's knowledge graph (no LLM calls) plus
# delta sanitization. The backend never stores graphs — the frontend sends the
# current graph per request and persists the deltas we emit.

import re
from datetime import datetime, timezone
from typing import List, Tuple

from app.models.roundtable_schemas import (
    CharacterMemoryGraph,
    DeltaEdge,
    DeltaEdgeUpdate,
    DeltaNode,
    DeltaNodeUpdate,
    MemoryDelta,
    MemoryEdge,
    MemoryNode,
)

_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "to",
    "of", "in", "on", "for", "with", "at", "by", "it", "its", "this", "that",
    "i", "you", "we", "they", "he", "she", "my", "your", "our", "their", "me",
    "do", "does", "did", "not", "no", "so", "as", "if", "then", "than", "too",
}

# Per-turn delta caps — keeps graphs bounded and prompts honest.
MAX_ADD_NODES = 4
MAX_ADD_EDGES = 6
MAX_UPDATES = 6

_NODE_ID_PREFIXES = ("char:", "concept:", "project:", "event:", "belief:")
_TYPE_TO_PREFIX = {
    "character": "char:",
    "concept": "concept:",
    "project": "project:",
    "event": "event:",
    "belief": "belief:",
}


def _tokens(text: str) -> set:
    return set(re.findall(r"[a-z0-9']+", (text or "").lower())) - _STOPWORDS


def _recency(iso_ts: str, now: datetime) -> float:
    try:
        ts = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        age_days = max(0.0, (now - ts).total_seconds() / 86400.0)
        return 1.0 / (1.0 + age_days)
    except (ValueError, AttributeError):
        return 0.5


def recall_subgraph(
    graph: CharacterMemoryGraph,
    query_text: str,
    seated_ids: List[str],
    k: int = 12,
) -> Tuple[List[MemoryNode], List[MemoryEdge]]:
    """Top-k nodes by 0.5*salience + 0.3*recency + 0.2*keyword overlap,
    force-including the other seated characters' `char:` nodes, then every
    edge whose endpoints both made the cut."""
    now = datetime.now(timezone.utc)
    query_tokens = _tokens(query_text)

    scored = []
    for node in graph.nodes:
        overlap_hits = len(_tokens(f"{node.label} {node.summary}") & query_tokens)
        overlap = min(1.0, overlap_hits / 4.0)
        score = 0.5 * node.salience + 0.3 * _recency(node.updatedAt, now) + 0.2 * overlap
        scored.append((score, node))
    scored.sort(key=lambda pair: pair[0], reverse=True)

    selected = {node.id: node for _score, node in scored[:k]}
    forced_ids = {f"char:{cid}" for cid in seated_ids}
    for node in graph.nodes:
        if node.id in forced_ids:
            selected[node.id] = node

    edges = [e for e in graph.edges if e.source in selected and e.target in selected]
    return list(selected.values()), edges


def _stance_word(stance) -> str:
    if stance is None:
        return "neutral"
    if stance >= 0.5:
        return f"strongly positive ({stance:+.1f})"
    if stance >= 0.15:
        return f"positive ({stance:+.1f})"
    if stance <= -0.5:
        return f"strongly negative ({stance:+.1f})"
    if stance <= -0.15:
        return f"negative ({stance:+.1f})"
    return f"neutral ({stance:+.1f})"


def render_graph_for_prompt(nodes: List[MemoryNode], edges: List[MemoryEdge], self_id: str) -> str:
    """Render the recalled subgraph as first-person memory for the system prompt."""
    self_node_id = f"char:{self_id}"
    belief_lines = []
    for node in nodes:
        if node.type == "character":
            continue
        stance = _stance_word(node.stance)
        belief_lines.append(f"- [{node.type}] {node.label}: {node.summary} (my stance: {stance})")

    relation_lines = []
    for edge in edges:
        if edge.source == self_node_id and edge.target.startswith("char:"):
            target_label = next((n.label for n in nodes if n.id == edge.target), edge.target[5:])
            note = f" — {edge.note}" if edge.note else ""
            relation_lines.append(f"- {target_label}: I {edge.relation.replace('_', ' ')} them ({_stance_word(edge.stance)}){note}")

    other_edge_lines = []
    for edge in edges:
        if edge.source == self_node_id and edge.target.startswith("char:"):
            continue
        src = next((n.label for n in nodes if n.id == edge.source), edge.source)
        tgt = next((n.label for n in nodes if n.id == edge.target), edge.target)
        note = f" ({edge.note})" if edge.note else ""
        other_edge_lines.append(f"- {src} --{edge.relation}--> {tgt}{note}")

    sections = []
    if belief_lines:
        sections.append("WHAT I REMEMBER AND BELIEVE:\n" + "\n".join(belief_lines[:14]))
    if relation_lines:
        sections.append("MY RELATIONSHIPS AT THIS TABLE:\n" + "\n".join(relation_lines))
    if other_edge_lines:
        sections.append("CONNECTIONS I HAVE DRAWN:\n" + "\n".join(other_edge_lines[:8]))
    if not sections:
        return "MY MEMORY: Empty. This is my first conversation at this table."
    return "\n\n".join(sections)


def _clip(text, limit: int):
    if text is None:
        return None
    return text[:limit]


def _clamp(value, lo: float, hi: float):
    if value is None:
        return None
    try:
        return max(lo, min(hi, float(value)))
    except (TypeError, ValueError):
        return None


def _normalize_node_id(raw_id: str, node_type: str) -> str:
    node_id = re.sub(r"\s+", "-", (raw_id or "").strip().lower())
    if not node_id.startswith(_NODE_ID_PREFIXES):
        node_id = _TYPE_TO_PREFIX.get(node_type, "concept:") + node_id.lstrip(":")
    return node_id[:80]


def sanitize_delta(delta: MemoryDelta) -> MemoryDelta:
    """Clamp counts, clip strings, normalize ids — never trust model output raw."""
    add_nodes = []
    for node in delta.add_nodes[:MAX_ADD_NODES]:
        if not node.id and not node.label:
            continue
        add_nodes.append(DeltaNode(
            id=_normalize_node_id(node.id or node.label, node.type),
            label=_clip(node.label, 60) or node.id,
            type=node.type,
            summary=_clip(node.summary, 140) or "",
            stance=_clamp(node.stance, -1.0, 1.0),
        ))

    update_nodes = [
        DeltaNodeUpdate(
            id=_clip(u.id, 80),
            stance=_clamp(u.stance, -1.0, 1.0),
            summary=_clip(u.summary, 140),
            salience_boost=_clamp(u.salience_boost, 0.0, 0.4),
        )
        for u in delta.update_nodes[:MAX_UPDATES] if u.id
    ]

    add_edges = []
    for edge in delta.add_edges[:MAX_ADD_EDGES]:
        if not edge.source or not edge.target:
            continue
        add_edges.append(DeltaEdge(
            source=_clip(edge.source.strip().lower(), 80),
            target=_clip(edge.target.strip().lower(), 80),
            relation=_clip(re.sub(r"\s+", "_", edge.relation.strip().lower()), 30) or "related_to",
            stance=_clamp(edge.stance, -1.0, 1.0),
            note=_clip(edge.note, 120),
        ))

    update_edges = [
        DeltaEdgeUpdate(
            id=_clip(u.id, 200),
            stance=_clamp(u.stance, -1.0, 1.0),
            weight_boost=_clamp(u.weight_boost, 0.0, 0.4),
            note=_clip(u.note, 120),
        )
        for u in delta.update_edges[:MAX_UPDATES] if u.id
    ]

    return MemoryDelta(
        add_nodes=add_nodes,
        update_nodes=update_nodes,
        add_edges=add_edges,
        update_edges=update_edges,
    )
