"""Unit and integration tests for transcript ingestion, chunking, idempotency,
duplicate detection, and similarity calculations.
"""

from pathlib import Path
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from backend.app.config import get_settings
from backend.app.rag.chunker import TranscriptChunker
from backend.app.rag.ingest import TranscriptIngestionEngine
from backend.app.rag.retriever import cosine_similarity
from tests.conftest import MockEmbedder


def test_chunker_speaker_boundaries_and_token_counts():
    """Verify chunker respects speaker boundaries and generates non-empty token counts."""
    chunker = TranscriptChunker(target_words=40, overlap_words=8)
    segments = [
        {"speaker": "Lenny", "timestamp": "00:10", "text": "Welcome to Lenny's Podcast. Today we are talking with Elena Verna."},
        {"speaker": "Elena", "timestamp": "00:25", "text": "Product-led growth is an end-to-end organizational model where the product drives acquisition and retention."},
        {"speaker": "Elena", "timestamp": "00:50", "text": "If you don't have natural viral loops, throwing paid ads at your top of funnel will only mask poor retention."},
    ]

    chunks = chunker.chunk_segments(segments)
    assert len(chunks) >= 1
    for chunk in chunks:
        assert chunk.speaker in ["Lenny", "Elena"]
        assert chunk.token_count > 0
        assert len(chunk.chunk_hash) == 64
        assert chunk.timestamp_mark in ["00:10", "00:25", "00:50"]


def test_cosine_similarity_edge_cases():
    """Verify cosine similarity mathematical boundary behavior."""
    # Zero vectors
    assert cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0
    assert cosine_similarity([0.0, 0.0], [0.0, 0.0]) == 0.0
    # Mismatched lengths
    assert cosine_similarity([1.0], [1.0, 2.0]) == 0.0
    # Proportional vectors
    assert abs(cosine_similarity([1.0, 2.0, 3.0], [2.0, 4.0, 6.0]) - 1.0) < 1e-6


@pytest.mark.asyncio
async def test_idempotent_ingestion_duplicate_detection(mock_embedder):
    """Verify that re-ingesting an existing transcript file is idempotent and creates 0 duplicates."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    transcript_path = Path("data/transcripts/gustaf_alstromer.json")
    assert transcript_path.exists()

    ingestion_engine = TranscriptIngestionEngine(embedder=mock_embedder)

    async with session_factory() as db:
        # Run 1: Ingest transcript
        ep1, chunks1, created1 = await ingestion_engine.ingest_transcript_file(db, transcript_path)
        await db.commit()

        # Run 2: Re-ingest exact same file
        ep2, chunks2, created2 = await ingestion_engine.ingest_transcript_file(db, transcript_path)

        # Idempotency assertions
        assert ep1.id == ep2.id
        assert chunks1 == chunks2
        assert created2 is False  # Duplicate detected, was_created must be False

    await engine.dispose()
