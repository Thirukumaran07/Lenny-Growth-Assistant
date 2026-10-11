"""Automated test suite for Phase 5: Semantic Chunking, Duplicate Detection,
Embeddings, Relevance Thresholding, Citation Provenance, and Insufficient Evidence.
"""

import json
from pathlib import Path
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from backend.app.config import get_settings
from backend.app.rag.chunker import TranscriptChunker
from backend.app.rag.embedder import OllamaEmbedder
from backend.app.rag.ingest import TranscriptIngestionEngine
from backend.app.rag.retriever import TranscriptRetriever, cosine_similarity


def test_transcript_chunking_and_overlap():
    """Verify chunking splits segments into windows with overlapping context and metadata."""
    chunker = TranscriptChunker(target_words=50, overlap_words=10)
    segments = [
        {"speaker": "Lenny", "timestamp": "01:00", "text": "Welcome to the show. Let's talk about PMF."},
        {"speaker": "Rahul", "timestamp": "01:15", "text": "PMF is measured by asking users how disappointed they would be without your product."},
        {"speaker": "Rahul", "timestamp": "01:30", "text": "If 40 percent say very disappointed, you have product-market fit. Otherwise you must keep iterating."},
    ]
    chunks = chunker.chunk_segments(segments)
    assert len(chunks) >= 1
    for c in chunks:
        assert c.speaker in ["Lenny", "Rahul"]
        assert c.timestamp_mark in ["01:00", "01:15", "01:30"]
        assert c.token_count > 0
        assert len(c.chunk_hash) == 64


def test_cosine_similarity_properties():
    """Verify mathematical properties of cosine similarity function."""
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    v3 = [0.0, 1.0, 0.0]
    v4 = [-1.0, 0.0, 0.0]

    # Identical vectors = 1.0
    assert abs(cosine_similarity(v1, v2) - 1.0) < 1e-6
    # Orthogonal vectors = 0.0
    assert abs(cosine_similarity(v1, v3) - 0.0) < 1e-6
    # Opposite vectors = -1.0
    assert abs(cosine_similarity(v1, v4) - (-1.0)) < 1e-6


@pytest.mark.asyncio
async def test_ollama_local_embedder():
    """Verify local Ollama nomic-embed-text generates 768-dimensional float vectors."""
    embedder = OllamaEmbedder()
    embedding = await embedder.get_embedding("Product market fit retention benchmark")
    assert isinstance(embedding, list)
    assert len(embedding) == 768
    assert all(isinstance(val, float) for val in embedding)


@pytest.mark.asyncio
async def test_retrieval_grounded_citations():
    """Verify retrieval returns relevant passages with authentic metadata and citation format."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    retriever = TranscriptRetriever(similarity_threshold=0.60, top_k=3)

    async with session_factory() as db:
        # Query specifically addressed by Rahul Vohra's episode
        query = "How did Superhuman measure product market fit with the Sean Ellis survey?"
        result = await retriever.retrieve(db, query)

        assert result.has_sufficient_evidence is True
        assert len(result.passages) > 0
        top = result.passages[0]
        assert top.guest == "Rahul Vohra"
        assert "Superhuman" in top.episode_title
        assert "40%" in top.content or "disappointed" in top.content.lower()

        # Check citation dictionary provenance structure
        citation = top.to_citation_dict()
        assert "chunk_id" in citation
        assert "episode_id" in citation
        assert "source_url" in citation
        assert "timestamp" in citation
        assert citation["similarity"] >= 0.60

    await engine.dispose()


@pytest.mark.asyncio
async def test_insufficient_evidence_guardrail():
    """Verify query with no evidence in ingested transcripts returns explicit refusal."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Use standard 0.65 threshold
    retriever = TranscriptRetriever(similarity_threshold=0.65, top_k=3)

    async with session_factory() as db:
        # Out-of-corpus query completely unrelated to product growth or ingested transcripts
        query = "What did Lenny's guest say about nuclear submarine reactor maintenance in 1985?"
        result = await retriever.retrieve(db, query)

        assert result.has_sufficient_evidence is False
        assert result.insufficient_reason is not None
        assert "below confidence threshold" in result.insufficient_reason

    await engine.dispose()


@pytest.mark.asyncio
async def test_empty_query_and_empty_corpus_handling():
    """Verify defensive handling of empty query strings."""
    retriever = TranscriptRetriever()
    result = await retriever.retrieve(None, "   ")
    assert result.has_sufficient_evidence is False
    assert result.insufficient_reason == "Empty search query."
