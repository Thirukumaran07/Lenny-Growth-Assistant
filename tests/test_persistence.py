"""Automated test suite for Phase 4: PostgreSQL persistence, session/message CRUD,
cross-session isolation, reconnect persistence, validation errors, and DB failure handling.
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from fastapi import HTTPException

from backend.app.config import get_settings
from backend.app.repositories.session_repo import SessionRepository
from backend.app.repositories.message_repo import MessageRepository
from backend.app.services.session_service import SessionService
from backend.app.schemas.session import SessionCreate, SessionUpdate
from backend.app.schemas.message import MessageCreate


@pytest.mark.asyncio
async def test_session_lifecycle_crud(async_client: AsyncClient):
    """Verify session creation, renaming, message appending, and retrieval."""
    # 1. Create Session
    create_res = await async_client.post(
        "/api/sessions",
        json={"title": "Retention Deep Dive", "metadata": {"source": "test"}},
    )
    assert create_res.status_code == 201
    session_data = create_res.json()
    session_id = session_data["id"]
    assert session_data["title"] == "Retention Deep Dive"
    assert session_data["message_count"] == 0

    try:
        # 2. Append Message (User Turn)
        msg1_res = await async_client.post(
            f"/api/sessions/{session_id}/messages",
            json={
                "role": "user",
                "content": "What are good consumer retention benchmarks?",
                "citations": [],
            },
        )
        assert msg1_res.status_code == 201
        msg1_data = msg1_res.json()
        assert msg1_data["role"] == "user"
        assert msg1_data["session_id"] == session_id

        # 3. Append Message (Assistant Turn with Citations)
        citations = [
            {
                "guest": "Elena Verna",
                "episode": "Product-Led Growth",
                "timestamp": "14:20",
                "quote": "B2C apps should aim for 25% D30 retention.",
            }
        ]
        msg2_res = await async_client.post(
            f"/api/sessions/{session_id}/messages",
            json={
                "role": "assistant",
                "content": "Elena Verna states that top consumer apps target 25% D30.",
                "citations": citations,
            },
        )
        assert msg2_res.status_code == 201
        msg2_data = msg2_res.json()
        assert len(msg2_data["citations"]) == 1

        # 4. Get Session with Full History
        detail_res = await async_client.get(f"/api/sessions/{session_id}")
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert len(detail_data["messages"]) == 2
        assert detail_data["messages"][0]["role"] == "user"
        assert detail_data["messages"][1]["role"] == "assistant"

        # 5. Rename Session
        rename_res = await async_client.patch(
            f"/api/sessions/{session_id}",
            json={"title": "Updated Retention Study"},
        )
        assert rename_res.status_code == 200
        assert rename_res.json()["title"] == "Updated Retention Study"
        assert rename_res.json()["message_count"] == 2

        # 6. List Sessions (Pagination verification)
        list_res = await async_client.get("/api/sessions?limit=10&offset=0")
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert list_data["total"] >= 1
        ids = [item["id"] for item in list_data["items"]]
        assert session_id in ids

    finally:
        # 7. Delete Session & Verify Cascade
        del_res = await async_client.delete(f"/api/sessions/{session_id}")
        assert del_res.status_code == 200

        # Confirm 404 after deletion
        recheck_res = await async_client.get(f"/api/sessions/{session_id}")
        assert recheck_res.status_code == 404


@pytest.mark.asyncio
async def test_persistence_across_connection_restarts():
    """Verify that records persist in PostgreSQL after the connection pool is disposed."""
    settings = get_settings()
    engine1 = create_async_engine(settings.DATABASE_URL)
    session_factory1 = async_sessionmaker(engine1, expire_on_commit=False)

    session_repo = SessionRepository()
    message_repo = MessageRepository()
    service1 = SessionService(session_repo, message_repo)

    test_title = f"Reconnect-Test-{uuid.uuid4().hex[:6]}"
    created_id: uuid.UUID

    # 1. Create data in first connection pool
    async with session_factory1() as db1:
        res = await service1.create_session(db1, SessionCreate(title=test_title))
        created_id = res.id
        await service1.append_message(
            db1,
            created_id,
            MessageCreate(role="user", content="Persistence check message"),
        )

    # 2. Sever/dispose the engine connection completely
    await engine1.dispose()

    # 3. Create a brand new independent engine & connection pool
    engine2 = create_async_engine(settings.DATABASE_URL)
    session_factory2 = async_sessionmaker(engine2, expire_on_commit=False)
    service2 = SessionService(session_repo, message_repo)

    # 4. Reconnect and assert data is completely intact
    async with session_factory2() as db2:
        reloaded = await service2.get_session_detail(db2, created_id)
        assert reloaded.id == created_id
        assert reloaded.title == test_title
        assert len(reloaded.messages) == 1
        assert reloaded.messages[0].content == "Persistence check message"

        # Cleanup test data
        await service2.delete_session(db2, created_id)

    await engine2.dispose()


@pytest.mark.asyncio
async def test_cross_session_isolation(async_client: AsyncClient):
    """Ensure messages in Session A are never accessible or leaked into Session B."""
    res_a = await async_client.post("/api/sessions", json={"title": "Session A"})
    res_b = await async_client.post("/api/sessions", json={"title": "Session B"})
    id_a = res_a.json()["id"]
    id_b = res_b.json()["id"]

    try:
        # Add message only to Session A
        await async_client.post(
            f"/api/sessions/{id_a}/messages",
            json={"role": "user", "content": "Confidential PMF insights for A"},
        )

        # Query messages for Session B
        messages_b_res = await async_client.get(f"/api/sessions/{id_b}/messages")
        assert messages_b_res.status_code == 200
        messages_b = messages_b_res.json()["items"]
        assert len(messages_b) == 0  # Zero leak

        # Query full history for Session B
        detail_b = (await async_client.get(f"/api/sessions/{id_b}")).json()
        assert len(detail_b["messages"]) == 0
    finally:
        await async_client.delete(f"/api/sessions/{id_a}")
        await async_client.delete(f"/api/sessions/{id_b}")


@pytest.mark.asyncio
async def test_invalid_session_error_handling(async_client: AsyncClient):
    """Ensure non-existent session IDs return structured 404 errors."""
    fake_id = "00000000-0000-0000-0000-000000000000"

    # Get non-existent session
    get_res = await async_client.get(f"/api/sessions/{fake_id}")
    assert get_res.status_code == 404
    assert "not found" in get_res.json()["detail"].lower()

    # Append to non-existent session
    post_res = await async_client.post(
        f"/api/sessions/{fake_id}/messages",
        json={"role": "user", "content": "Hello"},
    )
    assert post_res.status_code == 404

    # Rename non-existent session
    patch_res = await async_client.patch(
        f"/api/sessions/{fake_id}",
        json={"title": "New Title"},
    )
    assert patch_res.status_code == 404

    # Delete non-existent session
    del_res = await async_client.delete(f"/api/sessions/{fake_id}")
    assert del_res.status_code == 404


@pytest.mark.asyncio
async def test_input_validation_failures(async_client: AsyncClient):
    """Ensure invalid payloads trigger structured 422 or 400 validation responses."""
    # 1. Invalid UUID format
    invalid_uuid_res = await async_client.get("/api/sessions/not-a-valid-uuid")
    assert invalid_uuid_res.status_code == 422

    # 2. Create session with valid ID first
    sess = (await async_client.post("/api/sessions", json={"title": "Valid"})).json()
    sess_id = sess["id"]

    try:
        # Invalid role (not user/assistant/system)
        bad_role_res = await async_client.post(
            f"/api/sessions/{sess_id}/messages",
            json={"role": "superuser", "content": "Invalid role test"},
        )
        assert bad_role_res.status_code == 422

        # Empty content
        empty_content_res = await async_client.post(
            f"/api/sessions/{sess_id}/messages",
            json={"role": "user", "content": ""},
        )
        assert empty_content_res.status_code == 422

        # Whitespace-only rename title
        empty_title_res = await async_client.patch(
            f"/api/sessions/{sess_id}",
            json={"title": "   "},
        )
        assert empty_title_res.status_code == 400
    finally:
        await async_client.delete(f"/api/sessions/{sess_id}")


@pytest.mark.asyncio
async def test_database_unavailable_behavior():
    """Verify that an unavailable database raises a clear exception without process crash."""
    bad_url = "postgresql+asyncpg://apple:@localhost:54399/nonexistent_db"
    bad_engine = create_async_engine(bad_url, connect_args={"timeout": 1})
    bad_session_factory = async_sessionmaker(bad_engine)

    service = SessionService()

    with pytest.raises(Exception):
        async with bad_session_factory() as db:
            await service.create_session(db, SessionCreate(title="Crash test"))

    await bad_engine.dispose()
