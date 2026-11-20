from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import FRONTEND_ORIGIN
from app.database import get_database, close_database
from app.routes.chat import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail fast if MongoDB is misconfigured or unreachable.
    get_database()
    yield
    close_database()

app = FastAPI(
    title="Quantiphi AI Chat Assistant",
    description="Streaming AI chat with MongoDB conversation history and tone controls.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {"name": "Quantiphi AI Chat Assistant", "status": "running", "docs": "/docs"}
