"""Base interfaces and unified data structures for LLM providers."""

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ProviderType(str, Enum):
    LOCAL_OLLAMA = "local_ollama"
    CLOUD_OPENAI = "cloud_openai"
    CLOUD_ANTHROPIC = "cloud_anthropic"


class LLMError(Exception):
    """Base exception for all LLM provider errors."""
    def __init__(self, message: str, provider: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.provider = provider
        self.details = details or {}


class ProviderConnectionError(LLMError):
    """Raised when the model service cannot be reached."""
    pass


class ModelNotFoundError(LLMError):
    """Raised when the specified model is not downloaded or available."""
    pass


class AuthenticationError(LLMError):
    """Raised when cloud credentials are missing or invalid."""
    pass


class ProviderTimeoutError(LLMError):
    """Raised when generation exceeds configured deadline."""
    pass


@dataclass
class ChatMessage:
    role: str
    content: str

    def to_dict(self) -> dict[str, str]:
        return {"role": self.role, "content": self.content}


@dataclass
class GenerationConfig:
    temperature: float = 0.2
    max_tokens: int = 1500
    timeout_seconds: float = 60.0
    stop_sequences: list[str] = field(default_factory=list)


@dataclass
class ProviderHealth:
    provider: str
    is_healthy: bool
    model: str
    status_message: str
    memory_footprint_mb: float | None = None
    installed_models: list[str] = field(default_factory=list)


class LLMProvider(ABC):
    """Abstract interface defining required behavior for all model backends."""

    @abstractmethod
    def provider_type(self) -> ProviderType:
        """Return provider type identifier."""
        pass

    @abstractmethod
    def active_model(self) -> str:
        """Return currently configured model name."""
        pass

    @abstractmethod
    async def check_health(self) -> ProviderHealth:
        """Probe provider service health and verify loaded models."""
        pass

    @abstractmethod
    async def generate_completion(
        self,
        messages: list[ChatMessage],
        config: GenerationConfig | None = None,
    ) -> str:
        """Generate a complete non-streaming response."""
        pass

    @abstractmethod
    async def generate_stream(
        self,
        messages: list[ChatMessage],
        config: GenerationConfig | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream generated response token-by-token."""
        pass
