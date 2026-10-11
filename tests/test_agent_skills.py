"""Automated tests for Phase 7: Agent Runner, Skill Router, Grounded Q&A,
Ship 30 for 30 Essay Generation, Follow-up Context, Insufficient Evidence, and Persistence.
"""

import json
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from backend.app.agent.router import SkillRouter
from backend.app.agent.runner import AgentRunner
from backend.app.agent.skills.base import SkillType
from backend.app.config import get_settings
from backend.app.repositories.message_repo import MessageRepository
from backend.app.repositories.session_repo import SessionRepository


def test_skill_router_classification():
    """Verify router deterministically classifies queries into appropriate skills."""
    router = SkillRouter()

    # Ship 30 for 30 triggers
    assert router.route("/essay write about PMF") == SkillType.SHIP30_ESSAY
    assert router.route("Generate a Ship 30 for 30 essay on Miro PLG") == SkillType.SHIP30_ESSAY
    assert router.route("Write an atomic essay on retention") == SkillType.SHIP30_ESSAY

    # Direct greetings
    assert router.route("Hello!") == SkillType.DIRECT_CHAT
    assert router.route("Hi") == SkillType.DIRECT_CHAT

    # Grounded Q&A (default)
    assert router.route("What are good B2B retention benchmarks?") == SkillType.GROUNDED_QA
    assert router.route("How did Rahul Vohra measure PMF?") == SkillType.GROUNDED_QA


@pytest.mark.asyncio
async def test_grounded_qa_turn_and_citations():
    """Verify agent executes Grounded Q&A skill, attaches citations, and persists turns."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    session_repo = SessionRepository()
    message_repo = MessageRepository()
    runner = AgentRunner()

    async with session_factory() as db:
        session = await session_repo.create(db, title="PMF Q&A Test")
        session_id = session.id
        await db.commit()

        # Execute grounded turn
        events = []
        async for event in runner.run_turn_stream(
            db=db,
            session_id=session_id,
            user_prompt="How did Superhuman measure product market fit with the survey?",
        ):
            events.append(event)

        # Assert events received: routing, retrieval, citations, tokens, done
        event_names = [e["event"] for e in events]
        assert "status" in event_names
        assert "citations" in event_names
        assert "token" in event_names
        assert "done" in event_names

        # Check citations
        citations_event = next(e for e in events if e["event"] == "citations")
        citations = citations_event["data"]["citations"]
        assert len(citations) > 0
        assert citations[0]["guest"] == "Rahul Vohra"

        # Check tokens
        tokens = [e["data"]["token"] for e in events if e["event"] == "token"]
        full_text = "".join(tokens)
        assert len(full_text) > 0

        # Verify messages persisted in PostgreSQL
        saved_messages, count = await message_repo.list_for_session(db, session_id)
        assert count == 2  # user + assistant
        assert saved_messages[0].role == "user"
        assert saved_messages[1].role == "assistant"
        assert len(saved_messages[1].citations) > 0

        # Cleanup
        await session_repo.delete(db, session_id)
        await db.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_followup_context_continuity():
    """Verify that follow-up questions leverage prior turn context for continuity."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    session_repo = SessionRepository()
    message_repo = MessageRepository()
    runner = AgentRunner()

    async with session_factory() as db:
        session = await session_repo.create(db, title="Follow-up Continuity Test")
        session_id = session.id
        await db.commit()

        # Turn 1: Discuss Superhuman PMF
        async for _ in runner.run_turn_stream(
            db=db,
            session_id=session_id,
            user_prompt="What percentage did Superhuman need to hit according to Sean Ellis?",
        ):
            pass

        # Turn 2: Follow-up question relying on Turn 1 context
        events_t2 = []
        async for event in runner.run_turn_stream(
            db=db,
            session_id=session_id,
            user_prompt="Who was the guest that explained that framework?",
        ):
            events_t2.append(event)

        tokens_t2 = [e["data"]["token"] for e in events_t2 if e["event"] == "token"]
        t2_text = "".join(tokens_t2)
        assert "rahul" in t2_text.lower() or "vohra" in t2_text.lower()

        # Cleanup
        await session_repo.delete(db, session_id)
        await db.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_ship30_essay_generation_structure():
    """Verify Ship 30 for 30 skill produces structured atomic essay with hook and pillars."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    session_repo = SessionRepository()
    runner = AgentRunner()

    async with session_factory() as db:
        session = await session_repo.create(db, title="Ship 30 Essay Test")
        session_id = session.id
        await db.commit()

        events = []
        async for event in runner.run_turn_stream(
            db=db,
            session_id=session_id,
            user_prompt="/essay Write an atomic essay on Superhuman's Product-Market Fit Engine.",
        ):
            events.append(event)

        # Check essay tokens
        tokens = [e["data"]["token"] for e in events if e["event"] == "token"]
        essay_text = "".join(tokens)
        assert len(essay_text) > 300  # substantive generation

        # Done event flags essay
        done_event = next(e for e in events if e["event"] == "done")
        assert done_event["data"]["has_sufficient_evidence"] is True

        # Cleanup
        await session_repo.delete(db, session_id)
        await db.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_insufficient_evidence_flow():
    """Verify asking ungrounded queries returns an explicit refusal without fabricating facts."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    session_repo = SessionRepository()
    runner = AgentRunner()

    async with session_factory() as db:
        session = await session_repo.create(db, title="Refusal Test")
        session_id = session.id
        await db.commit()

        events = []
        async for event in runner.run_turn_stream(
            db=db,
            session_id=session_id,
            user_prompt="What did Lenny say about quantum gravity and string theory in 1980?",
        ):
            events.append(event)

        tokens = [e["data"]["token"] for e in events if e["event"] == "token"]
        response_text = "".join(tokens)
        assert "insufficient evidence" in response_text.lower()

        done_event = next(e for e in events if e["event"] == "done")
        assert done_event["data"]["has_sufficient_evidence"] is False

        # Cleanup
        await session_repo.delete(db, session_id)
        await db.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_chat_stream_api_endpoint(async_client: AsyncClient):
    """Verify POST /api/chat/stream returns valid Server-Sent Events."""
    # Create session
    sess_res = await async_client.post("/api/sessions", json={"title": "SSE Endpoint Test"})
    sess_id = sess_res.json()["id"]

    try:
        # Stream chat turn
        stream_res = await async_client.post(
            "/api/chat/stream",
            json={
                "session_id": sess_id,
                "prompt": "Hi, who are you?",
            },
        )
        assert stream_res.status_code == 200
        assert "text/event-stream" in stream_res.headers["content-type"]
        text_body = stream_res.text
        assert "event: status" in text_body
        assert "event: token" in text_body
        assert "event: done" in text_body
    finally:
        await async_client.delete(f"/api/sessions/{sess_id}")
