"""Structured Logging and Request/Session Correlation ID Middleware for Lenny Growth Assistant."""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

# Sensitive keys that must NEVER appear in log event dictionaries or values
SENSITIVE_KEYS = {
    "authorization",
    "cookie",
    "password",
    "token",
    "api_key",
    "secret",
    "openai_api_key",
    "anthropic_api_key",
    "prompt",
    "user_prompt",
    "content",
}


def censor_sensitive_keys(logger, log_method: str, event_dict: dict) -> dict:
    """Processor to scrub secrets, credentials, and sensitive prompt text from log entries."""
    for key in list(event_dict.keys()):
        lower_key = key.lower()
        if any(s in lower_key for s in SENSITIVE_KEYS):
            val = event_dict[key]
            if isinstance(val, str):
                if "key" in lower_key or "auth" in lower_key or "secret" in lower_key:
                    event_dict[key] = "[REDACTED_SECRET]"
                elif "prompt" in lower_key or "content" in lower_key:
                    # Log prompt length for diagnostic sizing, never the sensitive prompt text itself
                    event_dict[f"{key}_char_count"] = len(val)
                    event_dict[key] = f"[MASKED_PROMPT_LEN_{len(val)}]"
            else:
                event_dict[key] = "[REDACTED]"
    return event_dict


def setup_logging(is_production: bool = False) -> None:
    """Configure structlog processors and output formatters."""
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        censor_sensitive_keys,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if is_production:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=False))

    structlog.configure(
        processors=processors,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Middleware that injects request_id and session_id into structured logging context."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract or generate Request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

        # Extract Session ID from header or query parameters if present
        session_id = request.headers.get("X-Session-ID") or request.query_params.get("session_id")

        # Clear existing contextvars and bind correlation IDs for this request lifecycle
        structlog.contextvars.clear_contextvars()
        context_dict = {"request_id": request_id}
        if session_id:
            context_dict["session_id"] = session_id

        structlog.contextvars.bind_contextvars(**context_dict)
        logger = structlog.get_logger()

        start_time = time.perf_counter()
        path = request.url.path
        method = request.method

        # Do not log noisy polling/health endpoints on request entry in production
        is_health = path in ("/api/health", "/api/ready", "/health", "/ready")
        if not is_health:
            logger.info("http_request_start", method=method, path=path)

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            
            # Attach X-Request-ID to downstream HTTP response
            response.headers["X-Request-ID"] = request_id
            if session_id:
                response.headers["X-Session-ID"] = session_id

            if not is_health or response.status_code >= 400:
                logger.info(
                    "http_request_completed",
                    method=method,
                    path=path,
                    status_code=response.status_code,
                    duration_ms=duration_ms,
                )
            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                "http_request_failed",
                method=method,
                path=path,
                error_type=type(exc).__name__,
                duration_ms=duration_ms,
            )
            raise
        finally:
            structlog.contextvars.clear_contextvars()
