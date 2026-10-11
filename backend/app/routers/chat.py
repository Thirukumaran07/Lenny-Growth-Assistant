"""Server-Sent Events (SSE) Chat API Router."""

import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.agent.runner import AgentRunner
from backend.app.db.session import get_db

router = APIRouter(prefix="/chat", tags=["chat"])
agent_runner = AgentRunner()


class ChatStreamRequest(BaseModel):
    session_id: uuid.UUID = Field(..., description="Target session UUID")
    prompt: str = Field(..., min_length=1, max_length=4000, description="User query or instruction")
    provider_override: str | None = Field(default=None, description="Optional provider override")


@router.post("/stream", summary="Stream conversational response turns via Server-Sent Events (SSE)")
async def stream_chat_turn(
    payload: ChatStreamRequest,
    db: AsyncSession = Depends(get_db),
):
    """Initiates an SSE stream returning real-time status, citation metadata, and token chunks."""

    async def event_generator():
        try:
            async for event_obj in agent_runner.run_turn_stream(
                db=db,
                session_id=payload.session_id,
                user_prompt=payload.prompt,
                provider_override=payload.provider_override,
            ):
                event_name = event_obj.get("event", "message")
                data_json = json.dumps(event_obj.get("data", {}))
                yield f"event: {event_name}\ndata: {data_json}\n\n"
        except Exception as e:
            err_data = json.dumps({"error": str(e)})
            yield f"event: error\ndata: {err_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
