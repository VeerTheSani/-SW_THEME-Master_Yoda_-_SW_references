from google import genai
from google.genai import types

def call_gemini(api_key: str, model_name: str, system_instruction: str, temperature: float, history: list, text_content: str) -> str:
    client = genai.Client(api_key=api_key)
    
    contents = []
    
    for msg in history[-15:]:
        role = "user" if msg.sender == "user" else "model"
        contents.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg.text)]
            )
        )
        
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=text_content)]
        )
    )

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=max(0.0, min(2.0, temperature))
    )
    
    response = client.models.generate_content(
        model=model_name,
        contents=contents,
        config=config
    )
    
    return response.text.strip() if response.text else "Failed to generate transmission."
