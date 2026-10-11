"""Repository handling persistent storage and retrieval of artifacts."""

from datetime import datetime, timezone
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from backend.app.models.artifact import ArtifactModel

logger = structlog.get_logger()

MAX_CONTENT_BYTES = 500_000  # 500 KB limit per artifact payload


class ArtifactRepository:
    """Manages database operations for generated artifacts."""

    async def create(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        title: str,
        artifact_type: str,
        content: str,
    ) -> ArtifactModel:
        """Persist a new validated artifact record."""
        # Sanity check payload size
        if len(content.encode("utf-8")) > MAX_CONTENT_BYTES:
            raise ValueError(f"Artifact content exceeds maximum size of {MAX_CONTENT_BYTES} bytes.")

        artifact = ArtifactModel(
            id=uuid.uuid4(),
            session_id=session_id,
            title=title.strip()[:255],
            artifact_type=artifact_type.strip().lower(),
            content=content,
            created_at=datetime.now(timezone.utc),
        )
        db.add(artifact)
        await db.flush()
        await db.refresh(artifact)

        logger.info(
            "artifact_persisted",
            artifact_id=str(artifact.id),
            session_id=str(session_id),
            artifact_type=artifact.artifact_type,
            title=artifact.title,
            content_length=len(content),
        )
        return artifact

    async def get_by_id(
        self,
        db: AsyncSession,
        artifact_id: uuid.UUID,
    ) -> ArtifactModel | None:
        """Retrieve an artifact by its primary UUID."""
        stmt = select(ArtifactModel).where(ArtifactModel.id == artifact_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def list_for_session(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[ArtifactModel], int]:
        """Fetch all artifacts associated with a session in reverse chronological order."""
        count_stmt = (
            select(func.count(ArtifactModel.id))
            .where(ArtifactModel.session_id == session_id)
        )
        count_res = await db.execute(count_stmt)
        total = count_res.scalar() or 0

        stmt = (
            select(ArtifactModel)
            .where(ArtifactModel.session_id == session_id)
            .order_by(ArtifactModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all()), total

    async def delete(
        self,
        db: AsyncSession,
        artifact_id: uuid.UUID,
    ) -> bool:
        """Delete an artifact by UUID."""
        artifact = await self.get_by_id(db, artifact_id)
        if not artifact:
            return False
        await db.delete(artifact)
        await db.flush()
        logger.info("artifact_deleted", artifact_id=str(artifact_id))
        return True
