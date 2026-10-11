"""Service layer for Session and Message business logic and transactions."""

from datetime import datetime, timezone
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.repositories.session_repo import SessionRepository
from backend.app.repositories.message_repo import MessageRepository
from backend.app.schemas.session import (
    SessionCreate,
    SessionUpdate,
    SessionResponse,
    SessionDetailResponse,
    SessionListResponse,
)
from backend.app.schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageListResponse,
)


class SessionService:
    """Coordinates session transactions, validation, and domain invariants."""

    def __init__(
        self,
        session_repo: SessionRepository | None = None,
        message_repo: MessageRepository | None = None,
    ):
        self.session_repo = session_repo or SessionRepository()
        self.message_repo = message_repo or MessageRepository()

    async def create_session(
        self,
        db: AsyncSession,
        data: SessionCreate,
    ) -> SessionResponse:
        title = (data.title or "New Session").strip()
        if not title:
            title = "New Session"
        session = await self.session_repo.create(db, title=title, metadata=data.metadata)
        await db.commit()
        return SessionResponse(
            id=session.id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
            metadata_=session.metadata_,
            message_count=0,
        )

    async def list_sessions(
        self,
        db: AsyncSession,
        limit: int = 50,
        offset: int = 0,
    ) -> SessionListResponse:
        rows, total = await self.session_repo.list_all(db, limit=limit, offset=offset)
        items = [
            SessionResponse(
                id=s.id,
                title=s.title,
                created_at=s.created_at,
                updated_at=s.updated_at,
                metadata_=s.metadata_,
                message_count=count,
            )
            for s, count in rows
        ]
        return SessionListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
        )

    async def get_session_detail(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
    ) -> SessionDetailResponse:
        session = await self.session_repo.get_with_history(db, session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found.",
            )
        return SessionDetailResponse.model_validate(session)

    async def rename_session(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        data: SessionUpdate,
    ) -> SessionResponse:
        cleaned_title = data.title.strip()
        if not cleaned_title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session title cannot be empty.",
            )
        session = await self.session_repo.update_title(db, session_id, cleaned_title)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found.",
            )
        await db.commit()
        # Fetch message count
        _, total_msgs = await self.message_repo.list_for_session(db, session_id, limit=1)
        return SessionResponse(
            id=session.id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
            metadata_=session.metadata_,
            message_count=total_msgs,
        )

    async def delete_session(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
    ) -> dict[str, str]:
        deleted = await self.session_repo.delete(db, session_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found.",
            )
        await db.commit()
        return {"status": "deleted", "id": str(session_id)}

    async def append_message(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        data: MessageCreate,
    ) -> MessageResponse:
        # Verify session existence
        session = await self.session_repo.get_by_id(db, session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cannot append message: Session {session_id} does not exist.",
            )

        message = await self.message_repo.append(
            db=db,
            session_id=session_id,
            role=data.role,
            content=data.content,
            citations=data.citations,
            artifact_id=data.artifact_id,
        )
        # Touch session updated_at
        session.updated_at = datetime.now(timezone.utc)
        await db.commit()
        return MessageResponse.model_validate(message)

    async def list_messages(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> MessageListResponse:
        session = await self.session_repo.get_by_id(db, session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found.",
            )

        messages, total = await self.message_repo.list_for_session(
            db=db,
            session_id=session_id,
            limit=limit,
            offset=offset,
        )
        return MessageListResponse(
            items=[MessageResponse.model_validate(m) for m in messages],
            total=total,
            session_id=session_id,
        )
