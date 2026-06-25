import os
from fastapi import APIRouter, HTTPException

from app.models.schemas import GenerationRequest
from app.services.prompts import get_system_instruction, generate_offline_response
from app.services.llm_service import call_gemini

router = APIRouter()

@router.post("/yoda/generate")
async def generate_response(req: GenerationRequest):
    text_content = req.text.strip()
    if not text_content:
        raise HTTPException(status_code=400, detail="Empty thoughts, you have. Provide text, you must.")

    api_key = req.customApiKey or os.getenv("GEMINI_API_KEY") or ""
    is_default_key_unconfigured = api_key == "" or api_key == "MY_GEMINI_API_KEY" or "MY_" in api_key

    if is_default_key_unconfigured and not req.customApiKey:
        fallback = generate_offline_response(text_content, req.mode, req.character, req.isUnhinged)
        return {
            "reply": fallback,
            "isFallback": True,
            "fallbackReason": "KEY_UNCONFIGURED"
        }

    model_name = req.selectedModel or "gemini-3.5-flash"
    
    allowed_models = [
        "gemini-2.5-flash", "gemini-2.5-pro",
        "gemini-1.5-flash", "gemini-1.5-pro",
        "gemini-3.5-flash", "gemma-2-27b-it",
        "gemma-2-9b-it", "gemma-2-2b-it"
    ]
    if model_name not in allowed_models:
        model_name = "gemini-3.5-flash"

    system_instruction = get_system_instruction(
        character=req.character,
        mode=req.mode,
        is_unhinged=req.isUnhinged,
        ragebait_level=req.ragebaitLevel,
        response_length=req.responseLength
    )

    try:
        temperature = 0.95 if req.isUnhinged else (req.ragebaitLevel if req.ragebaitLevel is not None else 0.8)
        
        reply = call_gemini(
            api_key=api_key,
            model_name=model_name,
            system_instruction=system_instruction,
            temperature=temperature,
            history=req.history,
            text_content=text_content
        )
        
        return {
            "reply": reply,
            "isFallback": False,
            "actualModelUsed": model_name,
            "modelFallbackOccurred": False
        }

    except Exception as e:
        err_msg = str(e).lower()
        
        if "quota" in err_msg or "rate limit" in err_msg or "exhausted" in err_msg:
            fallback = generate_offline_response(text_content, req.mode, req.character, req.isUnhinged)
            return {
                "reply": fallback,
                "isFallback": True,
                "fallbackReason": "QUOTA_EXCEEDED"
            }
        
        raise HTTPException(status_code=500, detail=f"Disturbance in the Force: {str(e)}")
