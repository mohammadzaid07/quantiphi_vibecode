import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pymongo import DESCENDING

from app.database import get_collection
from app.schemas import ChatRequest
from app.services.ai_service import stream_answer, generate_answer

router = APIRouter(prefix="/api", tags=["Chat"])

def utcnow():
    return datetime.now(timezone.utc)

def sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"

def load_conversation(conversation_id: str):
    conversation = get_collection().find_one(
        {"conversation_id": conversation_id}, {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation

@router.get("/health")
def health():
    try:
        get_collection().database.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}")

@router.get("/conversations")
def list_conversations():
    docs = get_collection().find(
        {}, {"_id": 0, "conversation_id": 1, "title": 1, "tone": 1, "updated_at": 1}
    ).sort("updated_at", DESCENDING).limit(100)
    return list(docs)

@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str):
    return load_conversation(conversation_id)

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str):
    result = get_collection().delete_one({"conversation_id": conversation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"deleted": True}

async def stream_chat(request: ChatRequest, regenerate: bool = False):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    collection = get_collection()
    conversation_id = request.conversation_id or str(uuid.uuid4())
    now = utcnow()
    conversation = collection.find_one({"conversation_id": conversation_id})

    if conversation is None:
        if regenerate:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conversation = {
            "conversation_id": conversation_id,
            "title": message[:60],
            "tone": request.tone,
            "messages": [],
            "created_at": now,
            "updated_at": now,
        }
        collection.insert_one(conversation)

    if regenerate:
        messages = conversation.get("messages", [])
        if not messages or messages[-1].get("role") != "assistant":
            raise HTTPException(status_code=400, detail="No assistant response to regenerate")
        # Remove last assistant response; regenerate from the preceding user prompt.
        collection.update_one(
            {"conversation_id": conversation_id},
            {"$pop": {"messages": 1}, "$set": {"updated_at": now, "tone": request.tone}},
        )
        conversation = collection.find_one({"conversation_id": conversation_id})
        messages = conversation.get("messages", [])
        if not messages or messages[-1].get("role") != "user":
            raise HTTPException(status_code=400, detail="Last user message not found")
        message = messages[-1]["content"]
    else:
        collection.update_one(
            {"conversation_id": conversation_id},
            {
                "$push": {"messages": {"role": "user", "content": message, "timestamp": now}},
                "$set": {"tone": request.tone, "updated_at": now},
            },
        )

    async def event_generator():
        yield sse({"type": "start", "conversation_id": conversation_id})
        answer_parts = []
        try:
            async for chunk in stream_answer(message, request.tone):
                answer_parts.append(chunk)
                yield sse({"type": "token", "content": chunk})
            answer = "".join(answer_parts).strip()
            collection.update_one(
                {"conversation_id": conversation_id},
                {
                    "$push": {"messages": {
                        "role": "assistant", "content": answer, "timestamp": utcnow()
                    }},
                    "$set": {"tone": request.tone, "updated_at": utcnow()},
                },
            )
            yield sse({"type": "done"})
        except Exception as exc:
            yield sse({"type": "error", "message": str(exc)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    return await stream_chat(request)

@router.post("/conversations/{conversation_id}/regenerate")
async def regenerate_response(conversation_id: str, request: ChatRequest):
    request.conversation_id = conversation_id
    return await stream_chat(request, regenerate=True)
