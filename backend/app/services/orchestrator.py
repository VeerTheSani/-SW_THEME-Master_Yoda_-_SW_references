# ==============================================================================
# ROUNDTABLE ORCHESTRATOR (services/orchestrator.py)
# ==============================================================================
# One admin decision per user message: a master-admin agent (fast model) picks
# which 1-3 characters answer and whether the debate is ripe for a closing
# synthesis. Each character turn is one structured call (hidden thought +
# public reply + memory delta), sequential or parallel. Yields NDJSON events.

import asyncio
from typing import AsyncIterator, Dict, List, Tuple

from app.models.roundtable_schemas import (
    AdminDecision,
    AdminTurnPlan,
    BoardroomSynthesis,
    CharacterTurnOutput,
    MemoryDelta,
    PitchSynthesis,
    RoundtableRequest,
    TurnScore,
)
from app.services.characters import CharacterSpec, get_character
from app.services.llm_service import make_caller
from app.services.memory import recall_subgraph, render_graph_for_prompt, sanitize_delta
from app.services.roundtable_prompts import (
    build_admin_prompt,
    build_character_turn_prompt,
    build_scorekeeper_prompt,
    build_synthesis_prompt,
)

# The admin decision is tiny — speed matters more than depth there. Character
# turns keep the user-selected model. (There is no plain "gemini-3.1-flash" on
# the API — lite is the fast 3.1 variant.)
ADMIN_MODEL = "gemini-3.1-flash-lite"
ADMIN_TEMPERATURE = 0.3
SYNTHESIS_TEMPERATURE = 0.5
SCOREKEEPER_TEMPERATURE = 0.2
# Character turns that must exist in the transcript before the admin may close.
MIN_TURNS_BEFORE_CLOSE = 3

# Canned Adjudicator grades for the keyless demo — brutal on purpose.
_OFFLINE_GRADES = [
    (-3.5, "Vague posturing — no numbers, no plan, nothing the table didn't already know."),
    (2.0, "One real point buried under theatrics; barely advances the debate."),
    (6.5, "Concrete and actionable — the first reply that actually moved the table forward."),
]


def _admin_setup(caller, model_name: str, provider_base_url, moderator) -> Tuple[object, str]:
    """The moderator + Adjudicator brain: a separate provider when the user
    configured one, otherwise the main caller (fast ADMIN_MODEL on Google,
    the chat model on a custom relay whose catalog we can't assume)."""
    if moderator:
        mod_url, mod_key, mod_model = moderator
        return make_caller(mod_key, mod_model, mod_url), mod_model
    return caller, (model_name if provider_base_url else ADMIN_MODEL)


async def _adjudicate(admin_caller, admin_model: str, caller, chat_model: str, mode: str,
                      speaker: CharacterSpec, reply_text: str, transcript) -> dict | None:
    """One independent Adjudicator grade for one reply. Returns None on any
    failure — a missing score must never break the round."""
    system, user = build_scorekeeper_prompt(mode, speaker, reply_text, transcript)
    try:
        try:
            graded = await asyncio.wait_for(
                admin_caller.json(system, user, TurnScore, SCOREKEEPER_TEMPERATURE, model=admin_model), timeout=45)
        except Exception:
            if admin_caller is caller and admin_model == chat_model:
                raise
            # The moderator brain may be down/unavailable — retry on the chat provider.
            graded = await asyncio.wait_for(
                caller.json(system, user, TurnScore, SCOREKEEPER_TEMPERATURE), timeout=45)
    except Exception:
        return None
    return {
        "score": max(-10.0, min(10.0, graded.score)),
        "verdict": (graded.verdict or "").strip()[:140],
    }


def _transcript_from_request(req: RoundtableRequest) -> List[Tuple[str, str]]:
    transcript: List[Tuple[str, str]] = []
    for msg in req.history:
        if msg.sender == "user":
            transcript.append(("USER", msg.text))
        else:
            try:
                transcript.append((get_character(msg.sender).name, msg.text))
            except KeyError:
                transcript.append((msg.sender, msg.text))
    transcript.append(("USER", req.text))
    return transcript


