"""Pydantic schemas for Sessions."""

from datetime import datetime
from typing import Any
import uuid
from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.message import MessageResponse
from backend.app.schemas.artifact import ArtifactResponse


class SessionCreate(BaseModel):
    title: str | None = Field(default="New Session", max_length=255)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SessionUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class SessionResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    metadata: dict[str, Any] = Field(alias="metadata_")
    message_count: int = 0

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SessionDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    metadata: dict[str, Any] = Field(alias="metadata_")
    messages: list[MessageResponse] = Field(default_factory=list)
    artifacts: list[ArtifactResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SessionListResponse(BaseModel):
    items: list[SessionResponse]
    total: int
    limit: int
    offset: int
