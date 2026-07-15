# ==============================================================================
# ROUNDTABLE PROMPTS (services/roundtable_prompts.py)
# ==============================================================================
# Prompt builders for the three roundtable agents: the master admin (which 1-3
# characters answer the user, and whether to close the round), the character
# turns (hidden thought + public reply + memory delta) and the round synthesis
# (boardroom decision / pitch verdict).

from typing import Dict, List, Tuple

from app.services.characters import CharacterSpec

MODE_SPECS: Dict[str, Dict[str, str]] = {
    "boardroom": {
        "label": "Boardroom",
        "scene": (
            "SCENE: A corporate boardroom. The user has brought a decision, plan or problem to the board. "
            "The seated executives debate it from their own portfolios, defend their turf, rebut each other by name, "
            "and drive toward a concrete board decision with action items."
        ),
        "router_goal": (
            "Direct a sharp executive debate: prioritize direct rebuttals and conflicts of interest over polite monologues. "
            "When positions are clear and clash has happened, end the round so the board can rule."
        ),
        "turn_goal": (
            "Speak as yourself in the meeting. Take a position on the user's matter from YOUR portfolio, "
            "engage the previous speakers by name (agree, rebut, undercut), and move the debate forward. "
            "Set stance_score to your current agreement with the user's proposal from -1 (kill it) to 1 (full support)."
        ),
        "synthesis_goal": (
            "You are the board secretary. From the transcript, write the board's decision (majority position), the rationale, "
            "concrete action items each assigned to a characterId or 'user', and note any dissent by name."
        ),
    },
    "pitch": {
        "label": "Pitch Room",
        "scene": (
            "SCENE: A venture capital pitch room. The user is a founder pitching the seated investors. "
            "The panel grills the pitch — market, numbers, execution, founder quality — each from their own investing style, "
            "reacting to each other's questions and scores."
        ),
        "router_goal": (
            "Direct a VC panel grilling: let each judge attack the pitch from their angle, encourage them to challenge "
            "each other's assessments, then end the round once every judge has staked out a score."
        ),
        "turn_goal": (
            "Speak as yourself on the panel. Grill or praise the founder's pitch from YOUR investing style, react to the other "
            "judges' takes by name, and stake out your position. Set stance_score to your current score for this pitch from 0 to 10."
        ),
        "synthesis_goal": (
            "You are the panel's deal memo writer. From the transcript, produce the final verdict ('invest', 'pass' or "
            "'counteroffer'), a scorecard with each judge's characterId, final score (0-10) and their single biggest objection, "
            "and a two-sentence summary of the panel's reasoning."
        ),
    },
}

_LENGTH_RULES = {
    "short": "Keep public_reply to one punchy sentence (max 20 words).",
    "medium": "Keep public_reply to 2-3 sentences.",
    "long": "public_reply may run 4-6 sentences.",
}


def format_transcript(entries: List[Tuple[str, str]], limit: int = 18) -> str:
    lines = [f"{speaker}: {text}" for speaker, text in entries[-limit:]]
    return "\n".join(lines) if lines else "(no one has spoken yet)"


def roster_bios(seated: List[CharacterSpec], mode: str) -> str:
    role_attr = "boardroom_role" if mode == "boardroom" else "pitch_role"
    return "\n".join(
        f"- {spec.id} ({spec.name}, {spec.title}): {getattr(spec, role_attr)}"
        for spec in seated
    )


def build_admin_prompt(
    mode: str,
    seated: List[CharacterSpec],
    transcript: List[Tuple[str, str]],
    spoken_counts: Dict[str, int],
    allow_close: bool,
) -> Tuple[str, str]:
    """Returns (system_instruction, user_content) for the master-admin call.
    One decision per user message: which 1-3 characters answer, and whether the
    debate is ripe for a closing synthesis."""
    spec = MODE_SPECS[mode]
    close_rule = (
        "- Set close_round=true ONLY when positions have clashed and the matter is ripe for a final ruling "
        "(or the user explicitly asks for a verdict/decision)."
        if allow_close
        else "- The debate is too young to close: close_round MUST be false."
    )
    system = (
        f"You are the MASTER MODERATOR of a multi-character AI roundtable.\n{spec['scene']}\n\n"
        f"YOUR JOB: The user has just addressed the table. Decide which seated characters respond. {spec['router_goal']}\n\n"
        "RULES:\n"
        "- Pick 1 to 3 speakers from the seated characterIds — no duplicates, listed in speaking order.\n"
        "- ONE speaker when the message is narrow, personal, or clearly aimed at one portfolio; "
        "TWO or THREE when it deserves debate or several seats are implicated.\n"
        "- Favor speakers with the strongest reason to react (named directly, expertise, standing disagreement).\n"
        "- Each directive is ONE concrete stage direction naming who/what to react to.\n"
        f"{close_rule}"
    )
    spoken = ", ".join(f"{cid}: {count}x" for cid, count in spoken_counts.items())
    user = (
        f"SEATED CHARACTERS:\n{roster_bios(seated, mode)}\n\n"
        f"Times each has spoken so far: {spoken or '(no one yet)'}.\n\n"
        f"TRANSCRIPT:\n{format_transcript(transcript)}\n\n"
        "The USER spoke last. Decide who responds — produce your JSON decision."
    )
    return system, user


