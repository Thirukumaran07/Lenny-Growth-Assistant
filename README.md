# The Lenny Growth Assistant

A local-first conversational AI workbench and knowledge retrieval engine grounded exclusively in **Lenny's Podcast** archives. Built with **FastAPI (Python 3.12)**, **React (TypeScript, Vite)**, **PostgreSQL 16 with pgvector**, and **host-native Ollama** (`llama3.2:3b`, `nomic-embed-text`).

---

## 1. Architecture Overview

The Lenny Growth Assistant operates as a decoupled client-server application engineered for complete privacy and local execution on resource-constrained hardware (e.g., dual-core Intel MacBook Air with 8 GB RAM).

```
                      ┌──────────────────────────────────────────────┐
                      │        React 18 + Vite + TypeScript          │
                      │ ──────────────────────────────────────────── │
                      │  • Sidebar: Session Search, Rename & Delete  │
                      │  • Chat: Streaming Markdown, Source Badges   │
                      │  • Sandboxed Viewer: Secure Iframe (CSP)     │
                      │  • Model Diagnostics & Switcher Toolbar      │
                      └──────────────────────┬───────────────────────┘
                                             │ HTTP / SSE (/api)
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │              FastAPI Backend                 │
                      │ ──────────────────────────────────────────── │
                      │  • Correlation ID Middleware (X-Request-ID)  │
                      │  • Structured Logging & Prompt Redaction     │
                      │  • Agent Runner & Deterministic Skill Router │
                      └───────┬──────────────┬──────────────┬────────┘
                              │              │              │
             ┌────────────────┘              │              └──────────────┐
             ▼                               ▼                             ▼
┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
│       Agent Skills        │  │     RAG Retrieval Engine  │  │   LLM Provider Manager    │
│ ───────────────────────── │  │ ───────────────────────── │  │ ───────────────────────── │
│ • Grounded Q&A            │  │ • 400-600 token chunking  │  │ • Local Ollama (default)  │
│ • Ship 30 for 30 Essay    │  │ • 768d dense embeddings   │  │ • Cloud Adapter (OpenAI)  │
│ • Artifact Generator      │  │ • Cosine similarity search│  │ • Privacy Guardrail (401) │
│ • Direct Conversation     │  │ • Insufficient evidence   │  │ • Timeout handling (504)  │
└───────────────────────────┘  └─────────────┬─────────────┘  └─────────────┬─────────────┘
                                             │                              │
                                             ▼                              ▼
                               ┌───────────────────────────┐  ┌───────────────────────────┐
                               │   PostgreSQL + pgvector   │  │    Host-Native Ollama     │
                               │ ───────────────────────── │  │ ───────────────────────── │
                               │ • Sessions, Messages      │  │ • llama3.2:3b             │
                               │ • Artifacts               │  │ • nomic-embed-text        │
                               │ • Transcript chunks & vec │  │ • HTTP on localhost:11434 │
                               └───────────────────────────┘  └───────────────────────────┘
```

---

## 2. Prerequisites & Hardware Requirements

### Minimum Hardware Profile
- **Target Machine:** Intel MacBook Air (1.1 GHz Dual-Core Intel Core i5, 8 GB 3733 MHz LPDDR4X) or Apple Silicon / Linux equivalent.
- **RAM Requirement:** 8 GB total system RAM. Local inference requires ~2.0 GB RAM for `llama3.2:3b` (Q4_K_M) and ~300 MB for `nomic-embed-text`.
- **Disk Space:** ~5 GB free space for Docker images, dependencies, and Ollama model weights.

### System Software
- **Python:** 3.12 or newer
- **Node.js:** 20.x or newer (with npm 10+)
- **Ollama:** 0.3.0 or newer (installed natively on host)
- **Docker & Docker Compose:** Optional for containerized deployment, or native PostgreSQL 16 with `pgvector`

---

## 3. Host-Based Ollama Setup (Intel MacBook Air)

> [!IMPORTANT]
> **Why Ollama runs natively on the host instead of inside Docker:**
> On Intel Mac hardware, running LLMs inside Docker incurs severe virtualization overhead and cannot utilize native macOS memory optimizations. Running Ollama natively on macOS host provides direct CPU thread scheduling, fast memory mapping, and zero container virtualization penalty. Both native local processes and Docker Compose containers connect to the host-native Ollama daemon.

