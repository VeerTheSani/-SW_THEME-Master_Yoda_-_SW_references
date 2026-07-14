# ==============================================================================
# API ENDPOINTS (api/endpoints.py)
# ==============================================================================
# This file is the "Controller". It receives the raw HTTP request from the internet,
# decides what to do with it, calls the appropriate services, and returns a JSON response.

import json
import os
import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

# Import our custom schemas and services from the other files in our app.
from app.models.schemas import GenerationRequest
from app.models.roundtable_schemas import RoundtableRequest
from app.services.prompts import get_system_instruction, generate_offline_response
from app.services.llm_service import call_gemini, call_openai_compatible
from app.services.characters import CHARACTERS
from app.services.orchestrator import (
    run_admin_roundtable,
    run_direct_reply,
    run_offline_direct_reply,
    run_offline_roundtable,
)
from app.services.roundtable_prompts import MODE_SPECS

# Create a "Router". A router is like a mini FastAPI app. We group routes here
# and attach them to the main app later.
router = APIRouter()

# The @ symbol is a "Decorator". It tells FastAPI:
# "Hey, attach the function below to the URL '/yoda/generate' via a POST request."
@router.post("/yoda/generate")
# 'async def' means this function is asynchronous (it can pause and wait for things like network calls).
# 'req: GenerationRequest' means the incoming JSON MUST match our GenerationRequest schema.
async def generate_response(req: GenerationRequest):
    
    # 1. Clean the incoming text
    text_content = req.text.strip()
    
    # If the text is empty, stop and return a 400 Bad Request error.
    if not text_content:
        raise HTTPException(status_code=400, detail="Empty thoughts, you have. Provide text, you must.")

    # 2. Figure out the API Key
    # It tries to use the custom key from the frontend first.
    # If none, it looks at the hidden environment variable (os.getenv).
    api_key = req.customApiKey or os.getenv("GEMINI_API_KEY") or ""
    provider_base_url = (req.providerBaseUrl or "").strip() or None

    # Check if the key is empty or just the default placeholder from the .env file.
    # Irrelevant once a custom provider is set — that's an explicit BYO-everything choice.
    is_default_key_unconfigured = not provider_base_url and (api_key == "" or api_key == "MY_GEMINI_API_KEY" or "MY_" in api_key)

    # 3. Offline Fallback Check
    # If we have no API key and no custom provider, skip Google entirely and generate a hardcoded offline reply.
    if is_default_key_unconfigured and not req.customApiKey:
        fallback = generate_offline_response(text_content, req.mode, req.character, req.isUnhinged)
        return {
            "reply": fallback,
            "isFallback": True,
            "fallbackReason": "KEY_UNCONFIGURED"
        }

    # 4. Resolve the Model Name
    model_name = req.selectedModel or "gemini-3.5-flash"

    if provider_base_url:
        # A custom provider's model catalog is arbitrary (e.g. "google/gemini-2.5-flash"
        # on OpenRouter) — the Gemini-specific validation below doesn't apply.
        pass
    else:
        # Any real Gemini/Gemma id is allowed (new models ship constantly — a
        # hardcoded list rots, e.g. the retired 1.5 line). Junk input is forced
        # back to a safe default; a bad-but-plausible id just 404s harmlessly.
        if not is_plausible_google_model(model_name):
            model_name = "gemini-2.5-flash"

    # 5. Build the System Instruction (the prompt)
    system_instruction = get_system_instruction(
        character=req.character,
        mode=req.mode,
        is_unhinged=req.isUnhinged,
        ragebait_level=req.ragebaitLevel,
        response_length=req.responseLength
    )

    # 6. Try to call Google Gemini!
    # A try/except block is used for Error Handling. If anything inside the 'try'
    # block crashes, the program doesn't die. Instead, it jumps to the 'except' block.
    try:
        # Calculate temperature (chaos level)
        temperature = 0.95 if req.isUnhinged else (req.ragebaitLevel if req.ragebaitLevel is not None else 0.8)
        
        # Ask our LLM service to do the heavy lifting — Gemini directly, or
        # whatever OpenAI-compatible provider the user pointed us at.
        if provider_base_url:
            reply = call_openai_compatible(
                base_url=provider_base_url,
                api_key=api_key,
                model_name=model_name,
                system_instruction=system_instruction,
                temperature=temperature,
                history=req.history,
                text_content=text_content
            )
        else:
            reply = call_gemini(
                api_key=api_key,
                model_name=model_name,
                system_instruction=system_instruction,
                temperature=temperature,
                history=req.history,
                text_content=text_content
            )
        
        # If successful, return the final data back to the React frontend!
        # FastAPI automatically converts this Python dictionary into a JSON response.
        return {
            "reply": reply,
            "isFallback": False,
            "actualModelUsed": model_name,
            "modelFallbackOccurred": False
        }

    except Exception as e:
        # If the API call fails (e.g. rate limit, or no internet)...
        err_msg = str(e).lower()
        
        # Check if the error is just a Quota / Limit issue
        if "quota" in err_msg or "rate limit" in err_msg or "exhausted" in err_msg:
            # Fall back to offline response gracefully
            fallback = generate_offline_response(text_content, req.mode, req.character, req.isUnhinged)
            return {
                "reply": fallback,
                "isFallback": True,
                "fallbackReason": "QUOTA_EXCEEDED"
            }
        
        # If it's a critical, unknown error, raise a 500 Internal Server Error.
        raise HTTPException(status_code=500, detail=f"Disturbance in the Force: {str(e)}")


