
import json

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.schemas.agent import (
    AgentRequest,
    AgentResponse,
    HealthResponse,
    LocalConfigRequest,
    LocalConfigResponse,
    LocalShutdownResponse,
    SessionClearResponse,
)
from app.schemas.markdown import OrganizeMarkdownRequest, OrganizeMarkdownResponse
from app.schemas.mineru import MinerUParseResponse
from app.services.agent_runner import run_paper_agent, run_paper_agent_stream
from app.services.local_config import read_local_config, update_local_config
from app.services.local_shutdown import collect_local_service_pids, shutdown_local_services_after_response
from app.services.markdown_organizer import (
    MarkdownOrganizeError,
    organize_markdown_sections,
)
from app.services.mineru_parser import MinerUOptions, MinerUParseError, parse_pdf_with_mineru
from app.services.session_service import clear_agent_project_sessions, clear_agent_thread_session


settings = get_settings()

app = FastAPI(title="CCFA Paper Agent Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def reload_settings():
    global settings
    get_settings.cache_clear()
    settings = get_settings()
    return settings


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", model=settings.deepseek_model, provider="deepseek")


@app.get("/api/local-config", response_model=LocalConfigResponse)
async def get_local_config() -> LocalConfigResponse:
    return read_local_config(settings)


@app.post("/api/local-config", response_model=LocalConfigResponse)
async def save_local_config(request: LocalConfigRequest) -> LocalConfigResponse:
    response = update_local_config(request)
    reload_settings()
    return response


@app.post("/api/local-shutdown", response_model=LocalShutdownResponse)
async def shutdown_local_services(background_tasks: BackgroundTasks) -> LocalShutdownResponse:
    backend_pids, frontend_pids = collect_local_service_pids()
    background_tasks.add_task(
        shutdown_local_services_after_response,
        backend_pids,
        frontend_pids,
    )
    return LocalShutdownResponse(
        message="本地前后端服务正在关闭。",
        backendPids=backend_pids,
        frontendPids=frontend_pids,
    )


@app.post("/api/agent/chat", response_model=AgentResponse)
async def chat(request: AgentRequest) -> AgentResponse:
    return await run_paper_agent(request, settings)


@app.post("/api/mineru/parse-pdf", response_model=MinerUParseResponse)
async def parse_pdf(
    file: UploadFile = File(...),
    language: str = Form("en"),
    page_range: str = Form(""),
    enable_table: bool = Form(True),
    is_ocr: bool = Form(False),
    enable_formula: bool = Form(True),
) -> MinerUParseResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files can be parsed by this endpoint.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded PDF is empty.")
    if len(file_bytes) > settings.mineru_max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"PDF exceeds MinerU lightweight upload limit ({settings.mineru_max_upload_mb} MB).",
        )

    try:
        return await parse_pdf_with_mineru(
            file_name=file.filename,
            file_bytes=file_bytes,
            options=MinerUOptions(
                language=language.strip() or "en",
                page_range=page_range.strip() or None,
                enable_table=enable_table,
                is_ocr=is_ocr,
                enable_formula=enable_formula,
            ),
            settings=settings,
        )
    except MinerUParseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/markdown/organize-sections", response_model=OrganizeMarkdownResponse)
async def organize_markdown_sections_endpoint(
    request: OrganizeMarkdownRequest,
) -> OrganizeMarkdownResponse:
    try:
        return await organize_markdown_sections(request, settings)
    except MarkdownOrganizeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/agent/chat/stream")
async def chat_stream(request: AgentRequest) -> StreamingResponse:
    async def event_generator():
        async for event in run_paper_agent_stream(request, settings):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.delete(
    "/api/agent/sessions/{project_id}/threads/{thread_id}",
    response_model=SessionClearResponse,
)
async def clear_thread_session(project_id: str, thread_id: str) -> SessionClearResponse:
    return await clear_agent_thread_session(settings, project_id, thread_id)


@app.delete("/api/agent/sessions/{project_id}", response_model=SessionClearResponse)
async def clear_project_sessions(project_id: str) -> SessionClearResponse:
    return await clear_agent_project_sessions(settings, project_id)
