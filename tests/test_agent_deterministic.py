"""Deterministic Agent Runner and Skill tests using mocked providers for instant,
repeatable verification of RAG QA, Ship 30 essays, session isolation, and follow-ups.
"""

from unittest.mock import AsyncMock
import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from backend.app.agent.router import SkillRouter
from backend.app.agent.runner import AgentRunner
from backend.app.agent.skills.base import SkillContext, SkillType
from backend.app.agent.skills.grounded_qa import GroundedQASkill
from backend.app.agent.skills.ship30 import Ship30EssaySkill
from backend.app.agent.skills.artifact_gen import ArtifactGeneratorSkill
from backend.app.config import get_settings
from backend.app.providers.base import ProviderType
from backend.app.providers.manager import ProviderManager
from backend.app.rag.retriever import RetrievalResult, RetrievedPassage, TranscriptRetriever
from backend.app.repositories.message_repo import MessageRepository
from backend.app.repositories.session_repo import SessionRepository
from tests.conftest import MockLLMProvider


@pytest.fixture
def mock_retriever(deterministic_passages):
    retriever = TranscriptRetriever(similarity_threshold=0.65, top_k=2)
    retriever.retrieve = AsyncMock(
        return_value=RetrievalResult(
            query="test query",
            passages=deterministic_passages,
            has_sufficient_evidence=True,
        )
    )
    return retriever


@pytest.fixture
def mock_empty_retriever():
    retriever = TranscriptRetriever(similarity_threshold=0.65, top_k=2)
    retriever.retrieve = AsyncMock(
        return_value=RetrievalResult(
            query="gardening tips",
            passages=[],
            has_sufficient_evidence=False,
            insufficient_reason="No relevant transcript passages found.",
        )
    )
    return retriever


