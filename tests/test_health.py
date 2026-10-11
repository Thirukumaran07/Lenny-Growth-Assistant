"""Automated tests for health, readiness, and configuration validation."""

import pytest
from httpx import AsyncClient

from backend.app.config import Settings


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    """Verify root endpoint returns app info and status."""
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "The Lenny Growth Assistant"
    assert data["status"] == "online"
    assert data["health_endpoint"] == "/api/health"
    assert data["readiness_endpoint"] == "/api/ready"


@pytest.mark.asyncio
async def test_health_liveness(async_client: AsyncClient):
    """Verify /health returns 200 with expected application metadata."""
    response = await async_client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "The Lenny Growth Assistant"
    assert data["version"] == "1.0.0"
    assert data["active_provider"] in ["local_ollama", "cloud"]


@pytest.mark.asyncio
async def test_readiness_probe_structure(async_client: AsyncClient):
    """Verify /ready probe returns truthful structure for all dependencies."""
    response = await async_client.get("/api/ready")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "dependencies" in data
    assert "database" in data["dependencies"]
    assert "ollama" in data["dependencies"]
    assert "cloud_provider" in data["dependencies"]


def test_settings_validation():
    """Verify configuration loads with default values and validates inputs."""
    settings = Settings()
    assert settings.APP_NAME == "The Lenny Growth Assistant"
    assert settings.OLLAMA_GENERATION_MODEL == "llama3.2:3b"
    assert settings.OLLAMA_EMBEDDING_MODEL == "nomic-embed-text"
    assert settings.DATABASE_URL.startswith("postgresql+asyncpg://")

    # Validate cloud readiness check when no keys are provided
    is_ready, msg = settings.is_cloud_ready()
    assert not is_ready
    assert "OPENAI_API_KEY" in msg
