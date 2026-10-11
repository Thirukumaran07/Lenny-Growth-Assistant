"""Models and Provider Diagnostic API router."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.config import get_settings
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

router = APIRouter(prefix="/models", tags=["models"])
provider_manager = ProviderManager()


class ProviderSwitchRequest(BaseModel):
    provider: ProviderType = Field(..., description="Target provider: 'local_ollama' or 'cloud_openai'")


class InferenceTestRequest(BaseModel):
    prompt: str = Field(default="Hello, are you operational?", max_length=500)
    provider_override: ProviderType | None = None


@router.get("", summary="Get status and configuration of all model providers")
async def get_models_status():
    """Returns status of local and cloud providers with memory usage and diagnostic notes."""
    settings = get_settings()
    health_map = await provider_manager.get_all_provider_health()

    return {
        "active_provider": provider_manager.get_active_provider_type().value,
        "default_provider": settings.ACTIVE_LLM_PROVIDER,
        "hardware_profile": {
            "device": "MacBook Air (Intel Core i5)",
            "ram_total_gb": 8,
            "recommended_local_model": "llama3.2:3b (~2.0 GB memory footprint)",
        },
        "providers": {
            "local_ollama": {
                "configured_model": settings.OLLAMA_GENERATION_MODEL,
                "is_healthy": health_map["local_ollama"].is_healthy,
                "status_message": health_map["local_ollama"].status_message,
                "memory_footprint_mb": health_map["local_ollama"].memory_footprint_mb,
                "installed_models": health_map["local_ollama"].installed_models,
            },
            "cloud_openai": {
                "configured_model": settings.OPENAI_MODEL,
                "is_healthy": health_map["cloud_openai"].is_healthy,
                "status_message": health_map["cloud_openai"].status_message,
            },
        },
    }


@router.post("/switch", summary="Switch active LLM provider")
async def switch_provider(payload: ProviderSwitchRequest):
    """Switch active provider with explicit privacy check."""
    try:
        return provider_manager.switch_provider(payload.provider)
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/test-inference", summary="Execute safe test inference to verify model connectivity")
async def test_inference(payload: InferenceTestRequest):
    """Execute non-destructive test turn to measure actual inference latency and response."""
    try:
        provider = provider_manager.get_provider(payload.provider_override)
        messages = [ChatMessage(role="user", content=payload.prompt)]
        cfg = GenerationConfig(temperature=0.1, max_tokens=60, timeout_seconds=30.0)
        
        response_text = await provider.generate_completion(messages, cfg)
        return {
            "provider": provider.provider_type().value,
            "model": provider.active_model(),
            "prompt": payload.prompt,
            "response": response_text.strip(),
            "status": "success",
        }
    except ModelNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ProviderConnectionError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except AuthenticationError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except ProviderTimeoutError as e:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