def _least_spoken(seated: List[CharacterSpec], spoken_counts: Dict[str, int], exclude: str = "") -> str:
    candidates = [s.id for s in seated if s.id != exclude] or [s.id for s in seated]
    return min(candidates, key=lambda cid: spoken_counts[cid])


def _spoken_counts_from_history(req: RoundtableRequest, seated_ids: List[str]) -> Dict[str, int]:
    counts = {cid: 0 for cid in seated_ids}
    for msg in req.history:
        if msg.sender in counts:
            counts[msg.sender] += 1
    return counts


def _fallback_admin_plan(seated: List[CharacterSpec], spoken_counts: Dict[str, int]) -> Tuple[List[AdminTurnPlan], bool, str]:
    speaker = _least_spoken(seated, spoken_counts)
    plan = [AdminTurnPlan(speaker=speaker, directive="Give your position on the matter the user just raised.")]
    return plan, False, "Moderator offline — handing the floor to the quietest seat."


def _sanitize_admin_decision(
    decision: AdminDecision,
    seated: List[CharacterSpec],
    spoken_counts: Dict[str, int],
    allow_close: bool,
) -> Tuple[List[AdminTurnPlan], bool, str]:
    """Never trust model output raw: dedupe, drop unknown seats, clamp to 1-3."""
    seated_ids = {s.id for s in seated}
    seen, turns = set(), []
    for turn in decision.turns:
        if turn.speaker in seated_ids and turn.speaker not in seen:
            seen.add(turn.speaker)
            turns.append(AdminTurnPlan(speaker=turn.speaker, directive=turn.directive or "Give your take."))
        if len(turns) == 3:
            break
    if not turns:
        return _fallback_admin_plan(seated, spoken_counts)
    return turns, decision.close_round and allow_close, decision.reasoning


def _offline_stances(mode: str) -> List[float]:
    return [6.5, 3.5, 5.0] if mode == "pitch" else [0.4, -0.3, 0.1]


def _naive_synthesis(mode: str, seated: List[CharacterSpec], stance_scores: Dict[str, float]) -> dict:
    if mode == "pitch":
        scorecard = [
            {"judge": s.id, "score": round(stance_scores.get(s.id, 5.0), 1), "objection": "No closing objection recorded."}
            for s in seated
        ]
        avg = sum(item["score"] for item in scorecard) / len(scorecard)
        verdict = "invest" if avg >= 7 else ("counteroffer" if avg >= 4.5 else "pass")
        return {
            "kind": "pitch",
            "verdict": verdict,
            "scorecard": scorecard,
            "summary": f"Panel average {avg:.1f}/10 — assembled from the judges' running scores.",
        }
    stances = [stance_scores.get(s.id, 0.0) for s in seated]
    avg = sum(stances) / len(stances)
    leaning = "in favor of" if avg >= 0.15 else ("against" if avg <= -0.15 else "split on")
    dissenter = min(seated, key=lambda s: stance_scores.get(s.id, 0.0))
    return {
        "kind": "boardroom",
        "decision": f"The board is {leaning} the proposal (average stance {avg:+.2f}).",
        "rationale": "Assembled from the members' final stance scores.",
        "actionItems": [{"owner": "user", "item": "Refine the proposal and bring it back to the table."}],
        "dissent": f"{dissenter.name} was the most skeptical voice." if avg > -0.15 else None,
    }


