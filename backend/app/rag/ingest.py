"""Idempotent ingestion pipeline for Lenny podcast transcripts."""

import hashlib
import json
from pathlib import Path
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from backend.app.models.transcript import TranscriptEpisodeModel, TranscriptChunkModel
from backend.app.rag.chunker import TranscriptChunker
from backend.app.rag.embedder import OllamaEmbedder

logger = structlog.get_logger()


class TranscriptIngestionEngine:
    """Ingests transcript JSON files idempotently with content hashing and embeddings."""

    def __init__(
        self,
        chunker: TranscriptChunker | None = None,
        embedder: OllamaEmbedder | None = None,
    ):
        self.chunker = chunker or TranscriptChunker()
        self.embedder = embedder or OllamaEmbedder()

    def calculate_file_hash(self, content_str: str) -> str:
        """Compute deterministic SHA-256 hash of file content."""
        return hashlib.sha256(content_str.encode("utf-8")).hexdigest()

    async def ingest_transcript_file(
        self,
        db: AsyncSession,
        file_path: Path | str,
    ) -> tuple[TranscriptEpisodeModel, int, bool]:
        """Ingest a single transcript file idempotently.

        Returns: (episode, chunk_count, was_created)
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Transcript file not found: {path}")

        raw_content = path.read_text(encoding="utf-8")
        data = json.loads(raw_content)

        title = data.get("title", path.stem)
        guest = data.get("guest", "Unknown")
        episode_date = data.get("episode_date")
        source_url = data.get("source_url", f"local://{path.name}")
        segments = data.get("segments", [])

        content_hash = self.calculate_file_hash(raw_content)

        # Check for existing episode by hash (idempotent duplicate detection)
        existing_query = select(TranscriptEpisodeModel).where(
            TranscriptEpisodeModel.content_hash == content_hash
        )
        existing = (await db.execute(existing_query)).scalar_one_or_none()
        if existing:
            # Already ingested, count existing chunks
            chunk_query = select(TranscriptChunkModel).where(
                TranscriptChunkModel.episode_id == existing.id
            )
            chunks = (await db.execute(chunk_query)).scalars().all()
            logger.info("transcript_already_ingested", title=title, guest=guest, hash=content_hash)
            return existing, len(chunks), False

        # Create new episode record
        episode = TranscriptEpisodeModel(
            title=title,
            guest=guest,
            episode_date=episode_date,
            source_url=source_url,
            content_hash=content_hash,
        )
        db.add(episode)
        await db.flush()

        # Generate overlapping semantic chunks
        chunks = self.chunker.chunk_segments(segments)
        logger.info("chunks_generated", count=len(chunks), episode=title)

        # Generate embeddings and persist chunks
        for chunk in chunks:
            embedding_vec = await self.embedder.get_embedding(chunk.content)
            chunk_record = TranscriptChunkModel(
                episode_id=episode.id,
                chunk_index=chunk.index,
                content=chunk.content,
                speaker=chunk.speaker,
                timestamp_mark=chunk.timestamp_mark,
                embedding=embedding_vec,
                token_count=chunk.token_count,
                chunk_hash=chunk.chunk_hash,
            )
            db.add(chunk_record)

        await db.commit()
        await db.refresh(episode)
        logger.info("transcript_ingested_successfully", title=title, chunks=len(chunks))
        return episode, len(chunks), True

    async def ingest_directory(
        self,
        db: AsyncSession,
        dir_path: Path | str,
    ) -> dict[str, Any]:
        """Ingest all JSON files in the specified directory."""
        directory = Path(dir_path)
        if not directory.exists() or not directory.is_dir():
            raise FileNotFoundError(f"Transcript directory not found: {directory}")

        json_files = sorted(list(directory.glob("*.json")))
        results = []
        for file in json_files:
            ep, count, created = await self.ingest_transcript_file(db, file)
            results.append({
                "file": file.name,
                "title": ep.title,
                "guest": ep.guest,
                "chunks": count,
                "created": created,
            })

        return {
            "total_files": len(json_files),
            "ingested": results,
        }
