import re
import sqlite3

from agents import SQLiteSession

from app.core.config import Settings


def _safe_session_id(project_id: str, thread_id: str) -> str:
    raw = f"{project_id}:{thread_id}"
    return re.sub(r"[^a-zA-Z0-9_.:-]", "_", raw)


def get_thread_session_id(project_id: str, thread_id: str) -> str:
    return _safe_session_id(project_id, thread_id)


def get_project_session_prefix(project_id: str) -> str:
    return _safe_session_id(project_id, "")


def get_thread_session(settings: Settings, project_id: str, thread_id: str) -> SQLiteSession:
    return SQLiteSession(
        session_id=get_thread_session_id(project_id, thread_id),
        db_path=settings.memory_db_path,
    )


async def clear_thread_session(settings: Settings, project_id: str, thread_id: str) -> None:
    session = get_thread_session(settings, project_id, thread_id)
    await session.clear_session()
    session.close()


def clear_project_sessions(settings: Settings, project_id: str) -> int:
    db_path = settings.memory_db_path
    if not db_path.exists():
        return 0

    prefix = get_project_session_prefix(project_id)
    with sqlite3.connect(db_path) as connection:
        rows = connection.execute("SELECT session_id FROM agent_sessions").fetchall()
        session_ids = [row[0] for row in rows if row[0].startswith(prefix)]
        if not session_ids:
            return 0

        placeholders = ",".join("?" for _ in session_ids)
        connection.execute(
            f"DELETE FROM agent_messages WHERE session_id IN ({placeholders})",
            session_ids,
        )
        connection.execute(
            f"DELETE FROM agent_sessions WHERE session_id IN ({placeholders})",
            session_ids,
        )
        connection.commit()
        return len(session_ids)
