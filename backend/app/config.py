import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
DATABASE_NAME = os.getenv("DATABASE_NAME", "quantiphi_chat")
AI_MODE = os.getenv("AI_MODE", "mock").lower().strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").strip()

TONE_INSTRUCTIONS = {
    "professional": "Respond professionally, clearly, and accurately. Use a helpful and respectful tone.",
    "casual": "Respond in a friendly, natural, and conversational manner. Keep the language approachable.",
    "concise": "Respond briefly and directly. Prioritize essential information and avoid unnecessary detail.",
}
