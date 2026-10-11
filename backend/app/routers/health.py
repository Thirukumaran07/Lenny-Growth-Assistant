"""Health and readiness endpoints reporting truthful dependency statuses."""

from typing import Any
import httpx
from fastapi import APIRouter, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from backend.app.config import get_settings

router = APIRouter(tags=["health"])


async def check_database_status(database_url: str) -> dict[str, Any]:
    """Test actual connectivity to the PostgreSQL database."""
    try:
        engine = create_async_engine(database_url, connect_args={"timeout": 3})
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1;"))
            val = result.scalar()
            if val == 1:
                return {"status": "connected", "healthy": True}
        await engine.dispose()
        return {"status": "connected", "healthy": True}
    except Exception as e:
        return {
            "status": "disconnected",
            "healthy": False,
            "error": str(e).split("\n")[0],
        }


async def check_ollama_status(base_url: str, required_models: list[str]) -> dict[str, Any]:
    """Test reachability of local Ollama daemon and verify model availability."""
    tags_url = f"{base_url.rstrip('/')}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            resp = await client.get(tags_url)
            if resp.status_code == 200:
                data = resp.json()
                installed_models = [m.get("name", "") for m in data.get("models", [])]
                
                # Check for required models (matching prefix e.g. llama3.2:3b or llama3.2:3b-...)
                models_present: dict[str, bool] = {}
                for req in required_models:
                    models_present[req] = any(req in m for m in installed_models)
                
                return {
                    "status": "reachable",
                    "healthy": True,
                    "installed_models_count": len(installed_models),
                    "required_models_present": models_present,
                    "all_required_present": all(models_present.values()),
                }
            return {
                "status": f"http_error_{resp.status_code}",
                "healthy": False,
                "error": f"Ollama returned HTTP {resp.status_code}",
            }
    except httpx.ConnectError:
        return {
            "status": "unreachable",
            "healthy": False,
            "error": f"Cannot connect to Ollama at {base_url}. Ensure 'ollama serve' is running.",
        }
    except Exception as e:
        return {
            "status": "error",
            "healthy": False,
            "error": str(e),
        }


@router.get("/health")
async def get_liveness() -> dict[str, Any]:
    """Liveness probe: verifies application process is running."""
    settings = get_settings()
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "active_provider": settings.ACTIVE_LLM_PROVIDER,
    }


@router.get("/ready")
async def get_readiness(response: Response) -> dict[str, Any]:
    """Readiness probe: performs truthful dependency probes for DB, Ollama, and Cloud."""
    settings = get_settings()
    
    # 1. Database check
    db_status = await check_database_status(settings.DATABASE_URL)
    
    # 2. Ollama check
    required_models = [settings.OLLAMA_GENERATION_MODEL, settings.OLLAMA_EMBEDDING_MODEL]
    ollama_status = await check_ollama_status(settings.OLLAMA_BASE_URL, required_models)
    
    # 3. Cloud Provider check
    cloud_ready, cloud_msg = settings.is_cloud_ready()
    cloud_status = {
        "configured_provider": settings.CLOUD_PROVIDER_TYPE,
        "is_ready": cloud_ready,
        "message": cloud_msg,
    }

    # Determine overall system readiness
    is_db_ok = db_status.get("healthy", False)
    is_ollama_ok = ollama_status.get("healthy", False)
    
    # In local mode, DB and Ollama are critical for full readiness
    if settings.ACTIVE_LLM_PROVIDER == "local_ollama":
        if is_db_ok and is_ollama_ok:
            overall_status = "ready"
            response.status_code = status.HTTP_200_OK
        elif is_db_ok and not is_ollama_ok:
            overall_status = "degraded"
            response.status_code = status.HTTP_200_OK
        else:
            overall_status = "unhealthy"
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    else:
        # In cloud mode, cloud readiness is checked
        if is_db_ok and cloud_ready:
            overall_status = "ready"
            response.status_code = status.HTTP_200_OK
        else:
            overall_status = "unhealthy"
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": overall_status,
        "active_provider": settings.ACTIVE_LLM_PROVIDER,
        "dependencies": {
            "database": db_status,
            "ollama": ollama_status,
            "cloud_provider": cloud_status,
        },
    }
