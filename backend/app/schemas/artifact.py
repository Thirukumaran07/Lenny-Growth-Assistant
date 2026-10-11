"""Pydantic schemas for Artifacts with strict validation and size constraints."""

from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_ARTIFACT_CONTENT_BYTES = 500_000  # 500 KB limit to prevent DoS / oversized storage


class ArtifactBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Human-readable title")
    artifact_type: str = Field(
        ...,
        description="Type of generated artifact: strictly 'html' or 'markdown'",
    )
    content: str = Field(..., min_length=1, description="Raw content of the artifact")

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Artifact title cannot be empty or whitespace only.")
        return cleaned

    @field_validator("artifact_type")
    @classmethod
    def validate_artifact_type(cls, v: str) -> str:
        lowered = v.strip().lower()
        if lowered not in ("html", "markdown"):
            raise ValueError(f"Unsupported artifact type '{v}'. Allowed types are 'html' and 'markdown'.")
        return lowered

    @field_validator("content")
    @classmethod
    def validate_content_size(cls, v: str) -> str:
        byte_len = len(v.encode("utf-8"))
        if byte_len > MAX_ARTIFACT_CONTENT_BYTES:
            raise ValueError(
                f"Artifact content size ({byte_len} bytes) exceeds maximum allowable limit of {MAX_ARTIFACT_CONTENT_BYTES} bytes."
            )
        return v


class ArtifactCreate(ArtifactBase):
    session_id: uuid.UUID = Field(..., description="Parent session UUID association")


class ArtifactResponse(ArtifactBase):
    id: uuid.UUID
    session_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
