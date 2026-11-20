# Quantiphi AI Chat Assistant

A full-stack AI chat application built with React, FastAPI, MongoDB Atlas, and OpenAI-compatible streaming.

## Features

- Chat interface with user/assistant message bubbles
- Real streaming responses using Server-Sent Events (SSE)
- Development mock mode when API credits are unavailable
- MongoDB conversation persistence and history sidebar
- Professional, Casual, and Concise tone controls
- New conversation, regenerate last response, export Markdown
- API health endpoint and interactive Swagger docs

## Stack

- Frontend: React + Vite
- Backend: Python + FastAPI
- Database: MongoDB Atlas (PyMongo)
- AI: OpenAI Responses API (streaming)

## Requirements

- Python 3.10+
- Node.js 18+
- MongoDB Atlas connection string (or local MongoDB)
- OpenAI API key and available API billing for live AI mode

## 1. Backend setup

Open a terminal in `backend`:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env`:

```env
MONGODB_URI=mongodb+srv://...
DATABASE_NAME=quantiphi_chat
AI_MODE=mock
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
FRONTEND_ORIGIN=http://localhost:5173
```

- Keep `AI_MODE=mock` to use the local development responder without API charges.
- Set `AI_MODE=openai` and provide a funded API key to enable real OpenAI streaming.
- Do not commit `.env`.

Start the backend:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend: http://localhost:8000  
Swagger: http://localhost:8000/docs

## 2. Frontend setup

Open a second terminal in `frontend`:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Frontend: http://localhost:5173

## 3. API endpoints

- `GET /api/health`
- `GET /api/conversations`
- `GET /api/conversations/{conversation_id}`
- `DELETE /api/conversations/{conversation_id}`
- `POST /api/chat/stream` (SSE)
- `POST /api/conversations/{conversation_id}/regenerate` (SSE)

## 4. MongoDB

The backend creates the `conversations` collection and indexes automatically. A database/collection appears in Atlas after the first conversation is saved.

The MongoDB database user needs read/write access. Add your current IP under Atlas Network Access. For hosted deployment, configure the server's outbound IP appropriately.

## 5. Security notes

- Never put OpenAI or MongoDB credentials in frontend files.
- Never commit `backend/.env`.
- Do not expose MongoDB credentials in screenshots or logs.
- The default CORS origin is localhost:5173; change it for deployment.

## 6. GitHub submission

From the project root:

```powershell
git status
git add .
git commit -m "Build AI chat assistant"
git push
```

Check that `.env` is not staged before pushing.
