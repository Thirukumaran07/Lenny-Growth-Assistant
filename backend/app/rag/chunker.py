"""Semantic transcript chunker preserving speaker turns and timestamps."""

import hashlib
import re
from typing import Any


class TranscriptSegment:
    def __init__(self, speaker: str, timestamp: str, text: str):
        self.speaker = speaker.strip()
        self.timestamp = timestamp.strip()
        self.text = text.strip()


class Chunk:
    def __init__(
        self,
        index: int,
        content: str,
        speaker: str,
        timestamp_mark: str,
        token_count: int,
        chunk_hash: str,
    ):
        self.index = index
        self.content = content
        self.speaker = speaker
        self.timestamp_mark = timestamp_mark
        self.token_count = token_count
        self.chunk_hash = chunk_hash


class TranscriptChunker:
    """Chunks transcript segments into overlapping windows preserving speaker provenance."""

    def __init__(self, target_words: int = 150, overlap_words: int = 30):
        self.target_words = target_words
        self.overlap_words = overlap_words

    def _estimate_tokens(self, text: str) -> int:
        words = len(text.split())
        return int(words * 1.3)

    def chunk_segments(self, segments_data: list[dict[str, Any]]) -> list[Chunk]:
        """Convert a list of raw segment dicts into overlapping semantic chunks."""
        if not segments_data:
            return []

        chunks: list[Chunk] = []
        current_words: list[str] = []
        current_speaker: str = segments_data[0].get("speaker", "Unknown")
        current_timestamp: str = segments_data[0].get("timestamp", "00:00")
        chunk_index = 0

        for seg in segments_data:
            speaker = seg.get("speaker", "Unknown")
            timestamp = seg.get("timestamp", "00:00")
            text = seg.get("text", "").strip()
            if not text:
                continue

            # Prefix speaker name in content for retrieval context
            formatted_turn = f"{speaker} [{timestamp}]: {text}"
            words = formatted_turn.split()

            if len(current_words) + len(words) <= self.target_words:
                current_words.extend(words)
                if not current_speaker or current_speaker == "Unknown":
                    current_speaker = speaker
                    current_timestamp = timestamp
            else:
                # Flush current chunk if it has words
                if current_words:
                    content_text = " ".join(current_words)
                    chunk_hash = hashlib.sha256(content_text.encode("utf-8")).hexdigest()
                    chunks.append(
                        Chunk(
                            index=chunk_index,
                            content=content_text,
                            speaker=current_speaker,
                            timestamp_mark=current_timestamp,
                            token_count=self._estimate_tokens(content_text),
                            chunk_hash=chunk_hash,
                        )
                    )
                    chunk_index += 1
                    # Keep overlap words from the end of current chunk
                    current_words = current_words[-self.overlap_words :] if len(current_words) > self.overlap_words else []

                current_words.extend(words)
                current_speaker = speaker
                current_timestamp = timestamp

        # Flush final chunk
        if current_words:
            content_text = " ".join(current_words)
            chunk_hash = hashlib.sha256(content_text.encode("utf-8")).hexdigest()
            chunks.append(
                Chunk(
                    index=chunk_index,
                    content=content_text,
                    speaker=current_speaker,
                    timestamp_mark=current_timestamp,
                    token_count=self._estimate_tokens(content_text),
                    chunk_hash=chunk_hash,
                )
            )

        return chunks
