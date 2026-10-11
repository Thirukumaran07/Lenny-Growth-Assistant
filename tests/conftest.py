"""Pytest configuration and shared fixtures with isolated test DB session management,
deterministic mocked LLM providers, and simulated failure fixtures.
"""

from collections.abc import AsyncGenerator
import hashlib
from typing import Any
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.app.config import get_settings
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.providers.base import (
    ChatMessage,
    GenerationConfig,
    LLMProvider,
    ProviderHealth,
    ProviderType,
)
from backend.app.rag.retriever import RetrievedPassage


# ─── Deterministic Mock LLM Provider ──────────────────────────────────────────

class MockLLMProvider(LLMProvider):
    """Deterministic, zero-latency LLM provider for rapid, reproducible tests."""

    def __init__(
        self,
        canned_response: str = "This is a deterministic test response.",
        should_fail_connection: bool = False,
        should_timeout: bool = False,
        should_fail_model: bool = False,
    ):
        self.canned_response = canned_response
        self.should_fail_connection = should_fail_connection
        self.should_timeout = should_timeout
        self.should_fail_model = should_fail_model
        self.call_count = 0
        self.last_messages: list[ChatMessage] = []

    def provider_type(self) -> ProviderType:
        return ProviderType.LOCAL_OLLAMA

    def active_model(self) -> str:
        return "mock-deterministic-3b"

    async def check_health(self) -> ProviderHealth:
        return ProviderHealth(
            provider="mock",
            is_healthy=not self.should_fail_connection,
            model="mock-deterministic-3b",
            status_message="Healthy",
            installed_models=["mock-deterministic-3b"],
        )

    async def generate_completion(
        self,
        messages: list[ChatMessage],
        config: GenerationConfig | None = None,
    ) -> str:
        self.call_count += 1
        self.last_messages = messages
        if self.should_fail_connection:
            from backend.app.providers.base import ProviderConnectionError
            raise ProviderConnectionError("Cannot connect to mock daemon", "mock")
        if self.should_timeout:
            from backend.app.providers.base import ProviderTimeoutError
            raise ProviderTimeoutError("Mock timeout exceeded", "mock")
        if self.should_fail_model:
            from backend.app.providers.base import ModelNotFoundError
            raise ModelNotFoundError("Mock model not found", "mock")
        return self.canned_response

    async def generate_stream(
        self,
        messages: list[ChatMessage],
        config: GenerationConfig | None = None,
    ) -> AsyncGenerator[str, None]:
        self.call_count += 1
        self.last_messages = messages
        if self.should_fail_connection:
            from backend.app.providers.base import ProviderConnectionError
            raise ProviderConnectionError("Cannot connect to mock daemon", "mock")
        if self.should_timeout:
            from backend.app.providers.base import ProviderTimeoutError
            raise ProviderTimeoutError("Mock timeout exceeded", "mock")
        if self.should_fail_model:
            from backend.app.providers.base import ModelNotFoundError
            raise ModelNotFoundError("Mock model not found", "mock")

        # Yield tokens word by word
        words = self.canned_response.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")


# ─── Deterministic Mock Embedder ─────────────────────────────────────────────

class MockEmbedder:
    """Produces deterministic 768-dimensional float embeddings using SHA-256."""

    async def get_embedding(self, text: str) -> list[float]:
        # Hash text to generate repeatable 768 float values
        base_hash = hashlib.sha256(text.encode("utf-8")).digest()
        vector = []
        for i in range(768):
            byte_val = base_hash[i % len(base_hash)]
            vector.append((byte_val / 255.0) * 2.0 - 1.0)
        # Normalize
        norm = sum(x * x for x in vector) ** 0.5
        return [x / norm for x in vector]


# ─── Shared Fixtures ─────────────────────────────────────────────────────────

@pytest.fixture
def mock_llm_provider():
    return MockLLMProvider()


@pytest.fixture
def mock_embedder():
    return MockEmbedder()


@pytest.fixture
def deterministic_passages() -> list[RetrievedPassage]:
    import uuid
    return [
        RetrievedPassage(
            chunk_id=uuid.uuid4(),
            episode_id=uuid.uuid4(),
            episode_title="How Superhuman Built an Engine to Find PMF",
            guest="Rahul Vohra",
            source_url="https://www.lennyspodcast.com/superhuman-pmf",
            speaker="Rahul Vohra",
            timestamp_mark="06:10",
            content="Sean Ellis found that the magic threshold is 40%. Companies with strong traction exceed 40%.",
            similarity_score=0.88,
            chunk_index=1,
        ),
        RetrievedPassage(
            chunk_id=uuid.uuid4(),
            episode_id=uuid.uuid4(),
            episode_title="Product-Led Growth & Retention Loops",
            guest="Elena Verna",
            source_url="https://www.lennyspodcast.com/elena-verna-plg",
            speaker="Elena Verna",
            timestamp_mark="14:20",
            content="B2B PLG companies should measure activation loops before optimizing acquisition spend.",
            similarity_score=0.74,
            chunk_index=2,
        ),
    ]


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Provide an async test client with an isolated NullPool database session."""
    settings = get_settings()
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with test_session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    app.dependency_overrides.clear()
    await test_engine.dispose()
