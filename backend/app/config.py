"""Application configuration and validation for The Lenny Growth Assistant."""

from functools import lru_cache
from typing import Literal
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime application settings loaded from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core Application Settings
    APP_NAME: str = "The Lenny Growth Assistant"
    APP_VERSION: str = "1.0.0"
    APP_ENV: Literal["development", "production", "test"] = "development"
    APP_DEBUG: bool = True
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Database Persistence
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://apple:@localhost:5432/lenny_growth",
        description="Async PostgreSQL connection string",
    )
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 2

    # Local LLM (Ollama)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_GENERATION_MODEL: str = "llama3.2:3b"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"
    OLLAMA_TIMEOUT_SECONDS: float = 60.0

    # Active LLM Provider
    ACTIVE_LLM_PROVIDER: Literal["local_ollama", "cloud"] = "local_ollama"

    # Cloud Provider Settings
    CLOUD_PROVIDER_TYPE: Literal["openai", "anthropic"] = "openai"
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: str | None = None
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"

    # RAG Retrieval Configuration
    SIMILARITY_THRESHOLD: float = 0.65
    TOP_K_CHUNKS: int = 4
    CHUNK_SIZE_TOKENS: int = 600
    CHUNK_OVERLAP_TOKENS: int = 100

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v:
            raise ValueError("DATABASE_URL must not be empty.")
        # Ensure asyncpg dialect is present if standard postgresql:// is provided
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    def is_cloud_ready(self) -> tuple[bool, str]:
        """Check if cloud provider credentials are configured and valid."""
        if self.CLOUD_PROVIDER_TYPE == "openai":
            if not self.OPENAI_API_KEY or not self.OPENAI_API_KEY.strip():
                return False, "OPENAI_API_KEY is not configured in environment."
            return True, "OpenAI configured."
        elif self.CLOUD_PROVIDER_TYPE == "anthropic":
            if not self.ANTHROPIC_API_KEY or not self.ANTHROPIC_API_KEY.strip():
                return False, "ANTHROPIC_API_KEY is not configured in environment."
            return True, "Anthropic configured."
        return False, f"Unknown cloud provider: {self.CLOUD_PROVIDER_TYPE}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
