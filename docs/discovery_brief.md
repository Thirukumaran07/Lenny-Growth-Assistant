# Discovery Brief: The Lenny Growth Assistant

## 1. Executive Summary & Problem Context
Product and growth teams frequently seek actionable insights on growth, product-market fit, retention, activation, go-to-market strategies, and team scaling. *Lenny's Podcast* and newsletter archive represent one of the richest, practitioner-verified corpuses in technology. However, accessing this wisdom in day-to-day workflow poses several challenges:
- **Search Friction & Hallucination:** General-purpose LLMs hallucinate frameworks or misattribute quotes and advice without grounded provenance.
- **Synthesizing Long-Form Transcripts:** Podcast transcripts are sprawling, conversational, and contain filler, making direct reading inefficient.
- **Actionable Output Formatting:** Growth operators need structured formats—such as tactical answers, frameworks, or viral "Ship 30 for 30"-style atomic essays—paired with live, sandboxed visual representations (Markdown & HTML/CSS artifacts) rather than raw wall-of-text chat.

**The Lenny Growth Assistant** is a full-stack, local-first AI conversational system that combines deterministic source-traceable Retrieval-Augmented Generation (RAG), persistent session management, agentic skill routing, and secure live artifact rendering.

---

## 2. Hardware & Operating Environment Constraints
- **Host Machine:** MacBook Air (Dual-core Intel Core i5, 8 GB RAM).
- **Installed Toolchain:**
  - Python: `3.12.10`
  - Node.js: `v26.3.0` / npm: `11.16.0`
  - Docker: `29.5.3` / Docker Compose compatible
  - Ollama: Installed (`/usr/local/bin/ollama`) with pre-pulled models:
    - LLM: `llama3.2:3b` (~2.0 GB memory footprint; optimized for 8 GB RAM systems)
    - Embeddings: `nomic-embed-text:latest` (~274 MB memory footprint)
  - PostgreSQL / Client: `psql` available locally and containerized via Docker Compose.
- **Hardware Mitigations:**
  - Strict concurrency limits (1 active LLM inference stream per worker).
  - Low-overhead vector retrieval (pgvector in PostgreSQL or quantized in-memory FAISS/pgvector index) avoiding heavyweight external vector services.
  - Efficient chunking (500–800 token semantic window with overlap) to preserve local context window boundaries.

---

## 3. Core Stakeholders & User Personas
1. **Product Manager / Growth Lead (Primary Persona):**
   - Goal: Quickly query Lenny's episodes for proven playbooks (e.g., "How did Superhuman measure PMF?", "What are Figma's onboarding metrics?").
   - Requirement: Grounded citations (guest name, episode title, timestamp/transcript quote) and explicit admissions when data is absent.
2. **Growth Content Creator / Founder:**
   - Goal: Synthesize podcast wisdom into punchy, high-leverage atomic essays following the "Ship 30 for 30" framework (~1,250 words, hook, progression, skimmable headings, actionable takeaway).
   - Requirement: Exportable and previewable Markdown / HTML/CSS artifacts rendered in an isolated sandbox.
3. **Engineering Hiring Manager / Evaluator:**
   - Goal: Assess engineering maturity, clean architecture, automated test coverage, resilience under failure, and safe code execution.

---

## 4. Key Architectural Decisions & Trade-Offs

| Decision Area | Chosen Approach | Rationale & Trade-Offs |
|---|---|---|
| **Agent Layer** | Lightweight Tool/Skill Router | Anthropic Agent SDK and Pi Coding Agent introduce proprietary licensing, heavy dependencies, or strict cloud requirements incompatible with offline local Ollama operation. A deterministic router with typed tools and skill contracts provides 100% transparency, zero lock-in, and reliable local execution. |
| **Local LLM** | Ollama with `llama3.2:3b` | 3B parameter model runs smoothly under 8GB RAM constraints without thrashing swap space. |
| **Cloud LLM Adapter** | Replaceable Provider Adapter (OpenAI / Anthropic compatible) | Allows swapping between local offline privacy and high-capability cloud models via simple `.env` flags without altering business logic. |
| **Database & Vector Storage** | PostgreSQL with `pgvector` | Consolidates relational data (sessions, messages, artifacts, audit logs) and embeddings into a single transactional store, simplifying Docker Compose and local developer setup. |
| **Artifact Sandboxing** | Multi-layer sandbox (`iframe` sandbox attributes, restrictive CSP, blob/srcdoc isolation) | Generated HTML/CSS can contain arbitrary scripts. Strict sandboxing (`sandbox="allow-scripts"` with NO `allow-same-origin`, `allow-top-navigation`, or network exfiltration) prevents XSS and parent DOM compromise. |
| **Streaming UI** | Server-Sent Events (SSE) / Streaming Fetch | Instant time-to-first-token UX, crucial when running smaller local models where inference speed varies under load. |

---

## 5. Scope Boundaries

### In-Scope:
- Multi-session chat management with persistent history in PostgreSQL.
- Deterministic ingestion, chunking, and vector indexing of curated Lenny podcast/newsletter transcripts.
- Grounded citation generation referencing exact episode metadata and transcript quotes.
- Fallback declaration when retrieved context lacks sufficient evidence.
- Ship 30 for 30 atomic essay generator skill (~1,250 words, structured hook, body, conclusion, action items).
- Side-by-side artifact viewer for generated Markdown and HTML/CSS.
- Isolated rendering sandbox with Content Security Policy enforcement.
- Switchable model provider config (Ollama `llama3.2:3b` default + Cloud OpenAI/Anthropic adapter).
- Comprehensive error handling: missing keys, model timeouts, database disconnects, empty retrieval.
- Automated test suite (FastAPI TestClient, pytest, mock providers, frontend component tests).
- Docker Compose configuration and zero-config local run scripts.

### Out-of-Scope (Non-Goals):
- Live web crawling of arbitrary external audio/video platforms in real time.
- Voice/audio speech-to-text transcription during runtime (transcripts are pre-ingested as cleaned text/JSON).
- Multi-tenant enterprise SSO / RBAC authentication (single-user / team local workspace model).

---

## 6. Risks & Mitigation Strategies
1. **Risk: Local LLM context window overflow or token limits on 3B models.**
   - *Mitigation:* Cap retrieved context chunks to top-K (3 to 5 chunks, ~1500 tokens total) and summarize prior session history if message count exceeds 10 turns.
2. **Risk: Ollama process unresponsiveness or cold start lag.**
   - *Mitigation:* Health check probe on startup, client timeout configuration (60s), and human-friendly error messages directing the user to start Ollama or switch to cloud.
3. **Risk: Malicious or broken HTML generated in artifacts.**
   - *Mitigation:* Strict sandboxed iframe (`sandbox="allow-scripts"`, without `allow-same-origin`), restrictive Content Security Policy (`script-src 'unsafe-inline'`), blocking access to cookies, localStorage, or parent origin.
