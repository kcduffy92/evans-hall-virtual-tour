"""Read-only access to the course catalog in data/yale_som.db (SQLite, table "courses").

Faculty emails are never returned. Each function returns plain dicts so the
agent tools can hand them straight to the model.
"""

from __future__ import annotations

import functools
import re
import sqlite3
from collections import Counter
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "yale_som.db"

# columns the avatars may see (no emails)
FIELDS = (
    "course_number", "section", "course_title", "course_category", "course_type",
    "course_session", "course_description", "faculty_1", "faculty_bio",
    "daytimes", "room", "units",
)


@functools.lru_cache(maxsize=1)
def all_rows() -> tuple[dict, ...]:
    con = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    rows = con.execute(f"SELECT {', '.join(FIELDS)} FROM courses ORDER BY id").fetchall()
    con.close()
    return tuple({k: (row[k] or "").strip() for k in FIELDS} for row in rows)


def _clip(text: str, limit: int) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _norm_number(s: str) -> str:
    return re.sub(r"\s+", " ", s.upper().strip())


def _group(rows: list[dict], desc_chars: int, bio_chars: int = 0) -> list[dict]:
    """Collapse sections of the same course into one entry with a list of meetings."""
    out: dict[tuple[str, str], dict] = {}
    for r in rows:
        key = (r["course_number"], r["course_title"])
        if key not in out:
            out[key] = {
                "number": r["course_number"],
                "title": r["course_title"],
                "category": r["course_category"],
                "session": r["course_session"],
                "units": r["units"],
                "professors": [],
                "sections": [],
                "description": _clip(r["course_description"], desc_chars),
            }
            if bio_chars:
                out[key]["professor_bios"] = {}
        c = out[key]
        if r["faculty_1"] and r["faculty_1"] not in c["professors"]:
            c["professors"].append(r["faculty_1"])
            if bio_chars and r["faculty_bio"]:
                c["professor_bios"][r["faculty_1"]] = _clip(r["faculty_bio"], bio_chars)
        c["sections"].append(
            {"section": r["section"], "when": r["daytimes"] or "TBA", "room": r["room"] or "TBA", "session": r["course_session"]}
        )
    return list(out.values())


def search(query: str, limit: int = 8) -> list[dict]:
    """Keyword search over number, title, professor, category and description, best matches first."""
    words = [w for w in re.findall(r"[a-z0-9]+", query.lower()) if len(w) > 1]
    if not words:
        return []
    scored = []
    for r in all_rows():
        head = f"{r['course_number']} {r['course_title']} {r['faculty_1']} {r['course_category']}".lower()
        body = r["course_description"].lower()
        score = sum(3 * head.count(w) + min(body.count(w), 3) for w in words)
        if score:
            scored.append((score, r))
    scored.sort(key=lambda x: -x[0])
    return _group([r for _, r in scored], desc_chars=280)[:limit]


def course(number: str) -> dict | None:
    """Everything about one course number (all sections), including professor bios."""
    want = _norm_number(number)
    rows = [r for r in all_rows() if _norm_number(r["course_number"]) == want]
    if not rows:
        return None
    return _group(rows, desc_chars=1500, bio_chars=600)[0]


def by_professor(name: str) -> list[dict]:
    """Courses taught by anyone whose name matches (last name is enough)."""
    parts = [p for p in re.findall(r"[a-z]+", name.lower()) if p not in {"prof", "professor", "dr"}]
    rows = [r for r in all_rows() if parts and all(p in r["faculty_1"].lower() for p in parts)]
    return _group(rows, desc_chars=200)


def overview() -> dict:
    """Catalog totals: courses, sections, professors, and courses per category."""
    rows = all_rows()
    distinct = {(r["course_number"], r["course_title"]): r for r in rows}
    return {
        "sections": len(rows),
        "courses": len(distinct),
        "professors": len({r["faculty_1"] for r in rows if r["faculty_1"]}),
        "courses_by_category": dict(Counter(r["course_category"] for r in distinct.values()).most_common()),
    }
