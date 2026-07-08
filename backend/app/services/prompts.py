# ==============================================================================
# SINGLE-CHAT PROMPTS (services/prompts.py)
# ==============================================================================
# Prompt builder for the original one-character chat (/api/yoda/generate).
# Persona strings live in the character registry (services/characters.py);
# this module only composes them. Output is byte-identical to the
# pre-registry version of this file.

from app.services.characters import get_character, rage_prompt_for


def _mode_key(mode: str) -> str:
    return mode if mode in ("roast", "translate") else "advice"


def get_system_instruction(character: str, mode: str, is_unhinged: bool, ragebait_level: float = 0.5, response_length: str = "medium") -> str:
    mode_key = _mode_key(mode)

    if character == "ragebaiter":
        spec = get_character("ragebaiter").single_chat
        level = ragebait_level if ragebait_level is not None else 0.5
        instruction = spec[mode_key].format(
            tone=spec["tones"][mode_key][is_unhinged],
            rage_prompt=rage_prompt_for(level),
        )
        instruction += f" [Ragebait Level: Adhere strictly to intensity of {level:.2f} out of 1.0]"
    else:
        spec = get_character("yoda").single_chat
        instruction = spec[mode_key][is_unhinged]

    if response_length == "short":
        instruction += " Keep response extremely short (max 15 words)."
    elif response_length == "medium":
        instruction += " Deliver exactly 2 to 3 standard sentences."
    elif response_length == "long":
        instruction += " Provide a short paragraph of 4 to 6 sentences."
    else:
        instruction += " Keep response concise (maximum 2-4 sentences)."

    return instruction


def generate_offline_response(text: str, mode: str, character: str, is_unhinged: bool) -> str:
    if character == "ragebaiter":
        offline = get_character("ragebaiter").single_chat["offline"]
        return offline["unhinged"] if is_unhinged else offline["default"]

    offline = get_character("yoda").single_chat["offline"]
    if is_unhinged:
        return offline["unhinged"]
    if mode == "roast":
        return offline["roast"]
    if mode == "translate":
        return offline["translate"].format(text_upper=text.upper())
    return offline["advice"]
