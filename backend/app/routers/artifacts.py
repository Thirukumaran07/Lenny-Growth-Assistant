"""FastAPI endpoints for Artifact management and inspection."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from backend.app.db.session import get_db
from backend.app.repositories.artifact_repo import ArtifactRepository
from backend.app.repositories.session_repo import SessionRepository
from backend.app.schemas.artifact import ArtifactCreate, ArtifactResponse

logger = structlog.get_logger()
router = APIRouter(tags=["artifacts"])


@router.get("/artifacts/{artifact_id}", response_model=ArtifactResponse)
async def get_artifact(
    artifact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    artifact_repo: ArtifactRepository = Depends(ArtifactRepository),
):
    """Retrieve raw artifact code, type, title, and metadata by UUID."""
    artifact = await artifact_repo.get_by_id(db, artifact_id)
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact with id '{artifact_id}' not found.",
        )
    return artifact


@router.get("/sessions/{session_id}/artifacts", response_model=list[ArtifactResponse])
async def list_session_artifacts(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    session_repo: SessionRepository = Depends(SessionRepository),
    artifact_repo: ArtifactRepository = Depends(ArtifactRepository),
):
    """List all artifacts associated with a specific session."""
    session = await session_repo.get_by_id(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with id '{session_id}' not found.",
        )
    artifacts, _ = await artifact_repo.list_for_session(db, session_id)
    return artifacts


@router.post("/artifacts", response_model=ArtifactResponse, status_code=status.HTTP_201_CREATED)
async def create_artifact(
    payload: ArtifactCreate,
    db: AsyncSession = Depends(get_db),
    session_repo: SessionRepository = Depends(SessionRepository),
    artifact_repo: ArtifactRepository = Depends(ArtifactRepository),
):
    """Create and persist an artifact associated with a session."""
    # Verify parent session exists
    session = await session_repo.get_by_id(db, payload.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with id '{payload.session_id}' not found.",
        )

    try:
        artifact = await artifact_repo.create(
            db=db,
            session_id=payload.session_id,
            title=payload.title,
            artifact_type=payload.artifact_type,
            content=payload.content,
        )
        await db.commit()
        return artifact
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


@router.delete("/artifacts/{artifact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_artifact(
    artifact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    artifact_repo: ArtifactRepository = Depends(ArtifactRepository),
):
    """Delete an artifact by UUID."""
    deleted = await artifact_repo.delete(db, artifact_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact with id '{artifact_id}' not found.",
        )
    await db.commit()
    return None