async def run_direct_reply(req: RoundtableRequest, api_key: str, model_name: str, moderator=None) -> AsyncIterator[dict]:
    """@name targeting: exactly one character replies, no router, no synthesis, no loop."""
    seated = [get_character(p.characterId) for p in req.participants]
    memories = {p.characterId: p.memory for p in req.participants}
    seated_ids = [s.id for s in seated]
    speaker = get_character(req.targetCharacterId)
    transcript = _transcript_from_request(req)

    caller = make_caller(api_key, model_name, req.providerBaseUrl)

    yield {"event": "round_start", "data": {"mode": req.mode, "participants": seated_ids, "maxTurns": 1}}
    directive = "The user addressed you directly by name. Reply only to them — do not summon the rest of the table."
    yield {"event": "turn_start", "data": {"speaker": speaker.id, "turnIndex": 0, "directive": directive}}

    nodes, edges = recall_subgraph(memories[speaker.id], req.text, seated_ids)
    yield {"event": "memory_recall", "data": {
        "speaker": speaker.id, "turnIndex": 0,
        "nodeIds": [n.id for n in nodes], "nodeLabels": [n.label for n in nodes],
    }}

    try:
        memory_render = render_graph_for_prompt(nodes, edges, speaker.id)
        system, user = build_character_turn_prompt(
            speaker, req.mode, directive, memory_render, transcript, req.responseLength or "medium", seated)
        turn = await caller.json(system, user, CharacterTurnOutput, speaker.temperature)
        delta = sanitize_delta(turn.memory_delta)
        yield {"event": "turn_complete", "data": {
            "speaker": speaker.id, "turnIndex": 0,
            "innerThought": turn.inner_thought, "publicReply": turn.public_reply,
            "stanceScore": turn.stance_score, "memoryDelta": delta.model_dump(), "isFallback": False,
        }}
        if req.scorekeeperEnabled:
            admin_caller, admin_model = _admin_setup(caller, model_name, req.providerBaseUrl, moderator)
            transcript.append((speaker.name, turn.public_reply))
            graded = await _adjudicate(admin_caller, admin_model, caller, model_name, req.mode, speaker, turn.public_reply, transcript)
            if graded:
                yield {"event": "turn_score", "data": {"speaker": speaker.id, "turnIndex": 0, **graded}}
    except Exception as e:
        lines = speaker.offline_lines.get(req.mode) or ["..."]
        yield {"event": "turn_error", "data": {
            "speaker": speaker.id, "turnIndex": 0,
            "message": str(e)[:300], "fallbackReply": lines[0], "isFallback": True,
        }}

    yield {"event": "round_end", "data": {"turnsTaken": 1}}


