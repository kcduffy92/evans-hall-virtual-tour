"""Yale SOM Virtual — AI avatar professor backend.

Run from the game folder:
    backend/.venv/Scripts/python -m uvicorn main:app --app-dir backend --port 8000
API docs: http://127.0.0.1:8000/docs   (the Vite dev server proxies /api here)
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import agents
import courses
from professors import AVATARS, public_info

log = logging.getLogger("uvicorn.error")

app = FastAPI(title="Yale SOM Virtual — AI avatars", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    professor: str
    message: str = Field(min_length=1, max_length=2000)
    session_id: str = Field(default="default", max_length=100)


class ChatResponse(BaseModel):
    reply: str
    tools_used: list[str] = Field(default_factory=list)


@app.get("/api/health")
def health():
    return {"ok": True, "model": agents.MODEL_NAME, "courses": courses.overview()["courses"]}


@app.get("/api/professors")
def professors():
    return [public_info(a) for a in AVATARS]


@app.post("/api/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    if body.professor not in AVATARS:
        raise HTTPException(404, f"No AI avatar called {body.professor!r}.")
    try:
        return await agents.chat(body.professor, body.session_id, body.message.strip())
    except Exception as exc:  # model/network problems: tell the player, log the details
        log.exception("chat failed")
        raise HTTPException(502, f"The avatar couldn't answer right now ({type(exc).__name__}).") from exc
