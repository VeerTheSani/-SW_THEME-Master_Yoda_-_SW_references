import asyncio
import json

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError


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


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1:]
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
    return text.strip()


async def call_gemini_json(
    client: genai.Client,
    model_name: str,
    system_instruction: str,
    contents,  # str or list[types.Content] — the SDK accepts both
    response_schema: type[BaseModel],
    temperature: float = 0.9,
) -> BaseModel:
    """Async structured-output call. The caller creates ONE genai.Client per
    round and reuses it across every router/turn/synthesis call."""
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=max(0.0, min(2.0, temperature)),
        response_mime_type="application/json",
        response_schema=response_schema,
    )

    last_error: Exception | None = None
    for _attempt in range(2):  # one repair-retry on malformed output
        try:
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
        except Exception as e:
            # Free-tier keys burst-limit easily (RPM); one patient retry keeps
            # the round live instead of dropping to canned fallback lines.
            message = str(e).lower()
            if _attempt == 0 and ("429" in message or "resource_exhausted" in message or "quota" in message or "rate limit" in message):
                await asyncio.sleep(20)
                continue
            raise
        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, response_schema):
            return parsed
        try:
            return response_schema.model_validate_json(_strip_code_fences(response.text or ""))
        except (ValidationError, json.JSONDecodeError, TypeError) as e:
            last_error = e
    raise ValueError(f"Model returned unparseable {response_schema.__name__}: {last_error}")
