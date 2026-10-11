"""Unit and integration tests for Phase 9: Artifact Schemas, Repository,
REST Endpoints, Skill Routing, and Security Payload Validation.
"""

import uuid
import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from backend.app.agent.router import SkillRouter
from backend.app.agent.skills.base import SkillContext, SkillType
from backend.app.agent.skills.artifact_gen import ArtifactGeneratorSkill
from backend.app.config import get_settings
from backend.app.repositories.artifact_repo import ArtifactRepository
from backend.app.repositories.session_repo import SessionRepository
from backend.app.schemas.artifact import (
    ArtifactCreate,
    ArtifactResponse,
    MAX_ARTIFACT_CONTENT_BYTES,
)


# ─── 1. Schema Validation Tests ──────────────────────────────────────────────

def test_artifact_schema_valid_html_and_markdown():
    """Verify that both HTML and Markdown artifact schemas pass validation."""
    sess_id = uuid.uuid4()

    html_art = ArtifactCreate(
        session_id=sess_id,
        title="Superhuman PMF Framework",
        artifact_type="html",
        content="<!DOCTYPE html><html><body><h1>Framework</h1></body></html>",
    )
    assert html_art.artifact_type == "html"
    assert html_art.title == "Superhuman PMF Framework"

    md_art = ArtifactCreate(
        session_id=sess_id,
        title="Retention Checklist",
        artifact_type="markdown",
        content="# Checklist\n- Step 1\n- Step 2",
    )
    assert md_art.artifact_type == "markdown"


def test_artifact_schema_rejects_unsupported_types():
    """Verify that unsupported artifact types (e.g. javascript, python) are rejected."""
    sess_id = uuid.uuid4()

    for invalid_type in ["javascript", "python", "sh", "exe", "css"]:
        with pytest.raises(ValidationError) as exc_info:
            ArtifactCreate(
                session_id=sess_id,
                title="Invalid Script",
                artifact_type=invalid_type,
                content="console.log('malicious');",
            )
        assert "Unsupported artifact type" in str(exc_info.value)


def test_artifact_schema_rejects_empty_title():
    """Verify that empty or whitespace-only titles are rejected."""
    sess_id = uuid.uuid4()

    with pytest.raises(ValidationError):
        ArtifactCreate(
            session_id=sess_id,
            title="   ",
            artifact_type="html",
            content="<p>Test</p>",
        )


def test_artifact_schema_rejects_oversized_payloads():
    """Verify that payloads exceeding 500 KB limit are strictly rejected."""
    sess_id = uuid.uuid4()
    oversized_content = "A" * (MAX_ARTIFACT_CONTENT_BYTES + 100)

    with pytest.raises(ValidationError) as exc_info:
        ArtifactCreate(
            session_id=sess_id,
            title="Massive Payload",
            artifact_type="html",
            content=oversized_content,
        )
    assert "exceeds maximum allowable limit" in str(exc_info.value)


# ─── 2. Skill Router Tests ───────────────────────────────────────────────────

def test_skill_router_artifact_classification():
    """Verify that prompt variations for artifacts are deterministically routed."""
    router = SkillRouter()

    assert router.route("/artifact create a dashboard") == SkillType.ARTIFACT_GENERATOR
    assert router.route("/generate-artifact for PMF") == SkillType.ARTIFACT_GENERATOR
    assert router.route("Generate an artifact for retention cohorts") == SkillType.ARTIFACT_GENERATOR
    assert router.route("Create an HTML artifact showing activation funnel") == SkillType.ARTIFACT_GENERATOR
    assert router.route("Build an interactive dashboard in html") == SkillType.ARTIFACT_GENERATOR
    assert router.route("Create a markdown document with the framework") == SkillType.ARTIFACT_GENERATOR


# ─── 3. Repository CRUD & Size Enforcement Tests ─────────────────────────────

@pytest.mark.asyncio
async def test_artifact_repository_crud():
    """Verify database CRUD operations, ordering, and cascade isolation."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    session_repo = SessionRepository()
    artifact_repo = ArtifactRepository()

    async with session_factory() as db:
        # Create session
        session = await session_repo.create(db, title="Artifact Repo Test Session")
        sess_id = session.id
        await db.commit()

        # Create artifact
        created = await artifact_repo.create(
            db=db,
            session_id=sess_id,
            title="Superhuman Engine",
            artifact_type="html",
            content="<!DOCTYPE html><html><body>Engine</body></html>",
        )
        await db.commit()

        assert created.id is not None
        assert created.session_id == sess_id
        assert created.title == "Superhuman Engine"
        assert created.artifact_type == "html"

        # Read artifact
        fetched = await artifact_repo.get_by_id(db, created.id)
        assert fetched is not None
        assert fetched.id == created.id
        assert fetched.content == created.content

        # List session artifacts
        artifacts, count = await artifact_repo.list_for_session(db, sess_id)
        assert count == 1
        assert len(artifacts) == 1
        assert artifacts[0].id == created.id

        # Delete artifact
        deleted = await artifact_repo.delete(db, created.id)
        assert deleted is True
        await db.commit()

        # Verify deletion
        refetched = await artifact_repo.get_by_id(db, created.id)
        assert refetched is None

        # Cleanup session
        await session_repo.delete(db, sess_id)
        await db.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_artifact_repository_blocks_oversized_content():
    """Verify repository enforces payload size ceiling and raises ValueError."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    session_repo = SessionRepository()
    artifact_repo = ArtifactRepository()

    async with session_factory() as db:
        session = await session_repo.create(db, title="Oversized Repo Test")
        sess_id = session.id
        await db.commit()

        oversized_text = "X" * (MAX_ARTIFACT_CONTENT_BYTES + 500)

        with pytest.raises(ValueError) as exc:
            await artifact_repo.create(
                db=db,
                session_id=sess_id,
                title="Too Big",
                artifact_type="html",
                content=oversized_text,
            )
        assert "exceeds maximum size" in str(exc.value)

        # Cleanup
        await session_repo.delete(db, sess_id)
        await db.commit()

    await engine.dispose()


