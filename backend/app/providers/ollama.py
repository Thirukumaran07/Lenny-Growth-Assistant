"""Local Ollama LLM provider adapter for llama3.2:3b."""

from collections.abc import AsyncGenerator
import json
import httpx
import structlog

from backend.app.config import get_settings
from backend.app.providers.base import (
    ChatMessage,
    GenerationConfig,
    LLMProvider,
    ModelNotFoundError,
    ProviderConnectionError,
    ProviderHealth,
    ProviderTimeoutError,
    ProviderType,
)

logger = structlog.get_logger()


class OllamaProvider(LLMProvider):
    """Local Ollama provider optimized for resource-conscious inference on 8GB RAM systems."""

    def __init__(self, base_url: str | None = None, model: str | None = None):
        settings = get_settings()
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_GENERATION_MODEL
        self.chat_endpoint = f"{self.base_url}/api/chat"
        self.tags_endpoint = f"{self.base_url}/api/tags"

    def provider_type(self) -> ProviderType:
        return ProviderType.LOCAL_OLLAMA

    def active_model(self) -> str:
        return self.model

    async def check_health(self) -> ProviderHealth:
        """Verify reachability of Ollama daemon and loaded llama3.2:3b model."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(self.tags_endpoint)
                if res.status_code == 200:
                    models = [m.get("name", "") for m in res.json().get("models", [])]
                    has_model = any(self.model in m for m in models)
                    if has_model:
                        return ProviderHealth(
                            provider="local_ollama",
                            is_healthy=True,
                            model=self.model,
                            status_message="Ollama daemon is reachable and model is available.",
                            memory_footprint_mb=2048.0,
                            installed_models=models,
                        )
                    return ProviderHealth(
                        provider="local_ollama",
                        is_healthy=False,
                        model=self.model,
                        status_message=f"Model '{self.model}' is not downloaded. Run: ollama pull {self.model}",
                        installed_models=models,
                    )
                return ProviderHealth(
                    provider="local_ollama",
                    is_healthy=False,
                    model=self.model,
                    status_message=f"Ollama returned HTTP status {res.status_code}",
                )
        except httpx.ConnectError:
            return ProviderHealth(
                provider="local_ollama",
                is_healthy=False,
                model=self.model,
                status_message=f"Cannot connect to Ollama at {self.base_url}. Run 'ollama serve' in terminal.",
            )
        except Exception as e:
            return ProviderHealth(
                provider="local_ollama",
                is_healthy=False,
                model=self.model,
                status_message=f"Ollama health probe error: {str(e)}",
            )

    async def generate_completion(
        self,
        messages: list[ChatMessage],
        config: GenerationConfig | None = None,
    ) -> str:
        """Generate a complete response using non-streaming mode."""
        cfg = config or GenerationConfig()
        payload = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "stream": False,
            "options": {
                "temperature": cfg.temperature,
                "num_predict": cfg.max_tokens,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=cfg.timeout_seconds) as client:
                response = await client.post(self.chat_endpoint, json=payload)
                if response.status_code == 404:
                    raise ModelNotFoundError(
                        f"Model '{self.model}' not found in Ollama daemon.",
                        provider="local_ollama",
                    )
                if response.status_code != 200:
                    raise ProviderConnectionError(
                        f"Ollama returned status {response.status_code}: {response.text}",
                        provider="local_ollama",
                    )
                data = response.json()
                return data.get("message", {}).get("content", "")
        except httpx.ConnectError as e:
            raise ProviderConnectionError(
                f"Cannot connect to Ollama daemon at {self.base_url}. Run 'ollama serve'.",
                provider="local_ollama",
            ) from e
        except httpx.TimeoutException as e:
            raise ProviderTimeoutError(
                f"Ollama request exceeded timeout of {cfg.timeout_seconds}s.",
                provider="local_ollama",
            ) from e

    async def generate_stream(
        self,
        messages: list[ChatMessage],
        config: GenerationConfig | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream token-by-token response from Ollama daemon."""
        cfg = config or GenerationConfig()
        payload = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "stream": True,
            "options": {
                "temperature": cfg.temperature,
                "num_predict": cfg.max_tokens,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=cfg.timeout_seconds) as client:
                async with client.stream("POST", self.chat_endpoint, json=payload) as response:
                    if response.status_code == 404:
                        raise ModelNotFoundError(
                            f"Model '{self.model}' not found in Ollama daemon.",
                            provider="local_ollama",
                        )
                    if response.status_code != 200:
                        raise ProviderConnectionError(
                            f"Ollama stream failed with status {response.status_code}",
                            provider="local_ollama",
                        )

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                            token = chunk.get("message", {}).get("content", "")
                            if token:
                                yield token
                            if chunk.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError as e:
            raise ProviderConnectionError(
                f"Cannot connect to Ollama daemon at {self.base_url}. Run 'ollama serve'.",
                provider="local_ollama",
            ) from e
        except httpx.TimeoutException as e:
            raise ProviderTimeoutError(
                f"Ollama streaming exceeded timeout of {cfg.timeout_seconds}s.",
                provider="local_ollama",
            ) from e
