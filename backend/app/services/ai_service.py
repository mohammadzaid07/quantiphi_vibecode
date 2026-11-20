import asyncio
from typing import AsyncIterator
from openai import AsyncOpenAI
from app.config import AI_MODE, OPENAI_API_KEY, OPENAI_MODEL, TONE_INSTRUCTIONS

def _mock_answer(message: str, tone: str) -> str:
    # Local development fallback. This is deliberately not presented as an AI-generated answer.
    prefix = {
        "professional": "Development mode response",
        "casual": "Hey! This is a development mode response",
        "concise": "Development mode",
    }.get(tone, "Development mode response")
    return (
        f"{prefix} (mock): I received your message: “{message}”\n\n"
        "The chat interface, streaming transport, tone selection, and MongoDB persistence "
        "are being tested. To receive real model-generated answers, set AI_MODE=openai "
        "and configure an OpenAI API key with available API billing in backend/.env."
    )

async def stream_answer(message: str, tone: str) -> AsyncIterator[str]:
    if AI_MODE == "mock":
        answer = _mock_answer(message, tone)
        # Simulate a progressive stream for local UI testing.
        for token in answer.split(" "):
            yield token + " "
            await asyncio.sleep(0.025)
        return

    if AI_MODE != "openai":
        raise RuntimeError("AI_MODE must be either 'mock' or 'openai'.")
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is missing in backend/.env.")

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    try:
        stream = await client.responses.create(
            model=OPENAI_MODEL,
            instructions=TONE_INSTRUCTIONS[tone],
            input=message,
            stream=True,
        )
        async for event in stream:
            if event.type == "response.output_text.delta":
                if event.delta:
                    yield event.delta
    finally:
        await client.close()

async def generate_answer(message: str, tone: str) -> str:
    chunks = []
    async for chunk in stream_answer(message, tone):
        chunks.append(chunk)
    return "".join(chunks).strip()
