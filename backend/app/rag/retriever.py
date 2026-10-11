"""Vector retrieval engine with cosine similarity ranking and evidence thresholding."""

import math
import uuid
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.config import get_settings
from backend.app.models.transcript import TranscriptChunkModel, TranscriptEpisodeModel
from backend.app.rag.embedder import OllamaEmbedder


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Compute mathematical cosine similarity between two float vectors."""
    if len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot / (norm1 * norm2)


class RetrievedPassage:
    """Encapsulates a retrieved transcript passage with full source provenance."""

    def __init__(
        self,
        chunk_id: uuid.UUID,
        episode_id: uuid.UUID,
        episode_title: str,
        guest: str,
        source_url: str,
        speaker: str,
        timestamp_mark: str,
        content: str,
        similarity_score: float,
        chunk_index: int,
    ):
        self.chunk_id = chunk_id
        self.episode_id = episode_id
        self.episode_title = episode_title
        self.guest = guest
        self.source_url = source_url
        self.speaker = speaker
        self.timestamp_mark = timestamp_mark
        self.content = content
        self.similarity_score = similarity_score
        self.chunk_index = chunk_index

    def to_citation_dict(self) -> dict[str, Any]:
        """Convert passage into standard citation provenance dictionary."""
        return {
            "chunk_id": str(self.chunk_id),
            "episode_id": str(self.episode_id),
            "episode_title": self.episode_title,
            "guest": self.guest,
            "source_url": self.source_url,
            "speaker": self.speaker,
            "timestamp": self.timestamp_mark,
            "quote": self.content,
            "similarity": round(self.similarity_score, 4),
        }

    def format_citation_tag(self, index: int) -> str:
        """Format an inline verified citation tag string."""
        return f"[{index} {self.guest} - {self.episode_title} - {self.timestamp_mark}]"


class RetrievalResult:
    """Container for retrieval queries indicating evidence status."""

    def __init__(
        self,
        query: str,
        passages: list[RetrievedPassage],
        has_sufficient_evidence: bool,
        insufficient_reason: str | None = None,
    ):
        self.query = query
        self.passages = passages
        self.has_sufficient_evidence = has_sufficient_evidence
        self.insufficient_reason = insufficient_reason

    @property
    def top_score(self) -> float:
        return self.passages[0].similarity_score if self.passages else 0.0


class TranscriptRetriever:
    """Performs semantic similarity retrieval with mathematical ranking and threshold cut-offs."""

    def __init__(
        self,
        embedder: OllamaEmbedder | None = None,
        similarity_threshold: float | None = None,
        top_k: int | None = None,
    ):
        settings = get_settings()
        self.embedder = embedder or OllamaEmbedder()
        self.similarity_threshold = (
            similarity_threshold
            if similarity_threshold is not None
            else settings.SIMILARITY_THRESHOLD
        )
        self.top_k = top_k if top_k is not None else settings.TOP_K_CHUNKS

    async def retrieve(
        self,
        db: AsyncSession,
        query: str,
        top_k: int | None = None,
    ) -> RetrievalResult:
        """Search ingested chunks for passages relevant to query with strict thresholding."""
        cleaned_query = query.strip()
        if not cleaned_query:
            return RetrievalResult(
                query=query,
                passages=[],
                has_sufficient_evidence=False,
                insufficient_reason="Empty search query.",
            )

        k = top_k or self.top_k

        # 1. Generate query embedding vector (768d via nomic-embed-text)
        query_embedding = await self.embedder.get_embedding(cleaned_query)

        # 2. Fetch chunks with eager-loaded episode relations
        query_stmt = (
            select(TranscriptChunkModel)
            .options(selectinload(TranscriptChunkModel.episode))
        )
        result = await db.execute(query_stmt)
        all_chunks = result.scalars().all()

        if not all_chunks:
            return RetrievalResult(
                query=query,
                passages=[],
                has_sufficient_evidence=False,
                insufficient_reason="No transcripts ingested in knowledge corpus.",
            )

        # 3. Compute cosine similarity across all chunk vectors
        scored_passages: list[RetrievedPassage] = []
        for chunk in all_chunks:
            chunk_vec = chunk.embedding
            sim = cosine_similarity(query_embedding, chunk_vec)
            scored_passages.append(
                RetrievedPassage(
                    chunk_id=chunk.id,
                    episode_id=chunk.episode_id,
                    episode_title=chunk.episode.title if chunk.episode else "Unknown Episode",
                    guest=chunk.episode.guest if chunk.episode else "Unknown Guest",
                    source_url=chunk.episode.source_url if chunk.episode else "",
                    speaker=chunk.speaker,
                    timestamp_mark=chunk.timestamp_mark,
                    content=chunk.content,
                    similarity_score=sim,
                    chunk_index=chunk.chunk_index,
                )
            )

        # 4. Sort descending by similarity score
        scored_passages.sort(key=lambda p: p.similarity_score, reverse=True)
        top_passages = scored_passages[:k]

        # 5. Evaluate relevance against threshold
        top_score = top_passages[0].similarity_score if top_passages else 0.0
        if top_score < self.similarity_threshold:
            return RetrievalResult(
                query=query,
                passages=top_passages,
                has_sufficient_evidence=False,
                insufficient_reason=(
                    f"Top similarity score ({top_score:.3f}) is below confidence threshold ({self.similarity_threshold:.3f})."
                ),
            )

        # Filter down to passages exceeding threshold
        valid_passages = [p for p in top_passages if p.similarity_score >= self.similarity_threshold]
        return RetrievalResult(
            query=query,
            passages=valid_passages,
            has_sufficient_evidence=True,
        )