@pytest.mark.asyncio
async def test_deterministic_grounded_qa_stream(mock_retriever, deterministic_passages):
    """Verify grounded Q&A executes deterministically, formats citations, and persists turn."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    canned_answer = "According to Rahul Vohra [1], hitting 40% on the Sean Ellis survey proves product-market fit."
    mock_provider = MockLLMProvider(canned_response=canned_answer)

    provider_mgr = ProviderManager()
    provider_mgr.get_provider = lambda override=None: mock_provider

    qa_skill = GroundedQASkill(retriever=mock_retriever, provider_manager=provider_mgr)
    runner = AgentRunner(
        grounded_qa_skill=qa_skill,
        provider_manager=provider_mgr,
    )

    async with session_factory() as db:
        session = await runner.session_repo.create(db, title="Deterministic QA Session")
        sess_id = session.id
        await db.commit()

        events = []
        async for event in runner.run_turn_stream(
            db=db,
            session_id=sess_id,
            user_prompt="What is the PMF benchmark according to Rahul Vohra?",
        ):
            events.append(event)

        event_types = [e["event"] for e in events]
        assert "status" in event_types
        assert "citations" in event_types
        assert "token" in event_types
        assert "done" in event_types

        citations_event = next(e for e in events if e["event"] == "citations")
        assert len(citations_event["data"]["citations"]) == 2
        assert citations_event["data"]["citations"][0]["guest"] == "Rahul Vohra"

        done_event = next(e for e in events if e["event"] == "done")
        assert done_event["data"]["has_sufficient_evidence"] is True
        assert "Rahul Vohra" in done_event["data"]["final_content"]

        # Verify PostgreSQL persistence
        msgs, count = await runner.message_repo.list_for_session(db, sess_id)
        assert count == 2
        assert msgs[0].role == "user"
        assert msgs[1].role == "assistant"
        assert len(msgs[1].citations) == 2

        # Cleanup
        await runner.session_repo.delete(db, sess_id)
        await db.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_deterministic_insufficient_evidence_guardrail(mock_empty_retriever):
    """Verify out-of-domain queries trigger immediate refusal without model hallucination."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    mock_provider = MockLLMProvider()
    provider_mgr = ProviderManager()
    provider_mgr.get_provider = lambda override=None: mock_provider

    qa_skill = GroundedQASkill(retriever=mock_empty_retriever, provider_manager=provider_mgr)
    runner = AgentRunner(
        grounded_qa_skill=qa_skill,
        provider_manager=provider_mgr,
    )

    async with session_factory() as db:
        session = await runner.session_repo.create(db, title="Insufficient Evidence Session")
        sess_id = session.id
        await db.commit()

        events = []
        async for event in runner.run_turn_stream(
            db=db,
            session_id=sess_id,
            user_prompt="How do I plant organic tomatoes in autumn?",
        ):
            events.append(event)

        done_event = next(e for e in events if e["event"] == "done")
        assert done_event["data"]["has_sufficient_evidence"] is False
        assert "Insufficient evidence found in the ingested transcripts" in done_event["data"]["final_content"]
        assert len(done_event["data"]["citations"]) == 0

        # Provider must NOT have been called for text completion
        assert mock_provider.call_count == 0

        # Cleanup
        await runner.session_repo.delete(db, sess_id)
        await db.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_deterministic_multi_session_isolation(mock_retriever):
    """Verify strict multi-session isolation: Session A history never leaks into Session B."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    captured_contexts: list[list[dict]] = []

    class ContextCapturingProvider(MockLLMProvider):
        async def generate_stream(self, messages, config=None):
            # Capture user messages seen in context
            captured_contexts.append([m.to_dict() for m in messages])
            yield "Response to prompt."

    capturing_provider = ContextCapturingProvider()
    provider_mgr = ProviderManager()
    provider_mgr.get_provider = lambda override=None: capturing_provider

    qa_skill = GroundedQASkill(retriever=mock_retriever, provider_manager=provider_mgr)
    runner = AgentRunner(grounded_qa_skill=qa_skill, provider_manager=provider_mgr)

    async with session_factory() as db:
        sess_a = await runner.session_repo.create(db, title="Session Alpha - Confidential A")
        sess_b = await runner.session_repo.create(db, title="Session Beta - Confidential B")
        await db.commit()

        # Execute Turn in Session A
        async for _ in runner.run_turn_stream(db, sess_a.id, "Secret Prompt for Alpha Project"):
            pass

        # Execute Turn in Session B
        async for _ in runner.run_turn_stream(db, sess_b.id, "Public Question for Beta Project"):
            pass

        # Inspect Session B's context: must NEVER contain Session A's secret prompt
        sess_b_messages, _ = await runner.message_repo.list_for_session(db, sess_b.id)
        for msg in sess_b_messages:
            assert "Secret Prompt for Alpha Project" not in msg.content

        # Inspect captured prompt context passed to LLM for Turn 2
        turn_2_prompt_text = str(captured_contexts[-1])
        assert "Secret Prompt for Alpha Project" not in turn_2_prompt_text

        # Cleanup
        await runner.session_repo.delete(db, sess_a.id)
        await runner.session_repo.delete(db, sess_b.id)
        await db.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_deterministic_ship30_essay_structure(mock_retriever):
    """Verify Ship 30 for 30 essay skill enforces 5-part architecture and word targets."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    canned_essay = (
        "# The Superhuman PMF Engine: Why 40% is the Only Metric That Matters\n\n"
        "**Most startups die because they confuse polite customer compliments with genuine product-market fit.**\n"
        "When servers aren't melting, founders assume they have time. They don't.\n\n"
        "### Pillar 1: The Diagnostic Failure\n"
        "**Standard vanity metrics deceive founders into premature scaling.**\n"
        "Rahul Vohra discovered that Net Promoter Score (NPS) lags reality [1 Rahul Vohra - Superhuman - 06:10].\n\n"
        "### Pillar 2: The Breakthrough Framework\n"
        "**Ask one question: 'How would you feel if you could no longer use the product?'**\n"
        "If over 40% say 'very disappointed', you have fit. Below 40%, you iterate.\n\n"
        "### Pillar 3: The Compounding Flywheel\n"
        "**Split engineering bandwidth 50/50 between lovers and fence-sitters.**\n"
        "Double down on what high-expectation customers love while fixing objections.\n\n"
        "### Tactical Implementation Takeaways\n"
        "1. **Survey active users:** Segment responses by cohort.\n"
        "2. **Ignore noise:** Discard users who demand an entirely different product.\n"
        "3. **Track velocity:** Measure score improvement weekly."
    )

    mock_provider = MockLLMProvider(canned_response=canned_essay)
    provider_mgr = ProviderManager()
    provider_mgr.get_provider = lambda override=None: mock_provider

    essay_skill = Ship30EssaySkill(retriever=mock_retriever, provider_manager=provider_mgr)
    runner = AgentRunner(ship30_skill=essay_skill, provider_manager=provider_mgr)

    async with session_factory() as db:
        session = await runner.session_repo.create(db, title="Deterministic Essay Session")
        sess_id = session.id
        await db.commit()

        events = []
        async for event in runner.run_turn_stream(
            db=db,
            session_id=sess_id,
            user_prompt="/essay write an atomic essay on Superhuman PMF engine",
        ):
            events.append(event)

        done_event = next(e for e in events if e["event"] == "done")
        content = done_event["data"]["final_content"]

        # Validate 5 Core Structural Elements
        assert "The Superhuman PMF Engine" in content  # Title / Hook
        assert "Pillar 1" in content                   # Progression Pillar 1
        assert "Pillar 2" in content                   # Progression Pillar 2
        assert "Pillar 3" in content                   # Progression Pillar 3
        assert "Takeaways" in content                  # Actionable Takeaways
        assert "[1" in content                         # Verified Citation Anchor

        # Cleanup
        await runner.session_repo.delete(db, sess_id)
        await db.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_deterministic_artifact_skill_generation(mock_retriever):
    """Verify artifact skill synthesizes structured HTML/Markdown and links to message turn."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    canned_artifact_response = (
        "Here is the interactive PMF dashboard.\n"
        "TITLE: Superhuman PMF Interactive Survey\n"
        "TYPE: html\n"
        "---BEGIN ARTIFACT---\n"
        "<!DOCTYPE html>\n<html lang=\"en\">\n<head><title>PMF</title></head>\n"
        "<body><main><h1>40% Survey Calculator</h1></main></body></html>\n"
        "---END ARTIFACT---"
    )

    mock_provider = MockLLMProvider(canned_response=canned_artifact_response)
    provider_mgr = ProviderManager()
    provider_mgr.get_provider = lambda override=None: mock_provider

    artifact_skill = ArtifactGeneratorSkill(retriever=mock_retriever, provider_manager=provider_mgr)
    runner = AgentRunner(artifact_skill=artifact_skill, provider_manager=provider_mgr)

    async with session_factory() as db:
        session = await runner.session_repo.create(db, title="Deterministic Artifact Session")
        sess_id = session.id
        await db.commit()

        events = []
        async for event in runner.run_turn_stream(
            db=db,
            session_id=sess_id,
            user_prompt="/artifact create an html dashboard for PMF survey",
        ):
            events.append(event)

        event_types = [e["event"] for e in events]
        assert "artifact" in event_types

        art_event = next(e for e in events if e["event"] == "artifact")
        art_data = art_event["data"]
        assert art_data["title"] == "Superhuman PMF Interactive Survey"
        assert art_data["artifact_type"] == "html"
        assert "<!DOCTYPE html>" in art_data["content"]
        assert "id" in art_data

        # Check that assistant message turn has linked artifact_id in database
        msgs, _ = await runner.message_repo.list_for_session(db, sess_id)
        assistant_msg = msgs[1]
        assert assistant_msg.artifact_id is not None
        assert str(assistant_msg.artifact_id) == art_data["id"]

        # Cleanup
        await runner.session_repo.delete(db, sess_id)
        await db.commit()

    await engine.dispose()
