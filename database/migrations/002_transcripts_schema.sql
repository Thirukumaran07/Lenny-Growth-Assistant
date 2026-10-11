-- 002_transcripts_schema.sql: Migration for Ingested Episodes and Vector Chunks

CREATE TABLE IF NOT EXISTS transcript_episodes (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    guest VARCHAR(255) NOT NULL,
    episode_date VARCHAR(64),
    source_url VARCHAR(512) NOT NULL,
    content_hash VARCHAR(64) UNIQUE NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transcript_episodes_guest ON transcript_episodes(guest);
CREATE INDEX IF NOT EXISTS idx_transcript_episodes_hash ON transcript_episodes(content_hash);

CREATE TABLE IF NOT EXISTS transcript_chunks (
    id UUID PRIMARY KEY,
    episode_id UUID NOT NULL REFERENCES transcript_episodes(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    speaker VARCHAR(255) NOT NULL,
    timestamp_mark VARCHAR(64) NOT NULL,
    embedding JSON NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    chunk_hash VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transcript_chunks_episode_id ON transcript_chunks(episode_id);
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_hash ON transcript_chunks(chunk_hash);
