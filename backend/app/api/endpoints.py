# ==============================================================================
# API ENDPOINTS (api/endpoints.py)
# ==============================================================================
# This file is the "Controller". It receives the raw HTTP request from the internet,
# decides what to do with it, calls the appropriate services, and returns a JSON response.

import ipaddress
import json
import os
import re
import socket
from urllib.parse import urlparse

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

# ==============================================================================
# REQUEST HARDENING
# ==============================================================================

# Self-hosting with a local gateway (Ollama, LM Studio…)? Set
# ALLOW_PRIVATE_RELAY_URLS=true in backend/.env to permit relay URLs that
# resolve to private/loopback addresses. Off by default: on a shared server a
# private relay target is an SSRF hole, not a feature.
# Read lazily (not at import time): this module is imported before load_dotenv()
# runs in main.py, so a module-level constant would never see the .env value.
def allow_private_relay_urls() -> bool:
    return os.getenv("ALLOW_PRIVATE_RELAY_URLS", "").lower() in ("1", "true", "yes")

# Payload ceilings — prompts are bounded server-side no matter what a client sends.
MAX_TEXT_CHARS = 8000
MAX_HISTORY_ITEMS = 100
MAX_GRAPH_NODES = 200
MAX_GRAPH_EDGES = 400


def validate_relay_url(raw_url: str | None) -> str | None:
    """Normalize and vet a user-supplied provider base URL. The server will POST
    to this address, so it must never be a path into our own network."""
    url = (raw_url or "").strip()
    if not url:
        return None
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Relay base URL must be a plain http(s) URL.")
    if parsed.username or parsed.password:
        raise HTTPException(status_code=400, detail="Relay base URL must not embed credentials.")
    if not allow_private_relay_urls():
        try:
            resolved = {info[4][0] for info in socket.getaddrinfo(parsed.hostname, None)}
        except socket.gaierror:
            raise HTTPException(status_code=400, detail="Relay host could not be resolved.")
        for address in resolved:
            ip = ipaddress.ip_address(address.split("%")[0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
                raise HTTPException(
                    status_code=400,
                    detail="Relay URLs that resolve to private/internal addresses are blocked. "
                           "Self-hosting with a local gateway? Set ALLOW_PRIVATE_RELAY_URLS=true in backend/.env.",
                )
    return url


def server_default_provider() -> tuple[str, str, str] | None:
    """Operator-configured default relay for deployments: visitors who bring no
    key/provider of their own chat through this instead of the server's Gemini
    key. Set DEFAULT_PROVIDER_BASE_URL + DEFAULT_PROVIDER_MODEL (and usually
    DEFAULT_PROVIDER_API_KEY) in the server's environment. The URL is operator
    trust — it never mixes with client-supplied keys or URLs."""
    url = (os.getenv("DEFAULT_PROVIDER_BASE_URL") or "").strip().rstrip("/")
    model = (os.getenv("DEFAULT_PROVIDER_MODEL") or "").strip()
    if not url or not model:
        return None
    return url, os.getenv("DEFAULT_PROVIDER_API_KEY") or "", model


def server_gemini_available() -> bool:
    """Is a usable server-side Gemini key configured (not a placeholder)?"""
    key = os.getenv("GEMINI_API_KEY") or ""
    return bool(key) and "MY_" not in key


def apply_server_default(provider_base_url: str | None, api_key: str, model_name: str,
                         custom_api_key: str | None, power_source: str | None = None) -> tuple[str | None, str, str]:
    """Decide whose provider serves this request.

    powerSource is the visitor's EXPLICIT pick from the Configuration menu:
      - "house"          -> the operator's relay, ALWAYS on the env model
                            (the model is the operator's business, never the visitor's)
      - "server_gemini"  -> Google on the operator's GEMINI_API_KEY; the visitor
                            only picks a Gemini model (client URL/key ignored)
      - None (legacy)    -> implicit priority: client relay > client Google key >
                            default relay > server Gemini key > offline fallback.
    Server-side keys (Gemini AND default-relay) are never sent to a client-chosen URL."""
    default = server_default_provider()
    if power_source == "house":
        if not default:
            raise HTTPException(status_code=400, detail="This server has no host-provided relay configured.")
        return default
    if power_source == "server_gemini":
        if not server_gemini_available():
            raise HTTPException(status_code=400, detail="This server has no host-provided Gemini key configured.")
        return None, os.getenv("GEMINI_API_KEY") or "", model_name
    if provider_base_url or (custom_api_key or "").strip():
        return provider_base_url, api_key, model_name
    if default:
        return default
    return provider_base_url, api_key, model_name


@router.get("/config")
async def public_config():
    """Non-secret runtime config for the frontend: which host-funded power
    sources exist so visitors can pick one. The relay's URL, key AND model are
    never exposed — the model is the operator's business."""
    return {
        "defaultProvider": {
            "active": server_default_provider() is not None,
            "label": (os.getenv("DEFAULT_PROVIDER_LABEL") or "").strip() or "Host's relay (free)",
        },
        "serverGemini": {"active": server_gemini_available()},
    }


def resolve_api_key(custom_api_key: str | None, provider_base_url: str | None) -> str:
    """BYO provider means BYO key: the server's own GEMINI_API_KEY must NEVER be
    sent as a bearer token to a user-chosen URL — that would let any client
    exfiltrate it with one request."""
    if provider_base_url:
        return custom_api_key or ""
    return custom_api_key or os.getenv("GEMINI_API_KEY") or ""


def enforce_size_limits(text: str, history: list) -> None:
    if len(text) > MAX_TEXT_CHARS:
        raise HTTPException(status_code=413, detail=f"Message too long (max {MAX_TEXT_CHARS} characters).")
    if len(history) > MAX_HISTORY_ITEMS:
        raise HTTPException(status_code=413, detail=f"History too long (max {MAX_HISTORY_ITEMS} messages).")
    for msg in history:
        if len(msg.text) > MAX_TEXT_CHARS:
            raise HTTPException(status_code=413, detail="A history message exceeds the size limit.")

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

    enforce_size_limits(text_content, req.history)

    # 2. Figure out the API Key and (optional) custom relay.
    # BYO relay is BYO key — the server's key never leaves for a user-chosen URL.
    provider_base_url = validate_relay_url(req.providerBaseUrl)
    api_key = resolve_api_key(req.customApiKey, provider_base_url)
    model_name = req.selectedModel or "gemini-3.5-flash"

    # Deployed default: clients who brought nothing chat on the operator's relay.
    provider_base_url, api_key, model_name = apply_server_default(
        provider_base_url, api_key, model_name, req.customApiKey, req.powerSource)

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
        raise HTTPException(status_code=500, detail=f"Disturbance in the Force: {str(e)[:300]}")


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
    enforce_size_limits(req.text, req.history)
    for participant in req.participants:
        if len(participant.memory.nodes) > MAX_GRAPH_NODES or len(participant.memory.edges) > MAX_GRAPH_EDGES:
            raise HTTPException(status_code=413, detail=f"{participant.characterId}'s memory graph exceeds the size limit.")

    provider_base_url = validate_relay_url(req.providerBaseUrl)
    api_key = resolve_api_key(req.customApiKey, provider_base_url)
    model_name = req.selectedModel or "gemini-3.5-flash"
    # Deployed default: clients who brought nothing sit at the operator's relay.
    provider_base_url, api_key, model_name = apply_server_default(
        provider_base_url, api_key, model_name, req.customApiKey, req.powerSource)
    is_default_key_unconfigured = not provider_base_url and (api_key == "" or api_key == "MY_GEMINI_API_KEY" or "MY_" in api_key)
    if not provider_base_url and not is_plausible_google_model(model_name):
        model_name = "gemini-2.5-flash"
    # The orchestrator reads the relay URL off the request — reflect the
    # validated/defaulted value there so all its callers use the same one.
    req.providerBaseUrl = provider_base_url

    # Optional separate moderator/Adjudicator brain — same SSRF + key-exfiltration
    # rules as the main provider. Active only when a moderator model is named.
    moderator = None
    moderator_model = (req.moderatorModel or "").strip()
    if moderator_model:
        moderator_base_url = validate_relay_url(req.moderatorProviderBaseUrl)
        if not moderator_base_url and not is_plausible_google_model(moderator_model):
            moderator_model = "gemini-3.1-flash-lite"
        moderator_key = resolve_api_key(req.moderatorApiKey, moderator_base_url)
        moderator = (moderator_base_url, moderator_key, moderator_model)

    # 3. Pick the pipeline: a direct @name reply, an admin-planned exchange, or the keyless scripted demo.
    is_offline = is_default_key_unconfigured and not req.customApiKey
    if req.targetCharacterId:
        generator = run_offline_direct_reply(req) if is_offline else run_direct_reply(req, api_key, model_name, moderator)
    elif is_offline:
        generator = run_offline_roundtable(req)
    else:
        generator = run_admin_roundtable(req, api_key, model_name, moderator)

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
