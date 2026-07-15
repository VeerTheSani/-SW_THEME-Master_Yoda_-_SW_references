from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    id: str
    sender: str
    text: str

    class Config:
        extra = 'ignore'

class GenerationRequest(BaseModel):
    text: str
    mode: str = "roast"
    character: str = "yoda"
    isUnhinged: bool = False
    customApiKey: Optional[str] = None
    providerBaseUrl: Optional[str] = None  # BYO OpenAI-compatible endpoint (OpenRouter, etc.)
    selectedModel: Optional[str] = "gemini-3.5-flash"
    houseModel: Optional[str] = None  # visitor-typed model for the HOST's default relay (beats env default)
    history: List[ChatMessage] = []
    ragebaitLevel: Optional[float] = 0.5
    responseLength: Optional[str] = "medium"
    
    class Config:
        extra = 'ignore'