# ─── 4. REST API Endpoints Integration Tests ─────────────────────────────────

@pytest.mark.asyncio
async def test_artifact_endpoints_lifecycle(async_client):
    """Verify REST API contracts for creating, listing, fetching, and deleting artifacts."""
    # 1. Create a parent session
    session_res = await async_client.post("/api/sessions", json={"title": "Artifact API Test"})
    assert session_res.status_code == 201
    session_id = session_res.json()["id"]

    try:
        # 2. POST /api/artifacts (valid HTML)
        create_payload = {
            "session_id": session_id,
            "title": "Interactive PMF Engine",
            "artifact_type": "html",
            "content": "<!DOCTYPE html><html><body><h1>Survey</h1></body></html>",
        }
        post_res = await async_client.post("/api/artifacts", json=create_payload)
        assert post_res.status_code == 201
        data = post_res.json()
        artifact_id = data["id"]
        assert data["title"] == "Interactive PMF Engine"
        assert data["artifact_type"] == "html"
        assert data["session_id"] == session_id
        assert "created_at" in data

        # 3. GET /api/artifacts/{id}
        get_res = await async_client.get(f"/api/artifacts/{artifact_id}")
        assert get_res.status_code == 200
        fetched = get_res.json()
        assert fetched["id"] == artifact_id
        assert fetched["content"] == create_payload["content"]

        # 4. GET /api/sessions/{session_id}/artifacts
        list_res = await async_client.get(f"/api/sessions/{session_id}/artifacts")
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) == 1
        assert items[0]["id"] == artifact_id

        # 5. POST with invalid type (rejected with 422)
        invalid_type_res = await async_client.post(
            "/api/artifacts",
            json={
                "session_id": session_id,
                "title": "Invalid Script",
                "artifact_type": "malicious_script",
                "content": "alert(1)",
            },
        )
        assert invalid_type_res.status_code == 422

        # 6. POST with non-existent session (rejected with 404)
        non_existent_sess = str(uuid.uuid4())
        not_found_sess_res = await async_client.post(
            "/api/artifacts",
            json={
                "session_id": non_existent_sess,
                "title": "Ghost Artifact",
                "artifact_type": "html",
                "content": "<p>Ghost</p>",
            },
        )
        assert not_found_sess_res.status_code == 404

        # 7. DELETE /api/artifacts/{id}
        del_res = await async_client.delete(f"/api/artifacts/{artifact_id}")
        assert del_res.status_code == 204

        # Verify 404 after deletion
        get_del_res = await async_client.get(f"/api/artifacts/{artifact_id}")
        assert get_del_res.status_code == 404

    finally:
        # Cleanup session
        await async_client.delete(f"/api/sessions/{session_id}")


# ─── 5. Artifact Generator Skill Streaming Test ──────────────────────────────

@pytest.mark.asyncio
@pytest.mark.requires_postgres
@pytest.mark.requires_ollama
async def test_artifact_generator_skill_streaming():
    """Verify that ArtifactGeneratorSkill synthesizes and persists artifact record."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    session_repo = SessionRepository()
    skill = ArtifactGeneratorSkill()

    async with session_factory() as db:
        session = await session_repo.create(db, title="Skill Generation Test")
        sess_id = session.id
        await db.commit()

        context = SkillContext(
            session_id=str(sess_id),
            user_prompt="Create an interactive HTML framework for the Superhuman PMF engine survey.",
            history_messages=[
                {"role": "user", "content": "How did Superhuman measure PMF?"},
                {"role": "assistant", "content": "Rahul Vohra used the Sean Ellis survey question."},
            ],
        )

        events = []
        async for event in skill.execute_stream(context, db):
            events.append(event)

        event_names = [e["event"] for e in events]
        assert "status" in event_names
        assert "artifact" in event_names
        assert "done" in event_names

        # Check artifact event structure
        art_event = next(e for e in events if e["event"] == "artifact")
        art_data = art_event["data"]
        assert art_data["session_id"] == str(sess_id)
        assert art_data["artifact_type"] == "html"
        assert len(art_data["content"]) > 0
        assert "id" in art_data

        # Cleanup
        await session_repo.delete(db, sess_id)
        await db.commit()

    await engine.dispose()
