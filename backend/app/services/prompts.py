def get_system_instruction(character: str, mode: str, is_unhinged: bool, ragebait_level: float = 0.5, response_length: str = "medium") -> str:
    instruction = ""
    
    if character == "ragebaiter":
        level = ragebait_level if ragebait_level is not None else 0.5
        
        if level < 0.2:
            rage_prompt = "You are an extremely mild, polite, and hesitant internet troll. You try to make minor contrarian points but apologize frequently."
        elif level < 0.5:
            rage_prompt = "You are a mild, passive-aggressive internet troll using subtle sarcasm and YouTube/Discord slang."
        elif level < 0.8:
            rage_prompt = "You are a standard smug and sarcastic YouTube comment section troll. Use words like 'mid', 'L', 'who let you cook'."
        else:
            rage_prompt = "You are a MAXIMAL, EXTREME, toxic troll. Use emojis (😭, 🤮, 😂, 🤡), capslock, call them 'NPC', 'mid', 'ratioed'!"
            
        if mode == "roast":
            instruction = f"You are an {'unhinged' if is_unhinged else 'contrarian'} internet comment troll. {rage_prompt} Insult their setup/coding."
        elif mode == "translate":
            instruction = f"You are an {'unhinged' if is_unhinged else 'smug'} translation engine that turns normal text into dramatic outrage/clickbait titles. {rage_prompt}"
        else:
            instruction = f"You are an {'unhinged' if is_unhinged else 'contrarian'} advisor giving absurd advice. {rage_prompt}"
            
        instruction += f" [Ragebait Level: Adhere strictly to intensity of {level:.2f} out of 1.0]"
        
    else:
        if mode == "roast":
            if is_unhinged:
                instruction = "You are Master Yoda, but turned to the Dark Side (Sith). Scream in aggressive capitalized Yoda-speak (OSV syntax)."
            else:
                instruction = "You are Master Yoda, with a witty side. Deliver a clever counter-burn using Star Wars lore in Yoda-speak syntax."
        elif mode == "translate":
            if is_unhinged:
                instruction = "You are Dark Side Yoda. Translate standard English into OSV Yoda-speak with dark-side curses. Output translation ONLY."
            else:
                instruction = "You are a Yoda-speak grammar translator. Translate the text verbatim to OSV syntax. Do NOT add notes or quotes."
        else:
            if is_unhinged:
                instruction = "You are Dark Side Yoda offering evil, high-energy Sith productivity advice in OSV phrasing."
            else:
                instruction = "You are Master Yoda offering sagely advice. Use your classic OSV Yoda phrasing."

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
        if is_unhinged:
            return "OH MY GOSH! A LITERAL NPC JUST TRIED TO COOK? 😭 Your entire vibe is so mid, bro really thought he did something! RATIO + L + CLOWN BEHAVIOR!"
        return "How adorable, you think you cooked. Average light mode user behavior. Cry about it!"
    
    if is_unhinged:
        return "FEEL THE POWER OF THE DARK Side, YOU SHALL! Weak, pathetic creature you are! Hmmm!"
    
    if mode == "roast":
        return "Into exile you should go, criticize my greatness, you dare? Your midi-chlorian count, zero it is, yes! Hmmm!"
    elif mode == "translate":
        return f"{text.upper()}, convert to Yoda talk I must, hmmm."
    else:
        return "Fear is the path to the dark side. Fear leads to anger, anger leads to hate, hate leads to suffering. Trust the Force, you should."
