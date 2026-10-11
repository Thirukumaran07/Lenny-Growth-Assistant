"""Repository for Message database operations with strict session isolation."""

import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.message import MessageModel


class MessageRepository:
    """Encapsulates all database operations for messages, enforcing session scoping."""

    async def append(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        role: str,
        content: str,
        citations: list[dict] | None = None,
        artifact_id: uuid.UUID | None = None,
    ) -> MessageModel:
        message = MessageModel(
            session_id=session_id,
            role=role,
            content=content,
            citations=citations or [],
            artifact_id=artifact_id,
        )
        db.add(message)
        await db.flush()
        await db.refresh(message)
        return message

    async def list_for_session(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[MessageModel], int]:
        # Scoped strictly to session_id to prevent cross-session leaks
        count_query = (
            select(func.count(MessageModel.id))
            .where(MessageModel.session_id == session_id)
        )
        total = (await db.execute(count_query)).scalar_one()

        query = (
            select(MessageModel)
            .where(MessageModel.session_id == session_id)
            .order_by(MessageModel.created_at.asc())
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(query)
        return list(result.scalars().all()), total

    async def get_by_id_and_session(
        self,
        db: AsyncSession,
        message_id: uuid.UUID,
        session_id: uuid.UUID,
    ) -> MessageModel | None:
        """Fetch a message verifying that it belongs to the specified session."""
        query = (
            select(MessageModel)
            .where(
                MessageModel.id == message_id,
                MessageModel.session_id == session_id,
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()