async def run_admin_roundtable(req: RoundtableRequest, api_key: str, model_name: str, moderator=None) -> AsyncIterator[dict]:
    """One exchange: the master admin picks 1-3 responders (and possibly closes
    the round), the chosen characters speak — sequentially or in parallel —
    then control returns to the user."""
    seated = [get_character(p.characterId) for p in req.participants]
    memories = {p.characterId: p.memory for p in req.participants}
    seated_ids = [s.id for s in seated]
    transcript = _transcript_from_request(req)
    spoken_counts = _spoken_counts_from_history(req, seated_ids)
    stance_scores: Dict[str, float] = {}

    caller = make_caller(api_key, model_name, req.providerBaseUrl)  # one caller for the whole exchange
    # Moderator + Adjudicator brain — a separate provider when configured.
    admin_caller, admin_model = _admin_setup(caller, model_name, req.providerBaseUrl, moderator)
    allow_close = sum(spoken_counts.values()) >= MIN_TURNS_BEFORE_CLOSE

    # --- ADMIN: one decision — who answers, in what order, close or not ---
    try:
        system, user = build_admin_prompt(req.mode, seated, transcript, spoken_counts, allow_close)
        try:
            decision = await admin_caller.json(system, user, AdminDecision, ADMIN_TEMPERATURE, model=admin_model)
        except Exception:
            if admin_caller is caller and admin_model == model_name:
                raise
            # The moderator brain may be unavailable — retry on the chat provider/model.
            decision = await caller.json(system, user, AdminDecision, ADMIN_TEMPERATURE)
        plan, close_round, reasoning = _sanitize_admin_decision(decision, seated, spoken_counts, allow_close)
    except Exception:
        plan, close_round, reasoning = _fallback_admin_plan(seated, spoken_counts)

    yield {"event": "round_start", "data": {"mode": req.mode, "participants": seated_ids, "maxTurns": len(plan)}}

    def recall_events(speaker_id: str, turn_index: int):
        recent_text = " ".join(text for _who, text in transcript[-3:])
        nodes, edges = recall_subgraph(memories[speaker_id], recent_text, seated_ids)
        event = {"event": "memory_recall", "data": {
            "speaker": speaker_id, "turnIndex": turn_index,
            "nodeIds": [n.id for n in nodes], "nodeLabels": [n.label for n in nodes],
        }}
        return nodes, edges, event

    def turn_prompt(speaker: CharacterSpec, directive: str, nodes, edges) -> Tuple[str, str]:
        memory_render = render_graph_for_prompt(nodes, edges, speaker.id)
        return build_character_turn_prompt(
            speaker, req.mode, directive, memory_render, transcript, req.responseLength or "medium", seated)

    def complete_event(speaker: CharacterSpec, turn_index: int, turn: CharacterTurnOutput) -> dict:
        delta = sanitize_delta(turn.memory_delta)
        if turn.stance_score is not None:
            stance_scores[speaker.id] = turn.stance_score
        return {"event": "turn_complete", "data": {
            "speaker": speaker.id, "turnIndex": turn_index,
            "innerThought": turn.inner_thought, "publicReply": turn.public_reply,
            "stanceScore": turn.stance_score, "memoryDelta": delta.model_dump(), "isFallback": False,
        }}

    def error_event(speaker: CharacterSpec, turn_index: int, error: Exception) -> Tuple[dict, str]:
        lines = speaker.offline_lines.get(req.mode) or ["..."]
        fallback_line = lines[spoken_counts[speaker.id] % len(lines)]
        return {"event": "turn_error", "data": {
            "speaker": speaker.id, "turnIndex": turn_index,
            "message": str(error)[:300], "fallbackReply": fallback_line, "isFallback": True,
        }}, fallback_line

    if req.parallelReplies and len(plan) > 1:
        # --- PARALLEL: everyone answers the user independently, blind to each other ---
        prepared = []
        for index, planned in enumerate(plan):
            speaker = get_character(planned.speaker)
            yield {"event": "router_decision", "data": {
                "action": "speak", "next_speaker": speaker.id, "directive": planned.directive,
                "reasoning": reasoning if index == 0 else "", "turnIndex": index,
            }}
            yield {"event": "turn_start", "data": {"speaker": speaker.id, "turnIndex": index, "directive": planned.directive}}
            nodes, edges, recall = recall_events(speaker.id, index)
            yield recall
            system, user = turn_prompt(speaker, planned.directive, nodes, edges)
            # Hard per-call timeout: one stalled connection must not dead-air the whole stream.
            call = asyncio.wait_for(caller.json(system, user, CharacterTurnOutput, speaker.temperature), timeout=90)
            prepared.append((index, speaker, call))

        results = await asyncio.gather(*(call for _i, _s, call in prepared), return_exceptions=True)
        for (index, speaker, _call), result in zip(prepared, results):
            if isinstance(result, Exception):
                event, fallback_line = error_event(speaker, index, result)
                yield event
                transcript.append((speaker.name, fallback_line))
            else:
                yield complete_event(speaker, index, result)
                transcript.append((speaker.name, result.public_reply))
                if req.scorekeeperEnabled:
                    graded = await _adjudicate(admin_caller, admin_model, caller, model_name, req.mode, speaker, result.public_reply, transcript)
                    if graded:
                        yield {"event": "turn_score", "data": {"speaker": speaker.id, "turnIndex": index, **graded}}
            spoken_counts[speaker.id] += 1
    else:
        # --- SEQUENTIAL: speakers go in the admin's order, each seeing the last ---
        for index, planned in enumerate(plan):
            speaker = get_character(planned.speaker)
            yield {"event": "router_decision", "data": {
                "action": "speak", "next_speaker": speaker.id, "directive": planned.directive,
                "reasoning": reasoning if index == 0 else "", "turnIndex": index,
            }}
            yield {"event": "turn_start", "data": {"speaker": speaker.id, "turnIndex": index, "directive": planned.directive}}
            nodes, edges, recall = recall_events(speaker.id, index)
            yield recall
            try:
                system, user = turn_prompt(speaker, planned.directive, nodes, edges)
                turn = await caller.json(system, user, CharacterTurnOutput, speaker.temperature)
                yield complete_event(speaker, index, turn)
                transcript.append((speaker.name, turn.public_reply))
                if req.scorekeeperEnabled:
                    graded = await _adjudicate(admin_caller, admin_model, caller, model_name, req.mode, speaker, turn.public_reply, transcript)
                    if graded:
                        yield {"event": "turn_score", "data": {"speaker": speaker.id, "turnIndex": index, **graded}}
            except Exception as e:
                event, fallback_line = error_event(speaker, index, e)
                yield event
                transcript.append((speaker.name, fallback_line))
            spoken_counts[speaker.id] += 1

    # --- SYNTHESIS: only when the admin declared the debate settled ---
    if close_round:
        schema = PitchSynthesis if req.mode == "pitch" else BoardroomSynthesis
        try:
            system, user = build_synthesis_prompt(req.mode, seated, transcript, stance_scores)
            synthesis = await caller.json(system, user, schema, SYNTHESIS_TEMPERATURE)
            synthesis_data = {"kind": req.mode, **synthesis.model_dump()}
        except Exception:
            synthesis_data = _naive_synthesis(req.mode, seated, stance_scores)
        yield {"event": "round_synthesis", "data": synthesis_data}

    yield {"event": "round_end", "data": {"turnsTaken": len(plan)}}


