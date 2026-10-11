"""API Router for Persistent Sessions and Messages."""

import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.services.session_service import SessionService
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

router = APIRouter(prefix="/sessions", tags=["sessions"])
session_service = SessionService()


@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation session",
)
async def create_session(
    payload: SessionCreate = SessionCreate(),
    db: AsyncSession = Depends(get_db),
):
    return await session_service.create_session(db, payload)


@router.get(
    "",
    response_model=SessionListResponse,
    summary="List all persistent conversation sessions",
)
async def list_sessions(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    return await session_service.list_sessions(db, limit=limit, offset=offset)


@router.get(
    "/{session_id}",
    response_model=SessionDetailResponse,
    summary="Get session details and complete conversation history",
)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await session_service.get_session_detail(db, session_id)


@router.patch(
    "/{session_id}",
    response_model=SessionResponse,
    summary="Rename an existing session title",
)
async def rename_session(
    session_id: uuid.UUID,
    payload: SessionUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await session_service.rename_session(db, session_id, payload)


@router.delete(
    "/{session_id}",
    summary="Delete a session and all its associated messages",
)
async def delete_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await session_service.delete_session(db, session_id)


@router.post(
    "/{session_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Append a new message turn to a session",
)
async def append_message(
    session_id: uuid.UUID,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
):
    return await session_service.append_message(db, session_id, payload)


@router.get(
    "/{session_id}/messages",
    response_model=MessageListResponse,
    summary="List messages for a specific session",
)
async def list_session_messages(
    session_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    return await session_service.list_messages(db, session_id, limit=limit, offset=offset)
