// ==============================================================================
// GRAPH MEMORY (lib/memoryGraph.ts)
// ==============================================================================
// The frontend owns each character's knowledge graph: it seeds new graphs,
// merges the deltas streamed back by the backend, decays + prunes at round end,
// and persists to localStorage for guests (Firestore wiring lives in firebase.ts).

import type { CharacterId, CharacterMemoryGraph, MemoryDelta, MemoryEdge, MemoryNode } from "../types";
import { CHARACTERS, charNodeId, seedRelationEdges } from "./characters";

export const GUEST_MEMORY_KEY_PREFIX = "roundtable_char_memory_v1:";

const MAX_NODES = 60;
const MAX_EDGES = 120;
const NEW_NODE_SALIENCE = 0.6;
const DECAY_FACTOR = 0.98;

function nowIso(): string {
  return new Date().toISOString();
}

/** A brand-new graph: the character knows itself and its priors about the others. */
export function emptyGraph(selfId: CharacterId): CharacterMemoryGraph {
  const now = nowIso();
  const selfConfig = CHARACTERS[selfId];
  const nodes: MemoryNode[] = [
    {
      id: charNodeId(selfId),
      label: selfConfig.name,
      type: "character",
      summary: `Me. ${selfConfig.tagline}`,
      stance: 1,
      salience: 1,
      mentions: 1,
      createdAt: now,
      updatedAt: now,
    },
    ...selfConfig.seedRelations.map((rel) => {
      const target = CHARACTERS[rel.target];
      return {
        id: charNodeId(rel.target),
        label: target.name,
        type: "character" as const,
        summary: rel.note,
        stance: rel.stance,
        salience: 0.7,
        mentions: 1,
        createdAt: now,
        updatedAt: now,
      };
    }),
  ];
  return {
    characterId: selfId,
    version: 0,
    nodes,
    edges: seedRelationEdges(selfId, now),
    updatedAt: now,
  };
}

/** Upsert-merge one turn's delta into the character's graph (immutably). */
export function applyMemoryDelta(graph: CharacterMemoryGraph, delta: MemoryDelta): CharacterMemoryGraph {
  const now = nowIso();
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const edges = new Map(graph.edges.map((e) => [e.id, e]));

  for (const add of delta.add_nodes ?? []) {
    const existing = nodes.get(add.id);
    if (existing) {
      nodes.set(add.id, {
        ...existing,
        summary: add.summary || existing.summary,
        stance: add.stance ?? existing.stance,
        salience: Math.min(1, existing.salience + 0.15),
        mentions: existing.mentions + 1,
        updatedAt: now,
      });
    } else {
      nodes.set(add.id, {
        id: add.id,
        label: add.label,
        type: add.type,
        summary: add.summary,
        stance: add.stance ?? null,
        salience: NEW_NODE_SALIENCE,
        mentions: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  for (const update of delta.update_nodes ?? []) {
    const existing = nodes.get(update.id);
    if (!existing) continue;
    nodes.set(update.id, {
      ...existing,
      stance: update.stance ?? existing.stance,
      summary: update.summary || existing.summary,
      salience: Math.min(1, existing.salience + (update.salience_boost ?? 0.05)),
      mentions: existing.mentions + 1,
      updatedAt: now,
    });
  }

  for (const add of delta.add_edges ?? []) {
    const id = `${add.source}|${add.relation}|${add.target}`;
    const existing = edges.get(id);
    if (existing) {
      edges.set(id, {
        ...existing,
        stance: add.stance ?? existing.stance,
        note: add.note ?? existing.note,
        weight: Math.min(1, existing.weight + 0.1),
        updatedAt: now,
      });
    } else {
      edges.set(id, {
        id,
        source: add.source,
        target: add.target,
        relation: add.relation,
        stance: add.stance ?? null,
        weight: 0.6,
        note: add.note ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  for (const update of delta.update_edges ?? []) {
    const existing = edges.get(update.id);
    if (!existing) continue;
    edges.set(update.id, {
      ...existing,
      stance: update.stance ?? existing.stance,
      weight: Math.min(1, existing.weight + (update.weight_boost ?? 0.05)),
      note: update.note ?? existing.note,
      updatedAt: now,
    });
  }

  return {
    ...graph,
    version: graph.version + 1,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    updatedAt: now,
  };
}

/** Round-end housekeeping: decay untouched nodes, evict overflow, drop dangling edges. */
export function decayAndPrune(graph: CharacterMemoryGraph, touchedSince: string): CharacterMemoryGraph {
  let nodes = graph.nodes.map((n) =>
    n.updatedAt >= touchedSince ? n : { ...n, salience: n.salience * DECAY_FACTOR },
  );

  if (nodes.length > MAX_NODES) {
    const nowMs = Date.now();
    const score = (n: MemoryNode) => {
      const ageDays = Math.max(0, (nowMs - Date.parse(n.updatedAt || "")) / 86400000 || 0);
      return n.salience * (1 / (1 + ageDays));
    };
    const evictable = nodes
      .filter((n) => n.type !== "character") // inter-character memory is the soul of the table
      .sort((a, b) => score(a) - score(b));
    const toEvict = new Set(evictable.slice(0, nodes.length - MAX_NODES).map((n) => n.id));
    nodes = nodes.filter((n) => !toEvict.has(n.id));
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  let edges = graph.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  if (edges.length > MAX_EDGES) {
    edges = [...edges].sort((a, b) => b.weight - a.weight).slice(0, MAX_EDGES);
  }

  return { ...graph, nodes, edges, updatedAt: nowIso() };
}

// ---- Guest persistence (localStorage) ----

export function loadGuestMemory(selfId: CharacterId): CharacterMemoryGraph {
  try {
    const raw = localStorage.getItem(GUEST_MEMORY_KEY_PREFIX + selfId);
    if (raw) {
      const parsed = JSON.parse(raw) as CharacterMemoryGraph;
      if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        return parsed;
      }
    }
  } catch {
    // corrupted entry — fall through to a fresh graph
  }
  return emptyGraph(selfId);
}

export function saveGuestMemory(graph: CharacterMemoryGraph): void {
  try {
    localStorage.setItem(GUEST_MEMORY_KEY_PREFIX + graph.characterId, JSON.stringify(graph));
  } catch {
    // storage full/blocked — memory stays in-session only
  }
}
