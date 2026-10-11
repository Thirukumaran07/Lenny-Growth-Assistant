"""Dynamic LLM Provider Manager resolving active provider with explicit privacy rules."""

from typing import Any
import structlog

from backend.app.config import get_settings
from backend.app.providers.base import (
    AuthenticationError,
    LLMProvider,
    ProviderHealth,
    ProviderType,
)
from backend.app.providers.ollama import OllamaProvider
from backend.app.providers.cloud_openai import OpenAICloudProvider

logger = structlog.get_logger()


class ProviderManager:
    """Manages active LLM provider selection and enforces explicit privacy guardrails."""

    def __init__(self):
        self._active_type: ProviderType = ProviderType.LOCAL_OLLAMA
        self._ollama_provider = OllamaProvider()
        self._cloud_provider = OpenAICloudProvider()

        # Initialize from settings
        settings = get_settings()
        if settings.ACTIVE_LLM_PROVIDER == "cloud":
            self._active_type = ProviderType.CLOUD_OPENAI
        else:
            self._active_type = ProviderType.LOCAL_OLLAMA

    def get_active_provider_type(self) -> ProviderType:
        return self._active_type

    def get_provider(self, override: ProviderType | None = None) -> LLMProvider:
        """Resolve the provider instance.

        Explicit privacy invariant:
        Never silently fall back to cloud unless explicitly requested.
        """
        target = override or self._active_type

        if target == ProviderType.LOCAL_OLLAMA:
            return self._ollama_provider
        elif target == ProviderType.CLOUD_OPENAI:
            settings = get_settings()
            ready, msg = settings.is_cloud_ready()
            if not ready:
                raise AuthenticationError(
                    f"Cloud provider requested but not configured: {msg}",
                    provider="cloud_openai",
                )
            return self._cloud_provider
        else:
            return self._ollama_provider

    def switch_provider(self, new_type: ProviderType) -> dict[str, Any]:
        """Switch active provider with explicit validation."""
        if new_type == ProviderType.CLOUD_OPENAI:
            settings = get_settings()
            ready, msg = settings.is_cloud_ready()
            if not ready:
                raise AuthenticationError(
                    f"Cannot switch to Cloud: {msg}",
                    provider="cloud_openai",
                )
            self._active_type = ProviderType.CLOUD_OPENAI
            logger.info("provider_switched", to="cloud_openai")
            return {"active_provider": "cloud_openai", "message": "Switched to Cloud Provider (OpenAI)."}
        else:
            self._active_type = ProviderType.LOCAL_OLLAMA
            logger.info("provider_switched", to="local_ollama")
            return {"active_provider": "local_ollama", "message": "Switched to Local Ollama (llama3.2:3b)."}

    async def get_all_provider_health(self) -> dict[str, ProviderHealth]:
        """Check health status across all available providers."""
        ollama_health = await self._ollama_provider.check_health()
        cloud_health = await self._cloud_provider.check_health()
        return {
            "local_ollama": ollama_health,
            "cloud_openai": cloud_health,
        }
