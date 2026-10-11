"""CLI script to ingest Lenny's podcast transcript fixtures into PostgreSQL."""

import asyncio
import sys
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.app.config import get_settings
from backend.app.rag.ingest import TranscriptIngestionEngine


async def main():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    transcripts_dir = Path("data/transcripts")
    if not transcripts_dir.exists():
        print(f"Error: Directory {transcripts_dir} does not exist.")
        sys.exit(1)

    print(f"Starting ingestion from: {transcripts_dir.resolve()}")
    engine_rag = TranscriptIngestionEngine()

    async with session_factory() as db:
        result = await engine_rag.ingest_directory(db, transcripts_dir)
        print("\n=== Ingestion Complete ===")
        print(f"Total Files Processed: {result['total_files']}")
        for item in result["ingested"]:
            status = "Created" if item["created"] else "Already Exists"
            print(f"- [{status}] {item['guest']} - {item['title']} ({item['chunks']} chunks)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
