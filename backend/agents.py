"""One PydanticAI agent per AI avatar professor, called through Portkey.

Every avatar shares the same course-lookup tools, so any professor can answer
questions about other classes. Chat history is kept in memory per session so a
conversation can continue; it resets when the server restarts.
"""

from __future__ import annotations

import os
from collections import OrderedDict
from pathlib import Path

os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

from dotenv import load_dotenv  # noqa: E402
from openai import AsyncOpenAI  # noqa: E402
from pydantic_ai import Agent  # noqa: E402
from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart  # noqa: E402
from pydantic_ai.models.openai import OpenAIResponsesModel  # noqa: E402
from pydantic_ai.providers.openai import OpenAIProvider  # noqa: E402
from pydantic_ai.usage import UsageLimits  # noqa: E402

import courses  # noqa: E402
from professors import AVATARS, build_instructions  # noqa: E402

# .env may live in backend/, the game folder, or one or two folders up
HERE = Path(__file__).resolve().parent
for folder in (HERE, HERE.parent, HERE.parent.parent, HERE.parent.parent.parent):
    load_dotenv(folder / ".env")

MODEL_NAME = os.getenv("OPENAI_MODEL", "").strip() or "gpt-6-luna"
PORTKEY_BASE_URL = os.getenv("PORTKEY_BASE_URL", "https://api.portkey.ai/v1").rstrip("/")
MAX_TURNS_KEPT = 20  # messages of history sent back to the model per session
MAX_SESSIONS = 500


# ---------- tools (shared by every professor)

def search_courses(query: str) -> list[dict]:
    """Search the Yale SOM course catalog by keywords: topic, course number, title, professor, or category.

    Returns the best-matching courses with their professors, meeting times, rooms, and a short description.

    Args:
        query: Keywords, e.g. "regression", "MGT 403", "negotiation", "Zaman", "Finance".
    """
    return courses.search(query)


def get_course_details(course_number: str) -> dict | str:
    """Full details for one course number: description, every section's time and room, and professor bios.

    Args:
        course_number: Course number like "MGT 409" or "MGT 403".
    """
    return courses.course(course_number) or f"No course numbered {course_number!r} in the catalog."


def find_professor_courses(professor_name: str) -> list[dict] | str:
    """List the courses a professor teaches, with sections, times and rooms.

    Args:
        professor_name: The professor's name; a last name is enough, e.g. "Zaman".
    """
    return courses.by_professor(professor_name) or f"No courses found for {professor_name!r}."


def catalog_overview() -> dict:
    """Totals for the whole catalog: number of courses, sections, professors, and courses per category (Core, Finance, ...)."""
    return courses.overview()


TOOLS = [search_courses, get_course_details, find_professor_courses, catalog_overview]


# ---------- agents

def _model() -> OpenAIResponsesModel:
    api_key = os.getenv("PORTKEY_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("PORTKEY_API_KEY is not set (put it in a .env file).")
    client = AsyncOpenAI(api_key=api_key, base_url=PORTKEY_BASE_URL, default_headers={"x-portkey-api-key": api_key})
    return OpenAIResponsesModel(MODEL_NAME, provider=OpenAIProvider(openai_client=client))


_agents: dict[str, Agent[None, str]] = {}
_history: OrderedDict[tuple[str, str], list[ModelMessage]] = OrderedDict()


def get_agent(avatar_id: str) -> Agent[None, str]:
    if avatar_id not in _agents:
        _agents[avatar_id] = Agent(_model(), instructions=build_instructions(avatar_id), tools=TOOLS)
    return _agents[avatar_id]


async def chat(avatar_id: str, session_id: str, message: str) -> dict:
    if avatar_id not in AVATARS:
        raise KeyError(avatar_id)
    key = (avatar_id, session_id)
    history = _history.get(key, [])
    result = await get_agent(avatar_id).run(
        message, message_history=history, usage_limits=UsageLimits(request_limit=8)
    )
    _history[key] = result.all_messages()[-MAX_TURNS_KEPT:]
    _history.move_to_end(key)
    while len(_history) > MAX_SESSIONS:
        _history.popitem(last=False)
    tools_used = []
    for m in result.new_messages():
        if isinstance(m, ModelResponse):
            for p in m.parts:
                if isinstance(p, ToolCallPart) and p.tool_name not in tools_used:
                    tools_used.append(p.tool_name)
    return {"reply": result.output, "tools_used": tools_used}
