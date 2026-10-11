"""Error handling, edge cases, timeout, resilience, and outage tests for Phase 10:
- Unavailable models
- Missing cloud credentials
- Provider connection drops and timeouts
- Database outage simulation and graceful HTTP handling
- Request validation errors and payload constraints
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.exc import OperationalError

from backend.app.config import Settings
from backend.app.providers.base import (
    AuthenticationError,
    ChatMessage,
    GenerationConfig,
    ModelNotFoundError,
    ProviderConnectionError,
    ProviderTimeoutError,
    ProviderType,
)
from backend.app.providers.manager import ProviderManager
from backend.app.providers.ollama import OllamaProvider
from backend.app.providers.cloud_openai import OpenAICloudProvider
from tests.conftest import MockLLMProvider


# ─── 1. Provider & Credential Failure Scenarios ──────────────────────────────

@pytest.mark.asyncio
async def test_unavailable_model_raises_model_not_found():
    """Verify requesting a non-installed model raises ModelNotFoundError."""
    provider = MockLLMProvider(should_fail_model=True)
    messages = [ChatMessage(role="user", content="Hello")]

    with pytest.raises(ModelNotFoundError) as exc:
        await provider.generate_completion(messages)
    assert "Mock model not found" in str(exc.value)


@pytest.mark.asyncio
async def test_provider_connection_drop_raises_connection_error():
    """Verify daemon network unreachable raises ProviderConnectionError."""
    provider = MockLLMProvider(should_fail_connection=True)
    messages = [ChatMessage(role="user", content="Hello")]

    with pytest.raises(ProviderConnectionError) as exc:
        await provider.generate_completion(messages)
    assert "Cannot connect to mock daemon" in str(exc.value)


@pytest.mark.asyncio
async def test_provider_timeout_raises_timeout_error():
    """Verify long-running inference exceeding deadline raises ProviderTimeoutError."""
    provider = MockLLMProvider(should_timeout=True)
    messages = [ChatMessage(role="user", content="Heavy query")]

    with pytest.raises(ProviderTimeoutError) as exc:
        await provider.generate_completion(messages)
    assert "Mock timeout exceeded" in str(exc.value)


def test_missing_cloud_credentials_guardrail():
    """Verify that switching to cloud provider without API key is strictly blocked."""
    manager = ProviderManager()
    assert manager.get_active_provider_type() == ProviderType.LOCAL_OLLAMA

    # Cloud switch without key raises AuthenticationError
    with pytest.raises(AuthenticationError) as exc:
        manager.switch_provider(ProviderType.CLOUD_OPENAI)
    assert "OPENAI_API_KEY is not configured" in str(exc.value)


# ─── 2. Request Validation & Malformed Payload Tests ─────────────────────────

@pytest.mark.asyncio
async def test_chat_stream_rejects_empty_prompt(async_client: AsyncClient):
    """Verify POST /api/chat/stream rejects empty string prompts with 422."""
    res = await async_client.post(
        "/api/chat/stream",
        json={"session_id": str(uuid.uuid4()), "prompt": ""},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_chat_stream_rejects_oversized_prompt(async_client: AsyncClient):
    """Verify POST /api/chat/stream rejects prompt exceeding 4,000 character limit with 422."""
    huge_prompt = "A" * 4001
    res = await async_client.post(
        "/api/chat/stream",
        json={"session_id": str(uuid.uuid4()), "prompt": huge_prompt},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_chat_stream_nonexistent_session_yields_error_event(async_client: AsyncClient):
    """Verify streaming to non-existent session yields structured error event rather than 500 crash."""
    non_existent = str(uuid.uuid4())
    res = await async_client.post(
        "/api/chat/stream",
        json={"session_id": non_existent, "prompt": "Hello"},
    )
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]
    text = res.text
    assert "event: error" in text
    assert "not found" in text.lower()


@pytest.mark.asyncio
async def test_session_rename_rejects_empty_title(async_client: AsyncClient):
    """Verify PATCH /api/sessions/{id} rejects empty whitespace-only title."""
    # Create session first
    create_res = await async_client.post("/api/sessions", json={"title": "Valid Title"})
    sess_id = create_res.json()["id"]

    try:
        rename_res = await async_client.patch(
            f"/api/sessions/{sess_id}",
            json={"title": "   "},
        )
        assert rename_res.status_code == 400
        assert "empty" in rename_res.json()["detail"].lower()
    finally:
        await async_client.delete(f"/api/sessions/{sess_id}")


@pytest.mark.asyncio
async def test_nonexistent_session_get_returns_404(async_client: AsyncClient):
    """Verify GET /api/sessions/{id} returns 404 for invalid UUID."""
    res = await async_client.get(f"/api/sessions/{uuid.uuid4()}")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_artifact_unsupported_type_returns_422(async_client: AsyncClient):
    """Verify POST /api/artifacts rejects unsupported MIME / artifact types with 422."""
    create_sess = await async_client.post("/api/sessions", json={"title": "Test"})
    sess_id = create_sess.json()["id"]

    try:
        res = await async_client.post(
            "/api/artifacts",
            json={
                "session_id": sess_id,
                "title": "Bad Script",
                "artifact_type": "binary_executable",
                "content": "0xDEADBEEF",
            },
        )
        assert res.status_code == 422
    finally:
        await async_client.delete(f"/api/sessions/{sess_id}")


# ─── 3. Database Outage & Readiness Degradation Simulation ───────────────────

@pytest.mark.asyncio
async def test_readiness_probe_detects_unconfigured_cloud(async_client: AsyncClient):
    """Verify /api/ready accurately marks cloud provider unready when API key is missing."""
    res = await async_client.get("/api/ready")
    assert res.status_code in [200, 503]
    data = res.json()
    assert data["dependencies"]["cloud_provider"]["is_ready"] is False
    assert "OPENAI_API_KEY" in data["dependencies"]["cloud_provider"]["message"]


@pytest.mark.asyncio
async def test_database_operational_error_handled_gracefully():
    """Verify application global exception handler catches database errors without process crash."""
    from backend.app.main import create_app
    from fastapi.testclient import TestClient
    from unittest.mock import patch

    app = create_app()
    client = TestClient(app, raise_server_exceptions=False)

    # Simulate database outage during session retrieval
    with patch(
        "backend.app.services.session_service.SessionService.list_sessions",
        side_effect=OperationalError("Connection refused to postgresql server", params=None, orig=Exception("Down")),
    ):
        response = client.get("/api/sessions")
        assert response.status_code == 500
        data = response.json()
        assert data["error"] == "InternalServerError"


@pytest.mark.asyncio
async def test_request_correlation_id_middleware(async_client: AsyncClient):
    """Verify CorrelationIdMiddleware generates or propagates request and session IDs."""
    # 1. Without client request ID - must generate one
    res1 = await async_client.get("/api/health")
    assert res1.status_code == 200
    assert "x-request-id" in res1.headers
    assert len(res1.headers["x-request-id"]) > 0

    # 2. With client-provided request ID - must propagate exactly
    custom_req_id = "custom-uuid-test-999"
    custom_sess_id = "session-correlation-123"
    res2 = await async_client.get(
        "/api/health",
        headers={
            "X-Request-ID": custom_req_id,
            "X-Session-ID": custom_sess_id,
        },
    )
    assert res2.status_code == 200
    assert res2.headers["x-request-id"] == custom_req_id
    assert res2.headers["x-session-id"] == custom_sess_id


def test_logging_censors_sensitive_keys():
    """Verify structured logger censor processor scrubs secrets and masks prompt texts."""
    from backend.app.logging_config import censor_sensitive_keys

    prompt_text = "What did Lenny say about PMF benchmarks for Superhuman?"
    event_dict = {
        "event": "test_event",
        "openai_api_key": "sk-proj-supersecret12345",
        "authorization": "Bearer secret_jwt_token",
        "user_prompt": prompt_text,
        "safe_param": "operational",
    }

    sanitized = censor_sensitive_keys(None, "info", event_dict)
    assert sanitized["openai_api_key"] == "[REDACTED_SECRET]"
    assert sanitized["authorization"] == "[REDACTED_SECRET]"
    assert sanitized["safe_param"] == "operational"
    assert "What did Lenny say" not in sanitized["user_prompt"]
    assert sanitized["user_prompt_char_count"] == len(prompt_text)
