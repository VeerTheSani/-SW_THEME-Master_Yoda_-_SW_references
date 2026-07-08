# ==============================================================================
# ROUNDTABLE ORCHESTRATOR (services/orchestrator.py)
# ==============================================================================
# The round loop: a router agent decides who speaks; each character turn is one
# structured Gemini call (hidden thought + public reply + memory delta); a
# synthesis agent closes the round. Yields NDJSON-protocol event dicts.

import asyncio
from typing import AsyncIterator, Dict, List, Tuple

from google import genai

from app.models.roundtable_schemas import (
    BoardroomSynthesis,
    CharacterTurnOutput,
    MemoryDelta,
    PitchSynthesis,
    RouterDecision,
    RoundtableRequest,
)
from app.services.characters import CharacterSpec, get_character
from app.services.llm_service import call_gemini_json
from app.services.memory import recall_subgraph, render_graph_for_prompt, sanitize_delta
from app.services.roundtable_prompts import (
    build_character_turn_prompt,
    build_router_prompt,
    build_synthesis_prompt,
)

MIN_TURNS = 3
ROUTER_TEMPERATURE = 0.4
SYNTHESIS_TEMPERATURE = 0.5


def _clamp_max_turns(requested: int) -> int:
    return max(MIN_TURNS, min(10, requested))


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


def _fallback_router_decision(
    seated: List[CharacterSpec],
    spoken_counts: Dict[str, int],
    turns_taken: int,
    last_speaker: str,
) -> RouterDecision:
    everyone_spoke = all(count > 0 for count in spoken_counts.values())
    if everyone_spoke and turns_taken >= MIN_TURNS:
        return RouterDecision(action="end_round", reasoning="Moderator offline — round-robin complete, closing the round.")
    speaker = _least_spoken(seated, spoken_counts, exclude=last_speaker)
    return RouterDecision(
        action="speak",
        next_speaker=speaker,
        directive="Give your position on the matter at hand and react to the previous speaker.",
        reasoning="Moderator offline — proceeding round-robin.",
    )


def _enforce_router_rules(
    decision: RouterDecision,
    seated: List[CharacterSpec],
    spoken_counts: Dict[str, int],
    turns_taken: int,
    recent_speakers: List[str],
) -> RouterDecision:
    seated_ids = {s.id for s in seated}
    everyone_spoke = all(count > 0 for count in spoken_counts.values())

    if decision.action == "end_round":
        if turns_taken >= MIN_TURNS and everyone_spoke:
            return decision
        # Too early — someone hasn't spoken yet. Override to the quietest seat.
        speaker = _least_spoken(seated, spoken_counts)
        return RouterDecision(
            action="speak",
            next_speaker=speaker,
            directive="The moderator wants your voice before the round closes — state your position.",
            reasoning=f"(overridden: {speaker} had not spoken yet) {decision.reasoning}",
        )

    speaker = decision.next_speaker if decision.next_speaker in seated_ids else _least_spoken(seated, spoken_counts)
    # No third consecutive turn for the same mouth.
    if len(recent_speakers) >= 2 and recent_speakers[-1] == recent_speakers[-2] == speaker:
        speaker = _least_spoken(seated, spoken_counts, exclude=speaker)
    if speaker != decision.next_speaker:
        return RouterDecision(
            action="speak",
            next_speaker=speaker,
            directive=decision.directive or "React to what was just said with your own position.",
            reasoning=f"(speaker adjusted by table rules) {decision.reasoning}",
        )
    return decision


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