### Step 1: Install Ollama
Download and install Ollama from [ollama.com](https://ollama.com) or via Homebrew:
```bash
brew install ollama
```

### Step 2: Configure Ollama to Listen Across Docker Networks
By default, Ollama only listens on `127.0.0.1`. If you use Docker Compose, configure Ollama to accept connections from Docker's virtual gateway (`host.docker.internal`):
```bash
# Set OLLAMA_HOST and launch daemon
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_NUM_PARALLEL=1
export OLLAMA_KEEP_ALIVE=5m
ollama serve
```

*(On macOS, if running Ollama as a GUI application, it automatically binds to port 11434).*

### Step 3: Pull Required Models
In a separate terminal window, pull the generation model and dense embedding model:
```bash
# 1. Generation Model: 3-billion parameter model optimized for CPU
ollama pull llama3.2:3b

# 2. Embedding Model: High-quality 768-dimensional dense embeddings
ollama pull nomic-embed-text
```

### Step 4: Verify Ollama Health
```bash
curl http://localhost:11434/api/tags
# Verify that llama3.2:3b and nomic-embed-text appear in the models list
```

---

## 4. Fresh-Clone Quickstart

### Option A: Docker Compose Setup (Recommended for Evaluation)

Docker Compose starts PostgreSQL with pgvector, compiles and starts the backend, and serves the optimized frontend via Nginx with real-time SSE streaming.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/Lenny-Growth-Assistant.git
   cd Lenny-Growth-Assistant
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Start services:**
   ```bash
   docker compose up -d --build
   ```
   *Docker Compose automatically starts PostgreSQL, waits for health checks, executes database migrations, and launches the backend and frontend.*

4. **Ingest podcast transcripts:**
   ```bash
   docker compose --profile tools run --rm ingest
   ```

5. **Access the Application:**
   - **Frontend UI:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Diagnostic Readiness:** [http://localhost:8000/api/ready](http://localhost:8000/api/ready)

6. **Shutdown:**
   ```bash
   docker compose down
   # Or to purge database volume: docker compose down -v
   ```

---

### Option B: Native Host Setup (Fastest for Local Development)

1. **Clone & Setup Virtual Environment:**
   ```bash
   git clone https://github.com/your-username/Lenny-Growth-Assistant.git
   cd Lenny-Growth-Assistant
   python3.12 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   npm ci
   cd ..
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Update DATABASE_URL in .env if using a custom Postgres username/password
   ```

4. **Initialize Database & Run Migrations:**
   Ensure PostgreSQL 16 is running locally with `pgvector` enabled:
   ```bash
   # Run Alembic migrations to apply initial schema and transcript tables
   alembic upgrade head
   ```

5. **Ingest Podcast Transcripts:**
   ```bash
   python -m backend.app.rag.cli_ingest
   ```

6. **Start Application Services:**
   - **Terminal 1 (Backend):**
     ```bash
     source .venv/bin/activate
     uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
     ```
   - **Terminal 2 (Frontend):**
     ```bash
     cd frontend
     npm run dev
     ```

---

## 5. Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `APP_ENV` | `development` | `development` for colored terminal logs; `production` for JSON structured logs. |
| `APP_DEBUG` | `true` | Enables verbose diagnostic outputs. Set to `false` in production. |
| `APP_HOST` | `0.0.0.0` | IP interface to bind FastAPI backend service. |
| `APP_PORT` | `8000` | Port for the backend API. |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin for the React client. |
| `DATABASE_URL` | `postgresql+asyncpg://apple:@localhost:5432/lenny_growth` | Async PostgreSQL connection string with asyncpg driver. |
| `DATABASE_POOL_SIZE` | `5` | SQLAlchemy connection pool size. |
| `DATABASE_MAX_OVERFLOW` | `2` | Allowed pool overflow connections under peak load. |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL of the host-native Ollama daemon (`http://host.docker.internal:11434` inside Docker). |
| `OLLAMA_GENERATION_MODEL`| `llama3.2:3b` | Local Ollama generation model. |
| `OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text` | Dense embedding model producing 768-dimensional vectors. |
| `OLLAMA_TIMEOUT_SECONDS` | `90.0` | Maximum timeout for inference turns on CPU (prevents 504 timeouts). |
| `ACTIVE_LLM_PROVIDER` | `local_ollama` | Active provider: `local_ollama` or `cloud`. |
| `CLOUD_PROVIDER_TYPE` | `openai` | Cloud adapter backend (`openai` or `anthropic`). |
| `OPENAI_API_KEY` | *(empty)* | Optional API key for OpenAI fallback (`gpt-4o-mini`). |
| `ANTHROPIC_API_KEY` | *(empty)* | Optional API key for Anthropic fallback. |
| `SIMILARITY_THRESHOLD` | `0.65` | Minimum cosine similarity score. Queries below this threshold trigger refusal. |
| `TOP_K_CHUNKS` | `4` | Number of most relevant transcript chunks retrieved per turn. |
| `CHUNK_SIZE_TOKENS` | `600` | Target chunk size in tokens for transcript parser. |
| `CHUNK_OVERLAP_TOKENS` | `100` | Overlap between adjacent chunks preserving speaker boundaries. |

---

## 6. Database Migrations & Transcripts Ingestion

### Migrations Architecture
Database schema is managed using **Alembic** and PostgreSQL raw migrations in `database/migrations/`:
- `001_initial_schema.sql` / `bb2d6c4631ba_create_initial_schema.py`: Enables `vector` extension, creates `sessions`, `messages`, and `artifacts` tables.
- `002_transcripts_schema.sql` / `d30a7d581519_add_transcript_tables.py`: Creates `podcast_episodes` and `transcript_chunks` with `vector(768)` embedding index.

To run migrations:
```bash
alembic upgrade head
```

To roll back:
```bash
alembic downgrade -1
```

### Transcript Ingestion
Raw transcript fixtures are located in `data/transcripts/` as structured JSON containing episode title, guest, publication URL, and speaker turns.

To run ingestion with deduplication:
```bash
# Native host:
python -m backend.app.rag.cli_ingest

# Docker Compose:
docker compose --profile tools run --rm ingest
```

The ingestion pipeline:
1. Validates transcript metadata and speaker segments.
2. Breaks speaker dialogues into 400–600 token chunks with 100-token sliding overlap.
3. Generates 768-dimensional dense vector embeddings via `nomic-embed-text`.
4. Saves episodes and chunks to PostgreSQL with SHA-256 chunk deduplication.

---

## 7. Structured Logging & Request Correlation

### Request & Session Correlation IDs
Every incoming HTTP request passes through `CorrelationIdMiddleware` ([backend/app/logging_config.py](file:///Users/apple/Downloads/Lenny-Growth-Assistant/backend/app/logging_config.py)):
- Inspects `X-Request-ID` header; if missing, creates a standard UUIDv4.
- Inspects `X-Session-ID` header, query parameter, or JSON payload body.
- Binds `request_id` and `session_id` to `structlog.contextvars` so all sub-operations (database queries, RAG retrieval, LLM events) share the correlation context.
- Echoes `X-Request-ID` and `X-Session-ID` in HTTP response headers.

### Privacy & Secret Redaction
To protect user privacy and avoid leaking secrets:
- Headers like `Authorization`, `Cookie`, and keys containing `api_key`, `secret`, `token` are masked as `[REDACTED_SECRET]`.
- Prompt content (`user_prompt`, `prompt`, `content`) is never logged in plaintext. The logger records character counts (e.g., `user_prompt_char_count=55`, `user_prompt="[MASKED_PROMPT_LEN_55]"`) to preserve diagnostics while preventing sensitive information leakage.

---

## 8. Cloud Provider Fallback & Privacy Guardrail

The Lenny Growth Assistant enforces a strict privacy boundary:
- **Default Behavior:** 100% of queries, vector calculations, and generations run locally on `local_ollama`.
- **Zero Silent Leakage:** The application **never** falls back to cloud providers silently.
- **Explicit Authentication Guardrail:** If a user or API requests the cloud provider without configuring an API key, the system raises an explicit `AuthenticationError` (HTTP 401) with the message:
  ```
  Cannot invoke Cloud provider: OPENAI_API_KEY is not configured.
  ```
- **Switching Providers:** Switch dynamically via the UI toolbar or via the API:
  ```bash
  curl -X POST http://localhost:8000/api/models/switch \
    -H "Content-Type: application/json" \
    -d '{"provider": "cloud"}'
  ```

---

## 9. Failure Recovery & Runbook

### 1. Database Connection Outages
- **Symptom:** Backend returns `HTTP 500` with `{"error": "InternalServerError", "message": "An unexpected server error occurred."}`.
- **Recovery:**
  1. Check PostgreSQL service status:
     ```bash
     docker compose ps postgres
     # or native: pg_isready -h localhost -p 5432
     ```
  2. Restart PostgreSQL:
     ```bash
     docker compose restart postgres
     # or native: brew services restart postgresql@16
     ```
  3. Verify connection pool recovery via `/api/ready`.

### 2. Retrieval Degradation & Insufficient Evidence
- **Symptom:** Query returns: *"Insufficient evidence found in the ingested transcripts to answer this query..."*.
- **Root Cause:** Cosine similarity scores between query embedding and transcript chunks are below `SIMILARITY_THRESHOLD=0.65`.
- **Recovery:**
  - This is expected guardrail behavior to prevent LLM hallucinations on topics not discussed in Lenny's Podcast.
  - If valid questions fail, verify transcripts are ingested (`SELECT COUNT(*) FROM transcript_chunks;`) or adjust `SIMILARITY_THRESHOLD` in `.env`.

### 3. Ollama CPU Timeout (504 Gateway Timeout)
- **Symptom:** Request times out after 60-90s with `HTTP 504 Gateway Timeout`.
- **Root Cause:** Long essay or complex multi-turn generation on an Intel Mac CPU under high load.
- **Recovery:**
  1. Increase timeout in `.env`: `OLLAMA_TIMEOUT_SECONDS=120.0`.
  2. Ensure background processes are not consuming CPU.
  3. Set Ollama thread limit: `export OLLAMA_NUM_PARALLEL=1` and restart `ollama serve`.
  4. In the UI, click **Retry** on the message turn.

---

## 10. Developer & Extension Guides

### How to Add / Refresh Podcast Transcripts
1. Place the new transcript JSON file in `data/transcripts/` following the schema:
   ```json
   {
     "title": "Episode Title",
     "guest": "Guest Name",
     "source_url": "https://www.lennyspodcast.com/guest-name/",
     "publication_date": "2024-01-15",
     "segments": [
       {"speaker": "Lenny", "timestamp": "00:00:10", "text": "..."},
       {"speaker": "Guest Name", "timestamp": "00:00:25", "text": "..."}
     ]
   }
   ```
2. Run the ingestion CLI:
   ```bash
   python -m backend.app.rag.cli_ingest
   ```
   *The deduplicator will skip existing episodes and index only new content.*

### How to Add a New Agent Skill
1. Create a skill class inheriting from `BaseSkill` in `backend/app/agent/skills/`:
   ```python
   from backend.app.agent.skills.base import BaseSkill, SkillContext

   class CustomSkill(BaseSkill):
       @property
       def skill_type(self) -> str:
           return "custom_skill"

       async def execute(self, ctx: SkillContext, **kwargs):
           yield {"event": "status", "data": {"message": "Custom skill processing..."}}
           # ... perform logic
           yield {"event": "done", "data": {"status": "complete"}}
   ```
2. Register the skill in [SkillRouter](file:///Users/apple/Downloads/Lenny-Growth-Assistant/backend/app/agent/router.py) and [AgentRunner](file:///Users/apple/Downloads/Lenny-Growth-Assistant/backend/app/agent/runner.py).
3. Add a test in [tests/test_agent_deterministic.py](file:///Users/apple/Downloads/Lenny-Growth-Assistant/tests/test_agent_deterministic.py).

### How to Extend API Routers
1. Create a new router in `backend/app/routers/my_feature.py`.
2. Include the router in [backend/app/main.py](file:///Users/apple/Downloads/Lenny-Growth-Assistant/backend/app/main.py):
   ```python
   from backend.app.routers.my_feature import router as my_feature_router
   app.include_router(my_feature_router, prefix="/api")
   ```

---

## 11. Automated Test Suites

The test suite is partitioned into fast deterministic unit/contract tests and hardware integration tests using pytest markers:

### Run Fast Unit & Deterministic Tests (15s runtime, no Ollama needed)
```bash
source .venv/bin/activate
pytest -v -m "not requires_ollama and not requires_cloud"
```
*Executes 49 deterministic tests across API contracts, session isolation, Ship 30 essay generation, insufficient evidence guardrails, persistence, chunking, and resilience.*

### Run Live Ollama Integration Tests
```bash
pytest -v -m requires_ollama
```

### Run Frontend Vitest Suite
```bash
cd frontend
npm test
```
*Executes 55 test cases across 5 test suites (Iframe sandbox security, SSE streaming parser, sidebar session management, chat composer, and markdown rendering).*

### Manual UI Test Plan
For end-to-end user evaluation, refer to the complete manual test plan at [docs/manual_ui_test_plan.md](file:///Users/apple/Downloads/Lenny-Growth-Assistant/docs/manual_ui_test_plan.md) with 12 structured scenarios (TC-01 through TC-12) covering session lifecycles, refusal guardrails, model switcher, and sandbox iframe security.

---

## 12. Security & Secrets Verification

Git history and repository configuration have been verified clean:
- `.env` and `.env.local` are explicitly ignored via `.gitignore`.
- Zero credentials, secrets, or API keys are committed.
- Verify repository cleanliness at any time:
  ```bash
  git log -p -S "sk-" -- .
  ```
