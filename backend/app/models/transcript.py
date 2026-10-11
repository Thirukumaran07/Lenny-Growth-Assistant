"""SQLAlchemy ORM models for transcript episodes and chunk embeddings."""

from datetime import datetime, timezone
import uuid
from typing import Any
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base


class TranscriptEpisodeModel(Base):
    """Represents an ingested episode of Lenny's Podcast with source metadata."""

    __tablename__ = "transcript_episodes"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    guest: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    episode_date: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    source_url: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )
    content_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    chunks: Mapped[list["TranscriptChunkModel"]] = relationship(
        "TranscriptChunkModel",
        back_populates="episode",
        cascade="all, delete-orphan",
        order_by="TranscriptChunkModel.chunk_index",
    )


class TranscriptChunkModel(Base):
    """Represents an overlapping semantic chunk of an episode with 768d embedding."""

    __tablename__ = "transcript_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    episode_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("transcript_episodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    speaker: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    timestamp_mark: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    embedding: Mapped[list[float]] = mapped_column(
        JSON,
        nullable=False,
    )
    token_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    chunk_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )

    # Relationships
    episode: Mapped["TranscriptEpisodeModel"] = relationship(
        "TranscriptEpisodeModel",
        back_populates="chunks",
    )
