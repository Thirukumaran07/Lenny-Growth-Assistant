"""Automated tests for Phase 6: LLM Provider Abstraction, Local Ollama,
Cloud OpenAI Adapter, Privacy Guardrails, Timeouts, and Error Handling.
"""

from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient

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


@pytest.mark.asyncio
async def test_ollama_provider_health_check():
    """Verify OllamaProvider checks daemon reachability and models."""
    provider = OllamaProvider()
    health = await provider.check_health()
    assert health.provider == "local_ollama"
    assert health.is_healthy is True
    assert "llama3.2:3b" in health.installed_models


@pytest.mark.asyncio
async def test_ollama_live_inference():
    """Verify live inference using local llama3.2:3b generates valid non-empty tokens."""
    provider = OllamaProvider()
    messages = [
        ChatMessage(role="user", content="Respond with exactly one word: 'Operational'.")
    ]
    cfg = GenerationConfig(temperature=0.1, max_tokens=10, timeout_seconds=30.0)

    # 1. Non-streaming test
    completion = await provider.generate_completion(messages, cfg)
    assert isinstance(completion, str)
    assert len(completion.strip()) > 0

    # 2. Streaming test
    streamed_tokens = []
    async for token in provider.generate_stream(messages, cfg):
        streamed_tokens.append(token)
    assert len(streamed_tokens) > 0
    full_text = "".join(streamed_tokens)
    assert len(full_text.strip()) > 0


@pytest.mark.asyncio
async def test_explicit_cloud_privacy_guardrail():
    """Verify cloud provider is NEVER invoked silently when unconfigured."""
    manager = ProviderManager()
    # Default is local_ollama
    assert manager.get_active_provider_type() == ProviderType.LOCAL_OLLAMA

    # Attempting to switch to cloud without keys raises explicit AuthenticationError
    with pytest.raises(AuthenticationError) as exc_info:
        manager.switch_provider(ProviderType.CLOUD_OPENAI)
    assert "OPENAI_API_KEY is not configured" in str(exc_info.value)


@pytest.mark.asyncio
async def test_cloud_provider_missing_key_error():
    """Verify cloud adapter refuses to execute when API key is missing."""
    cloud_provider = OpenAICloudProvider(api_key="")
    messages = [ChatMessage(role="user", content="Hello")]

    with pytest.raises(AuthenticationError) as exc:
        await cloud_provider.generate_completion(messages)
    assert "OPENAI_API_KEY is not configured" in str(exc.value)


@pytest.mark.asyncio
async def test_mocked_ollama_connection_error():
    """Verify OllamaProvider raises structured ProviderConnectionError on connection drop."""
    provider = OllamaProvider(base_url="http://localhost:54399")  # Unreachable port
    messages = [ChatMessage(role="user", content="Test")]

    with pytest.raises(ProviderConnectionError) as exc:
        await provider.generate_completion(messages, GenerationConfig(timeout_seconds=1.0))
    assert "Cannot connect to Ollama daemon" in str(exc.value)


@pytest.mark.asyncio
async def test_models_api_endpoints(async_client: AsyncClient):
    """Verify /api/models diagnostic endpoint returns active and local status."""
    res = await async_client.get("/api/models")
    assert res.status_code == 200
    data = res.json()
    assert data["active_provider"] == "local_ollama"
    assert data["hardware_profile"]["ram_total_gb"] == 8
    assert data["providers"]["local_ollama"]["is_healthy"] is True

    # Test inference endpoint with local model
    test_res = await async_client.post(
        "/api/models/test-inference",
        json={"prompt": "Say test"},
    )
    assert test_res.status_code == 200
    test_data = test_res.json()
    assert test_data["status"] == "success"
    assert test_data["provider"] == "local_ollama"
    assert len(test_data["response"]) > 0