# ==============================================================================
# THE ROUNDTABLE — multi-character table, streamed as NDJSON events
# ==============================================================================

def is_plausible_google_model(model_name: str) -> bool:
    """Any real Gemini/Gemma id passes — hardcoded lists rot as models ship
    and retire. This only rejects junk/injection-shaped input; a plausible but
    nonexistent id simply gets a 404 from Google and falls back gracefully."""
    return bool(re.fullmatch(r"(gemini|gemma)-[a-z0-9.\-]{1,60}", model_name or ""))


@router.post("/roundtable/generate")
async def roundtable_generate(req: RoundtableRequest):
    # 1. Validate the round setup.
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty thoughts, you have. Provide text, you must.")
    if req.mode not in MODE_SPECS:
        raise HTTPException(status_code=400, detail=f"Unknown table mode: {req.mode}")
    seated_ids = [p.characterId for p in req.participants]
    if len(seated_ids) != 3 or len(set(seated_ids)) != 3:
        raise HTTPException(status_code=400, detail="Exactly 3 distinct characters must be seated at the table.")
    unknown = [cid for cid in seated_ids if cid not in CHARACTERS]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown characters: {', '.join(unknown)}")
    if req.targetCharacterId and req.targetCharacterId not in seated_ids:
        raise HTTPException(status_code=400, detail=f"@{req.targetCharacterId} is not seated at this table.")

    # 2. Resolve key + model the same way /yoda/generate does.
    api_key = req.customApiKey or os.getenv("GEMINI_API_KEY") or ""
    provider_base_url = (req.providerBaseUrl or "").strip() or None
    is_default_key_unconfigured = not provider_base_url and (api_key == "" or api_key == "MY_GEMINI_API_KEY" or "MY_" in api_key)
    model_name = req.selectedModel or "gemini-3.5-flash"
    if not provider_base_url and not is_plausible_google_model(model_name):
        model_name = "gemini-2.5-flash"

    # 3. Pick the pipeline: a direct @name reply, an admin-planned exchange, or the keyless scripted demo.
    is_offline = is_default_key_unconfigured and not req.customApiKey
    if req.targetCharacterId:
        generator = run_offline_direct_reply(req) if is_offline else run_direct_reply(req, api_key, model_name)
    elif is_offline:
        generator = run_offline_roundtable(req)
    else:
        generator = run_admin_roundtable(req, api_key, model_name)

    async def ndjson_stream():
        try:
            async for event in generator:
                yield json.dumps(event, ensure_ascii=False) + "\n"
        except Exception as e:  # catastrophic — surface it as a protocol event, not a dead socket
            yield json.dumps({"event": "error", "data": {"message": str(e)[:300], "recoverable": False}}) + "\n"

    return StreamingResponse(
        ndjson_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