async def run_roundtable(req: RoundtableRequest, api_key: str, model_name: str) -> AsyncIterator[dict]:
    seated = [get_character(p.characterId) for p in req.participants]
    memories = {p.characterId: p.memory for p in req.participants}
    seated_ids = [s.id for s in seated]
    max_turns = _clamp_max_turns(req.maxTurns)
    transcript = _transcript_from_request(req)
    spoken_counts: Dict[str, int] = {cid: 0 for cid in seated_ids}
    recent_speakers: List[str] = []
    stance_scores: Dict[str, float] = {}
    turns_taken = 0
    consecutive_failures = 0

    client = genai.Client(api_key=api_key)  # one client for the whole round

    yield {"event": "round_start", "data": {"mode": req.mode, "participants": seated_ids, "maxTurns": max_turns}}

    while turns_taken < max_turns:
        # --- ROUTER: who speaks next? ---
        try:
            system, user = build_router_prompt(req.mode, seated, transcript, turns_taken, max_turns, spoken_counts)
            decision = await call_gemini_json(client, model_name, system, user, RouterDecision, ROUTER_TEMPERATURE)
        except Exception:
            decision = _fallback_router_decision(seated, spoken_counts, turns_taken, recent_speakers[-1] if recent_speakers else "")

        decision = _enforce_router_rules(decision, seated, spoken_counts, turns_taken, recent_speakers)
        yield {"event": "router_decision", "data": {**decision.model_dump(), "turnIndex": turns_taken}}

        if decision.action == "end_round":
            break

        speaker = get_character(decision.next_speaker)
        directive = decision.directive or "Give your take."
        yield {"event": "turn_start", "data": {"speaker": speaker.id, "turnIndex": turns_taken, "directive": directive}}

        # --- RECALL: deterministic subgraph from the character's own memory ---
        recent_text = " ".join(text for _who, text in transcript[-3:])
        nodes, edges = recall_subgraph(memories[speaker.id], recent_text, seated_ids)
        yield {"event": "memory_recall", "data": {
            "speaker": speaker.id, "turnIndex": turns_taken,
            "nodeIds": [n.id for n in nodes], "nodeLabels": [n.label for n in nodes],
        }}

        # --- TURN: one structured call — hidden thought, public reply, memory delta ---
        try:
            memory_render = render_graph_for_prompt(nodes, edges, speaker.id)
            system, user = build_character_turn_prompt(
                speaker, req.mode, directive, memory_render, transcript, req.responseLength or "medium", seated)
            turn = await call_gemini_json(client, model_name, system, user, CharacterTurnOutput, speaker.temperature)
            delta = sanitize_delta(turn.memory_delta)
            if turn.stance_score is not None:
                stance_scores[speaker.id] = turn.stance_score
            yield {"event": "turn_complete", "data": {
                "speaker": speaker.id, "turnIndex": turns_taken,
                "innerThought": turn.inner_thought, "publicReply": turn.public_reply,
                "stanceScore": turn.stance_score, "memoryDelta": delta.model_dump(), "isFallback": False,
            }}
            transcript.append((speaker.name, turn.public_reply))
            consecutive_failures = 0
        except Exception as e:
            lines = speaker.offline_lines.get(req.mode) or ["..."]
            fallback_line = lines[spoken_counts[speaker.id] % len(lines)]
            yield {"event": "turn_error", "data": {
                "speaker": speaker.id, "turnIndex": turns_taken,
                "message": str(e)[:300], "fallbackReply": fallback_line, "isFallback": True,
            }}
            transcript.append((speaker.name, fallback_line))
            consecutive_failures += 1

        spoken_counts[speaker.id] += 1
        recent_speakers.append(speaker.id)
        turns_taken += 1

        if consecutive_failures >= 2:
            break

    # --- SYNTHESIS: close the round ---
    schema = PitchSynthesis if req.mode == "pitch" else BoardroomSynthesis
    try:
        system, user = build_synthesis_prompt(req.mode, seated, transcript, stance_scores)
        synthesis = await call_gemini_json(client, model_name, system, user, schema, SYNTHESIS_TEMPERATURE)
        synthesis_data = {"kind": req.mode, **synthesis.model_dump()}
    except Exception:
        synthesis_data = _naive_synthesis(req.mode, seated, stance_scores)

    yield {"event": "round_synthesis", "data": synthesis_data}
    yield {"event": "round_end", "data": {"turnsTaken": turns_taken}}


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

    await asyncio.sleep(0.35)
    yield {"event": "round_synthesis", "data": _naive_synthesis(req.mode, seated, stance_scores)}
    yield {"event": "round_end", "data": {"turnsTaken": len(seated)}}
