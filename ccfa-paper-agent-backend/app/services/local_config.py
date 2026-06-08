from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

from app.core.config import ROOT_DIR, Settings
from app.schemas.agent import LocalConfigRequest, LocalConfigResponse


ENV_PATH = ROOT_DIR / ".env"

CONFIG_KEY_MAP = {
    "deepseekApiKey": "DEEPSEEK_API_KEY",
    "deepseekBaseUrl": "DEEPSEEK_BASE_URL",
    "deepseekModel": "DEEPSEEK_MODEL",
    "semanticScholarApiKey": "SEMANTIC_SCHOLAR_API_KEY",
    "semanticScholarBaseUrl": "SEMANTIC_SCHOLAR_BASE_URL",
    "mineruApiToken": "MINERU_API_TOKEN",
    "mineruParseMode": "MINERU_PARSE_MODE",
}

SECRET_FIELDS = {"deepseekApiKey", "semanticScholarApiKey", "mineruApiToken"}


def _read_env(path: Path = ENV_PATH) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def _write_env(values: dict[str, str], path: Path = ENV_PATH) -> None:
    preferred_order = [
        "DEEPSEEK_API_KEY",
        "DEEPSEEK_BASE_URL",
        "DEEPSEEK_MODEL",
        "AGENT_MEMORY_DB_PATH",
        "AGENT_ALLOW_ORIGINS",
        "OPENAI_AGENTS_DISABLE_TRACING",
        "MINERU_PARSE_MODE",
        "MINERU_API_TOKEN",
        "MINERU_PRECISION_MODEL",
        "MINERU_MAX_UPLOAD_MB",
        "MARKDOWN_SECTION_ORGANIZE_MAX_CHARS",
        "MARKDOWN_SECTION_ORGANIZE_PREVIEW_CHARS",
        "MARKDOWN_SECTION_ORGANIZE_BATCH_SIZE",
        "MARKDOWN_SECTION_ORGANIZE_MAX_TOKENS",
        "SEMANTIC_SCHOLAR_API_KEY",
        "SEMANTIC_SCHOLAR_BASE_URL",
        "SEMANTIC_SCHOLAR_REQUEST_TIMEOUT_SECONDS",
    ]
    ordered_keys = [key for key in preferred_order if key in values]
    ordered_keys.extend(key for key in values if key not in preferred_order)
    content = "\n".join(f"{key}={values[key]}" for key in ordered_keys) + "\n"
    path.write_text(content, encoding="utf-8")


def ensure_local_env_file() -> None:
    if ENV_PATH.exists():
        return
    example_path = ROOT_DIR / ".env.example"
    if example_path.exists():
        ENV_PATH.write_text(example_path.read_text(encoding="utf-8-sig"), encoding="utf-8")
        return
    ENV_PATH.write_text(
        "\n".join(
            [
                "DEEPSEEK_API_KEY=",
                "DEEPSEEK_BASE_URL=https://api.deepseek.com",
                "DEEPSEEK_MODEL=deepseek-v4-flash",
                "AGENT_MEMORY_DB_PATH=data/agent_sessions.sqlite3",
                "AGENT_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173",
                "OPENAI_AGENTS_DISABLE_TRACING=1",
                "MINERU_PARSE_MODE=precision",
                "MINERU_API_TOKEN=",
                "SEMANTIC_SCHOLAR_API_KEY=",
                "SEMANTIC_SCHOLAR_BASE_URL=https://api.semanticscholar.org/graph/v1",
                "SEMANTIC_SCHOLAR_REQUEST_TIMEOUT_SECONDS=30",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def _response_from_settings(settings: Settings, saved: bool = True) -> LocalConfigResponse:
    return LocalConfigResponse(
        saved=saved,
        envPath=str(ENV_PATH),
        deepseekApiKeyConfigured=bool(settings.deepseek_api_key.strip()),
        deepseekBaseUrl=settings.deepseek_base_url,
        deepseekModel=settings.deepseek_model,
        semanticScholarApiKeyConfigured=bool(settings.semantic_scholar_api_key.strip()),
        semanticScholarBaseUrl=settings.semantic_scholar_base_url,
        mineruApiTokenConfigured=bool(settings.mineru_api_token.strip()),
        mineruParseMode=settings.mineru_parse_mode,
    )


def read_local_config(settings: Settings) -> LocalConfigResponse:
    ensure_local_env_file()
    load_dotenv(ENV_PATH, encoding="utf-8-sig", override=True)
    return _response_from_settings(Settings(), saved=True)


def update_local_config(request: LocalConfigRequest) -> LocalConfigResponse:
    ensure_local_env_file()
    values = _read_env()
    update_payload = request.model_dump(exclude_unset=True)
    for field_name, env_key in CONFIG_KEY_MAP.items():
        if field_name not in update_payload:
            continue
        raw_value = update_payload[field_name]
        if raw_value is None:
            continue
        value = str(raw_value).strip()
        if field_name in SECRET_FIELDS and not value:
            continue
        values[env_key] = value
    _write_env(values)
    load_dotenv(ENV_PATH, encoding="utf-8-sig", override=True)
    return _response_from_settings(Settings(), saved=True)
