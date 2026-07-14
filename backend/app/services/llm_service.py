import asyncio
import json
from typing import Optional

import httpx
from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

# Providers whose own routes are checked for burst-limit style errors before
# giving up and retrying once. Covers Gemini's wording and OpenAI/OpenRouter's.
_RATE_LIMIT_MARKERS = ("429", "resource_exhausted", "quota", "rate limit", "rate_limit")


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
            if _attempt == 0 and any(marker in message for marker in _RATE_LIMIT_MARKERS):
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


# ==============================================================================
# BRING-YOUR-OWN-PROVIDER — any OpenAI-compatible endpoint (OpenRouter, a local
# gateway, etc). Same two call shapes as the Gemini functions above so the
# orchestrator and endpoints don't need to know which provider they're talking to.
# ==============================================================================

def _chat_messages(system_instruction: str, history: list, text_content: str) -> list:
    messages = [{"role": "system", "content": system_instruction}]
    for msg in history[-15:]:
        role = "user" if msg.sender == "user" else "assistant"
        messages.append({"role": role, "content": msg.text})
    messages.append({"role": "user", "content": text_content})
    return messages


def call_openai_compatible(
    base_url: str,
    api_key: str,
    model_name: str,
    system_instruction: str,
    temperature: float,
    history: list,
    text_content: str,
) -> str:
    """Sync single-shot chat completion against any OpenAI-compatible /chat/completions route."""
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    body = {
        "model": model_name,
        "messages": _chat_messages(system_instruction, history, text_content),
        "temperature": max(0.0, min(2.0, temperature)),
    }
    response = httpx.post(url, headers=headers, json=body, timeout=60.0)
    response.raise_for_status()
    data = response.json()
    text = data["choices"][0]["message"]["content"]
    return text.strip() if text else "Failed to generate transmission."


async def call_openai_compatible_json(
    base_url: str,
    api_key: str,
    model_name: str,
    system_instruction: str,
    user_content: str,
    response_schema: type[BaseModel],
    temperature: float = 0.9,
) -> BaseModel:
    """Async structured-output call against any OpenAI-compatible endpoint.
    Not every model behind a gateway honors response_format strictly, so the
    schema is also spelled out in the prompt and validated/repaired like call_gemini_json."""
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    schema_json = json.dumps(response_schema.model_json_schema())
    system_with_schema = (
        f"{system_instruction}\n\n"
        "Respond with ONLY a single valid JSON object — no markdown code fences, no commentary — "
        f"matching this JSON schema:\n{schema_json}"
    )
    body = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_with_schema},
            {"role": "user", "content": user_content},
        ],
        "temperature": max(0.0, min(2.0, temperature)),
        "response_format": {"type": "json_object"},
    }

    last_error: Exception | None = None
    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(2):  # one repair-retry on malformed/rate-limited output
            try:
                response = await client.post(url, headers=headers, json=body)
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                message = str(e).lower() + " " + e.response.text.lower()[:200]
                if attempt == 0 and any(marker in message for marker in _RATE_LIMIT_MARKERS):
                    await asyncio.sleep(20)
                    continue
                raise
            data = response.json()
            text = data["choices"][0]["message"]["content"] or ""
            try:
                return response_schema.model_validate_json(_strip_code_fences(text))
            except (ValidationError, json.JSONDecodeError, TypeError, KeyError) as e:
                last_error = e
    raise ValueError(f"Provider returned unparseable {response_schema.__name__}: {last_error}")


class Caller:
    """Uniform interface over a Gemini client or an OpenAI-compatible endpoint,
    so orchestration code calls .json(...) without caring which provider is live."""

    def __init__(self, model_name: str, *, gemini_client: Optional[genai.Client] = None,
                 base_url: Optional[str] = None, api_key: Optional[str] = None):
        self.model_name = model_name
        self.gemini_client = gemini_client
        self.base_url = base_url
        self.api_key = api_key

    async def json(self, system_instruction: str, user_content: str, response_schema: type[BaseModel], temperature: float = 0.9) -> BaseModel:
        if self.gemini_client is not None:
            return await call_gemini_json(self.gemini_client, self.model_name, system_instruction, user_content, response_schema, temperature)
        return await call_openai_compatible_json(self.base_url, self.api_key, self.model_name, system_instruction, user_content, response_schema, temperature)


def make_caller(api_key: str, model_name: str, base_url: Optional[str] = None) -> Caller:
    base_url = (base_url or "").strip() or None
    if base_url:
        return Caller(model_name, base_url=base_url, api_key=api_key)
    return Caller(model_name, gemini_client=genai.Client(api_key=api_key))
