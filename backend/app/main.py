"""FastAPI Application Entry Point for The Lenny Growth Assistant."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from backend.app.config import get_settings
from backend.app.routers.health import router as health_router
from backend.app.routers.sessions import router as sessions_router
from backend.app.routers.models import router as models_router
from backend.app.routers.chat import router as chat_router
from backend.app.routers.artifacts import router as artifacts_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifecycle management."""
    settings = get_settings()
    logger.info(
        "app_startup",
        name=settings.APP_NAME,
        version=settings.APP_VERSION,
        env=settings.APP_ENV,
        provider=settings.ACTIVE_LLM_PROVIDER,
    )
    yield
    logger.info("app_shutdown")


def create_app() -> FastAPI:
    """Build and configure the FastAPI application instance."""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Local-first conversational AI workbench grounded in Lenny's Podcast archives.",
        lifespan=lifespan,
    )

    # Cross-Origin Resource Sharing (CORS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.FRONTEND_ORIGIN,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Routers
    app.include_router(health_router, prefix="/api")
    app.include_router(sessions_router, prefix="/api")
    app.include_router(models_router, prefix="/api")
    app.include_router(chat_router, prefix="/api")
    app.include_router(artifacts_router, prefix="/api")
    # Also expose /health and /ready directly at root for standard Docker/K8s orchestrators
    app.include_router(health_router)

    @app.get("/")
    async def root():
        return {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "online",
            "health_endpoint": "/api/health",
            "readiness_endpoint": "/api/ready",
            "docs": "/docs",
        }

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("unhandled_exception", path=request.url.path, error=str(exc))
        return JSONResponse(
            status_code=500,
            content={
                "error": "InternalServerError",
                "message": "An unexpected server error occurred.",
                "path": request.url.path,
            },
        )

    return app


app = create_app()
