"""Pydantic schemas for Messages."""

from datetime import datetime
from typing import Any
import uuid
from pydantic import BaseModel, ConfigDict, Field


class MessageCreate(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    artifact_id: uuid.UUID | None = None


class MessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    citations: list[dict[str, Any]]
    artifact_id: uuid.UUID | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageListResponse(BaseModel):
    items: list[MessageResponse]
    total: int
    session_id: uuid.UUID
