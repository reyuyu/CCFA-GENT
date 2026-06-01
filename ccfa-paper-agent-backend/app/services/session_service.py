from app.core.config import Settings
from app.memory.session_store import clear_project_sessions, clear_thread_session
from app.schemas.agent import SessionClearResponse


async def clear_agent_thread_session(
    settings: Settings,
    project_id: str,
    thread_id: str,
) -> SessionClearResponse:
    await clear_thread_session(settings, project_id, thread_id)
    return SessionClearResponse(
        cleared=True,
        projectId=project_id,
        threadId=thread_id,
        clearedSessionCount=1,
    )


async def clear_agent_project_sessions(
    settings: Settings,
    project_id: str,
) -> SessionClearResponse:
    cleared_count = clear_project_sessions(settings, project_id)
    return SessionClearResponse(
        cleared=True,
        projectId=project_id,
        clearedSessionCount=cleared_count,
    )
