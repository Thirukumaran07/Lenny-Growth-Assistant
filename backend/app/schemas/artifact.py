"""Pydantic schemas for Artifacts."""

from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field


class ArtifactBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    artifact_type: str = Field(..., pattern="^(html|markdown)$")
    content: str = Field(..., min_length=1)


class ArtifactCreate(ArtifactBase):
    pass


class ArtifactResponse(ArtifactBase):
    id: uuid.UUID
    session_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
