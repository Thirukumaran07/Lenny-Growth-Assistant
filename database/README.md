# Database Schema & Migrations

This directory stores database initialization scripts, schemas, and migrations for PostgreSQL with `pgvector`.

## Schema Overview
- `sessions`: Persistent conversation sessions with timestamps and metadata.
- `messages`: Chronological conversation turns (user, assistant, system) with citation payloads and linked artifact references.
- `artifacts`: Generated HTML/CSS or Markdown documents.
- `transcript_episodes`: Ingested Lenny's podcast episodes metadata.
- `transcript_chunks`: Chunked transcripts with 768-dimensional `nomic-embed-text` vectors.

## Migration Tooling
- Initial baseline script: `database/migrations/001_initial_schema.sql` (to be created in Phase 4).