async def run_offline_direct_reply(req: RoundtableRequest) -> AsyncIterator[dict]:
    """Keyless @name targeting: one canned reply from the named character, through the same events."""
    seated_ids = [p.characterId for p in req.participants]
    speaker = get_character(req.targetCharacterId)

    yield {"event": "round_start", "data": {"mode": req.mode, "participants": seated_ids, "maxTurns": 1}}
    yield {"event": "turn_start", "data": {"speaker": speaker.id, "turnIndex": 0, "directive": "Offline demo — direct reply."}}
    yield {"event": "memory_recall", "data": {"speaker": speaker.id, "turnIndex": 0, "nodeIds": [], "nodeLabels": []}}
    await asyncio.sleep(0.3)
    lines = speaker.offline_lines.get(req.mode) or ["..."]
    yield {"event": "turn_complete", "data": {
        "speaker": speaker.id, "turnIndex": 0,
        "innerThought": speaker.offline_thought, "publicReply": lines[0],
        "stanceScore": None, "memoryDelta": MemoryDelta().model_dump(), "isFallback": True,
    }}
    if req.scorekeeperEnabled:
        score, verdict = _OFFLINE_GRADES[0]
        yield {"event": "turn_score", "data": {"speaker": speaker.id, "turnIndex": 0, "score": score, "verdict": verdict}}
    yield {"event": "round_end", "data": {"turnsTaken": 1}}


async def run_offline_roundtable(req: RoundtableRequest) -> AsyncIterator[dict]:
    """Keyless demo: a deterministic scripted round through the identical event pipeline."""
    seated = [get_character(p.characterId) for p in req.participants]
    seated_ids = [s.id for s in seated]
    stances = _offline_stances(req.mode)
    stance_scores: Dict[str, float] = {}

    yield {"event": "round_start", "data": {"mode": req.mode, "participants": seated_ids, "maxTurns": 3}}

    for index, speaker in enumerate(seated):
        await asyncio.sleep(0.35)  # let the table breathe — turns land one by one
        yield {"event": "router_decision", "data": {
            "action": "speak", "next_speaker": speaker.id,
            "directive": "Offline demo — give your canned position.",
            "reasoning": "No API key configured; the moderator proceeds clockwise.",
            "turnIndex": index,
        }}
        yield {"event": "turn_start", "data": {"speaker": speaker.id, "turnIndex": index, "directive": "Offline demo turn."}}
        yield {"event": "memory_recall", "data": {"speaker": speaker.id, "turnIndex": index, "nodeIds": [], "nodeLabels": []}}
        lines = speaker.offline_lines.get(req.mode) or ["..."]
        stance = stances[index % len(stances)]
        stance_scores[speaker.id] = stance
        yield {"event": "turn_complete", "data": {
            "speaker": speaker.id, "turnIndex": index,
            "innerThought": speaker.offline_thought,
            "publicReply": lines[0],
            "stanceScore": stance,
            "memoryDelta": MemoryDelta().model_dump(),
            "isFallback": True,
        }}
        if req.scorekeeperEnabled:
            score, verdict = _OFFLINE_GRADES[index % len(_OFFLINE_GRADES)]
            yield {"event": "turn_score", "data": {"speaker": speaker.id, "turnIndex": index, "score": score, "verdict": verdict}}

    await asyncio.sleep(0.35)
    yield {"event": "round_synthesis", "data": _naive_synthesis(req.mode, seated, stance_scores)}
    yield {"event": "round_end", "data": {"turnsTaken": len(seated)}}
