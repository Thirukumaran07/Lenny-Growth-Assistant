"""Repository for Session database operations."""

from datetime import datetime, timezone
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.session import SessionModel
from backend.app.models.message import MessageModel


class SessionRepository:
    """Encapsulates all database queries and transactions for sessions."""

    async def create(
        self,
        db: AsyncSession,
        title: str = "New Session",
        metadata: dict | None = None,
    ) -> SessionModel:
        session = SessionModel(
            title=title,
            metadata_=metadata or {},
        )
        db.add(session)
        await db.flush()
        await db.refresh(session)
        return session

    async def get_by_id(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
    ) -> SessionModel | None:
        query = select(SessionModel).where(SessionModel.id == session_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_with_history(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
    ) -> SessionModel | None:
        query = (
            select(SessionModel)
            .where(SessionModel.id == session_id)
            .options(
                selectinload(SessionModel.messages),
                selectinload(SessionModel.artifacts),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def list_all(
        self,
        db: AsyncSession,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[tuple[SessionModel, int]], int]:
        # Count total
        count_query = select(func.count(SessionModel.id))
        total = (await db.execute(count_query)).scalar_one()

        # Query sessions with message counts
        msg_count_subq = (
            select(
                MessageModel.session_id,
                func.count(MessageModel.id).label("msg_count"),
            )
            .group_by(MessageModel.session_id)
            .subquery()
        )

        query = (
            select(
                SessionModel,
                func.coalesce(msg_count_subq.c.msg_count, 0).label("message_count"),
            )
            .outerjoin(msg_count_subq, SessionModel.id == msg_count_subq.c.session_id)
            .order_by(SessionModel.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(query)
        rows = result.all()
        return [(row[0], row[1]) for row in rows], total

    async def update_title(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        new_title: str,
    ) -> SessionModel | None:
        session = await self.get_by_id(db, session_id)
        if not session:
            return None
        session.title = new_title
        session.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(session)
        return session

    async def delete(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
    ) -> bool:
        session = await self.get_by_id(db, session_id)
        if not session:
            return False
        await db.delete(session)
        await db.flush()
        return True
