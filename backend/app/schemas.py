from typing import Literal, Optional
from pydantic import BaseModel, Field

Tone = Literal["professional", "casual", "concise"]

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    conversation_id: Optional[str] = None
    tone: Tone = "professional"

class ConversationSummary(BaseModel):
    conversation_id: str
    title: str
    tone: Tone