def build_character_turn_prompt(
    spec: CharacterSpec,
    mode: str,
    directive: str,
    memory_render: str,
    transcript: List[Tuple[str, str]],
    response_length: str,
    seated: List[CharacterSpec],
) -> Tuple[str, str]:
    """Returns (system_instruction, user_content) for a character's turn."""
    mode_spec = MODE_SPECS[mode]
    role = spec.boardroom_role if mode == "boardroom" else spec.pitch_role
    others = ", ".join(f"{s.name} ({s.id})" for s in seated if s.id != spec.id)
    length_rule = _LENGTH_RULES.get(response_length, _LENGTH_RULES["medium"])

    system = (
        f"{spec.voice}\n\n{mode_spec['scene']}\n\nYOUR ROLE THIS SESSION: {role}\n\n"
        f"ALSO AT THE TABLE: {others}.\n\n"
        f"{memory_render}\n\n"
        f"HOW TO SPEAK THIS TURN: {mode_spec['turn_goal']} {length_rule}\n\n"
        "MEMORY RULES (memory_delta): You own a private knowledge graph — record what YOU want to remember, in YOUR voice.\n"
        "- add_nodes: genuinely new concepts/projects/events/beliefs from this exchange (id like 'concept:kebab-slug'). Max 4.\n"
        "- update_nodes: shift your stance or rewrite your summary on things you already remember. Max 6.\n"
        "- add_edges/update_edges: connect ideas, or update how you relate to other characters "
        "(source 'char:" + spec.id + "', target 'char:<their id>', relations like believes/opposes/supports/distrusts/allied_with/proposed/lost_argument_to). Max 6.\n"
        "- Record OPINIONS and POSITIONS (yours and rivals'), not chit-chat. Empty lists are fine if nothing memorable happened.\n\n"
        "inner_thought is your HIDDEN strategy this turn — candid, in-character, never spoken aloud."
    )
    user = (
        f"TRANSCRIPT SO FAR:\n{format_transcript(transcript)}\n\n"
        f"MODERATOR'S DIRECTION TO YOU: {directive}\n\n"
        f"It is your turn to speak, {spec.name}. Respond with your JSON turn."
    )
    return system, user


def build_synthesis_prompt(
    mode: str,
    seated: List[CharacterSpec],
    transcript: List[Tuple[str, str]],
    stance_scores: Dict[str, float],
) -> Tuple[str, str]:
    """Returns (system_instruction, user_content) for the synthesis call."""
    mode_spec = MODE_SPECS[mode]
    system = f"{mode_spec['scene']}\n\n{mode_spec['synthesis_goal']}\nBe faithful to the transcript; do not invent positions."
    stances = ", ".join(f"{cid}: {score}" for cid, score in stance_scores.items()) or "(none reported)"
    user = (
        f"SEATED: {', '.join(s.id for s in seated)}\n"
        f"FINAL STANCE SCORES: {stances}\n\n"
        f"FULL TRANSCRIPT:\n{format_transcript(transcript, limit=60)}\n\n"
        "Produce the JSON synthesis now."
    )
    return system, user


def build_scorekeeper_prompt(
    mode: str,
    speaker: CharacterSpec,
    reply_text: str,
    transcript: List[Tuple[str, str]],
) -> Tuple[str, str]:
    """Returns (system_instruction, user_content) for the Adjudicator — an
    independent, merciless critic that grades ONE reply after it lands."""
    mode_spec = MODE_SPECS[mode]
    system = (
        f"You are THE ADJUDICATOR — an incorruptible, brutally honest critic observing this session.\n"
        f"{mode_spec['scene']}\n\n"
        "YOUR JOB: grade the LATEST reply on its actual substance, from -10 to +10.\n"
        "GRADING LAW:\n"
        "- Score the CONTENT: insight, specificity, relevance to the user's matter, intellectual courage.\n"
        "- Character flavor/voice is expected — never reward or punish style, only substance under it.\n"
        "- Be REALISTIC and TOUGH: an average remark earns -2..4. Reserve 7+ for genuinely sharp, "
        "concrete, advance-the-debate contributions. Never inflate.\n"
        "- Go NEGATIVE without hesitation: empty flattery, vague hedging, invented numbers, dodging the "
        "question, repeating what was already said, or pure noise all earn below 0.\n"
        "- The verdict is ONE specific sentence naming exactly what was weak or strong. No mercy, no filler."
    )
    user = (
        f"TRANSCRIPT (for context):\n{format_transcript(transcript)}\n\n"
        f"GRADE THIS REPLY by {speaker.name} ({speaker.id}):\n\"{reply_text}\"\n\n"
        "Produce your JSON score now."
    )
    return system, user
