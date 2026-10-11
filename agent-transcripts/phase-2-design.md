# Phase 2 Transcript: UX and System Design

## Date: 2026-10-11
## Agent: Senior Forward Deployed Engineer & AI Architect
## Objective:
Execute Phase 2 UX and system design, creating comprehensive `design.md` and `architecture.md` specifications aligned with PRD requirements and the Intel MacBook Air (8 GB RAM) hardware profile.

---

## 1. Design & Architecture Highlights

### UI/UX Design (`design.md`)
- **Theme:** Obsidian Slate dark-mode first design system (WCAG AA compliant).
- **Responsive Layout:** 3-column architecture (260px collapsible session sidebar, 1fr flexible conversation stream, 520px side-by-side artifact viewer). Breakpoints down to mobile 375px.
- **Interactive Citations:** Grounded inline citation pills (`[1 Elena Verna - 14:20]`) that expand into a rich drawer displaying the guest headshot, episode title, air date, and verbatim transcript quote.
- **State Machine:** 4 explicit application states:
  1. *Empty State:* Starter prompt cards (Superhuman PMF, Ship 30 essay, Figma onboarding).
  2. *Streaming State:* Token-by-token SSE streaming with time-to-first-token indicators and a stop button.
  3. *Insufficient Evidence State:* Explicit refusal when similarity < 0.65 with topic suggestions.
  4. *Error State:* Graceful diagnostics and one-click retry for Ollama offline or DB drops.
- **Artifact Viewer:** Split-pane container supporting Markdown and HTML/CSS with Visual Preview, Raw Code toggle, Copy Code, and Download.
- **Accessibility & Keyboard:** Global shortcuts (`Cmd+K`, `Cmd+N`, `Cmd+\`, `Esc`) and ARIA landmarks.

### System Architecture (`architecture.md`)
- **Stack:** React 18 + Vite + TypeScript (Frontend), FastAPI Python 3.12 (Backend), PostgreSQL 16 + pgvector (Storage), Ollama (Local LLM & Embeddings).
- **Agent Layer:** Deterministic Tool & Skill Router dispatching between `rag_qa_skill`, `ship30_essay_skill`, `artifact_generator_skill`, and `direct_chat_skill`.
- **RAG Pipeline:** Pre-chunked 600-token semantic sliding windows, 768d embeddings using `nomic-embed-text`, HNSW cosine index in PostgreSQL.
- **Database Schema:** 5 core tables (`sessions`, `messages`, `artifacts`, `transcript_episodes`, `transcript_chunks`).
- **Provider Abstraction:** Unified `LLMProvider` interface powering `OllamaProvider` (default) and `CloudProvider` (OpenAI / Anthropic fallback).
- **Security Sandboxing:** Multi-tier containment boundary for generated HTML using `<iframe>` with `sandbox="allow-scripts"` (strictly NO `allow-same-origin`) and restrictive CSP.
- **Hardware Feasibility:** Validated memory footprint (~6.8 GB peak against 8.0 GB RAM), leaving ~1.2 GB headroom on Intel Core i5.
- **Traceability Matrix:** Explicit mapping from all 12 assignment requirements to specific code files and automated test suites.

---

## 2. Files Created in Phase 2
- `design.md`: UI/UX design specifications, layout breakpoints, state machine, accessibility, keyboard controls.
- `architecture.md`: Complete system architecture, component diagrams, ERD, API contracts, RAG pipeline, sandboxing, and hardware feasibility.
- `agent-transcripts/phase-2-design.md`: This execution log.

---

## 3. Phase 2 Verification Checklist
- [x] `design.md` completed with responsive layout, sidebar, citations, provider indicator, states, artifact viewer, accessibility, and shortcuts.
- [x] `architecture.md` completed with React/FastAPI/Postgres/Ollama stack, skill router, RAG pipeline, ERD, API contracts, sandboxing, logging, and deployment.
- [x] Useful Mermaid diagrams included (System Architecture, RAG Sequence, ERD, Skill Router).
- [x] Feasibility verified on Intel MacBook Air with 8 GB RAM (RAM budget, sequential concurrency, offloaded embeddings).
- [x] Expensive/unsupported assumptions flagged (no in-process PyTorch, no live Whisper transcription).
- [x] Requirement traceability matrix linking assignment requirements to components and tests.
- [x] Zero application feature code implemented before Phase 2 completion.
