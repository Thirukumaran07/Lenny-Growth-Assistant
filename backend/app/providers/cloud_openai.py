"""Cloud LLM adapter for OpenAI-compatible APIs (e.g. gpt-4o-mini)."""

from collections.abc import AsyncGenerator
import json
import httpx
import structlog

from backend.app.config import get_settings
from backend.app.providers.base import (
    AuthenticationError,
    ChatMessage,
    GenerationConfig,
    LLMProvider,
    ProviderConnectionError,
    ProviderHealth,
    ProviderTimeoutError,
    ProviderType,
)

logger = structlog.get_logger()


class OpenAICloudProvider(LLMProvider):
    """Replaceable cloud adapter supporting OpenAI models when credentials are provided."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.api_url = "https://api.openai.com/v1/chat/completions"

    def provider_type(self) -> ProviderType:
        return ProviderType.CLOUD_OPENAI

    def active_model(self) -> str:
        return self.model

    async def check_health(self) -> ProviderHealth:
        """Verify API key presence and connectivity."""
        if not self.api_key or not self.api_key.strip():
            return ProviderHealth(
                provider="cloud_openai",
                is_healthy=False,
                model=self.model,
                status_message="OPENAI_API_KEY is not configured in environment.",
            )

        # Non-destructive test ping to models endpoint
        headers = {"Authorization": f"Bearer {self.api_key.strip()}"}
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get("https://api.openai.com/v1/models", headers=headers)
                if res.status_code == 200:
                    return ProviderHealth(
                        provider="cloud_openai",
                        is_healthy=True,
                        model=self.model,
                        status_message="Cloud credentials verified and endpoint reachable.",
                    )
                elif res.status_code == 401:
                    return ProviderHealth(
                        provider="cloud_openai",
                        is_healthy=False,
                        model=self.model,
                        status_message="Invalid OpenAI API key provided.",
                    )
                return ProviderHealth(
                    provider="cloud_openai",
                    is_healthy=False,
                    model=self.model,
                    status_message=f"OpenAI returned HTTP status {res.status_code}",
                )
        except Exception as e:
            return ProviderHealth(
                provider="cloud_openai",
                is_healthy=False,
                model=self.model,
                status_message=f"Cloud connection failed: {str(e)}",
            )

    async def generate_completion(
        self,
        messages: list[ChatMessage],
        config: GenerationConfig | None = None,
    ) -> str:
        if not self.api_key or not self.api_key.strip():
            raise AuthenticationError(
                "Cannot invoke Cloud provider: OPENAI_API_KEY is not configured.",
                provider="cloud_openai",
            )

        cfg = config or GenerationConfig()
        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "temperature": cfg.temperature,
            "max_tokens": cfg.max_tokens,
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(timeout=cfg.timeout_seconds) as client:
                resp = await client.post(self.api_url, headers=headers, json=payload)
                if resp.status_code == 401:
                    raise AuthenticationError("Invalid OpenAI API key.", provider="cloud_openai")
                if resp.status_code != 200:
                    raise ProviderConnectionError(
                        f"OpenAI error {resp.status_code}: {resp.text}",
                        provider="cloud_openai",
                    )
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except httpx.TimeoutException as e:
            raise ProviderTimeoutError(
                f"Cloud request timed out after {cfg.timeout_seconds}s.",
                provider="cloud_openai",
            ) from e

    async def generate_stream(
        self,
        messages: list[ChatMessage],
        config: GenerationConfig | None = None,
    ) -> AsyncGenerator[str, None]:
        if not self.api_key or not self.api_key.strip():
            raise AuthenticationError(
                "Cannot invoke Cloud provider: OPENAI_API_KEY is not configured.",
                provider="cloud_openai",
            )

        cfg = config or GenerationConfig()
        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "temperature": cfg.temperature,
            "max_tokens": cfg.max_tokens,
            "stream": True,
        }

        try:
            async with httpx.AsyncClient(timeout=cfg.timeout_seconds) as client:
                async with client.stream("POST", self.api_url, headers=headers, json=payload) as resp:
                    if resp.status_code == 401:
                        raise AuthenticationError("Invalid OpenAI API key.", provider="cloud_openai")
                    if resp.status_code != 200:
                        raise ProviderConnectionError(
                            f"OpenAI stream failed {resp.status_code}",
                            provider="cloud_openai",
                        )
                    async for line in resp.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {}).get("content", "")
                            if delta:
                                yield delta
                        except json.JSONDecodeError:
                            continue
        except httpx.TimeoutException as e:
            raise ProviderTimeoutError(
                f"Cloud stream timed out after {cfg.timeout_seconds}s.",
                provider="cloud_openai",
            ) from e
