from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env", encoding="utf-8-sig")


class Settings(BaseSettings):
    deepseek_api_key: str = Field(default="", alias="DEEPSEEK_API_KEY")
    deepseek_base_url: str = Field(default="https://api.deepseek.com", alias="DEEPSEEK_BASE_URL")
    deepseek_model: str = Field(default="deepseek-v4-pro", alias="DEEPSEEK_MODEL")
    agent_memory_db_path: str = Field(
        default="data/agent_sessions.sqlite3",
        alias="AGENT_MEMORY_DB_PATH",
    )
    agent_allow_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        alias="AGENT_ALLOW_ORIGINS",
    )
    disable_tracing: bool = Field(default=True, alias="OPENAI_AGENTS_DISABLE_TRACING")
    mineru_agent_base_url: str = Field(
        default="https://mineru.net/api/v1/agent",
        alias="MINERU_AGENT_BASE_URL",
    )
    mineru_precision_base_url: str = Field(
        default="https://mineru.net/api/v4",
        alias="MINERU_PRECISION_BASE_URL",
    )
    mineru_api_token: str = Field(default="", alias="MINERU_API_TOKEN")
    mineru_parse_mode: str = Field(default="precision", alias="MINERU_PARSE_MODE")
    mineru_precision_model: str = Field(default="pipeline", alias="MINERU_PRECISION_MODEL")
    mineru_max_upload_mb: int = Field(default=200, alias="MINERU_MAX_UPLOAD_MB")
    mineru_parse_timeout_seconds: int = Field(default=300, alias="MINERU_PARSE_TIMEOUT_SECONDS")
    mineru_poll_interval_seconds: float = Field(default=3.0, alias="MINERU_POLL_INTERVAL_SECONDS")
    mineru_request_timeout_seconds: float = Field(default=60.0, alias="MINERU_REQUEST_TIMEOUT_SECONDS")
    semantic_scholar_api_key: str = Field(default="", alias="SEMANTIC_SCHOLAR_API_KEY")
    semantic_scholar_base_url: str = Field(
        default="https://api.semanticscholar.org/graph/v1",
        alias="SEMANTIC_SCHOLAR_BASE_URL",
    )
    semantic_scholar_request_timeout_seconds: float = Field(
        default=30,
        alias="SEMANTIC_SCHOLAR_REQUEST_TIMEOUT_SECONDS",
    )
    markdown_section_organize_max_chars: int = Field(
        default=220000,
        alias="MARKDOWN_SECTION_ORGANIZE_MAX_CHARS",
    )
    markdown_section_organize_preview_chars: int = Field(
        default=700,
        alias="MARKDOWN_SECTION_ORGANIZE_PREVIEW_CHARS",
    )
    markdown_section_organize_batch_size: int = Field(
        default=35,
        alias="MARKDOWN_SECTION_ORGANIZE_BATCH_SIZE",
    )
    markdown_section_organize_max_tokens: int = Field(
        default=4096,
        alias="MARKDOWN_SECTION_ORGANIZE_MAX_TOKENS",
    )

    model_config = SettingsConfigDict(extra="ignore", populate_by_name=True)

    @property
    def allow_origins(self) -> list[str]:
        configured_origins = [
            origin.strip() for origin in self.agent_allow_origins.split(",") if origin.strip()
        ]
        local_dev_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://[::1]:5173",
        ]
        return list(dict.fromkeys([*configured_origins, *local_dev_origins]))

    @property
    def memory_db_path(self) -> Path:
        path = Path(self.agent_memory_db_path)
        if not path.is_absolute():
            path = ROOT_DIR / path
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def mineru_max_upload_bytes(self) -> int:
        return self.mineru_max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
