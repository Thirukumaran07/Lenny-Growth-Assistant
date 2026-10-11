# Discovery Brief: The Lenny Growth Assistant

- **Document Version:** 1.0.0
- **Author:** Senior Forward Deployed Engineer & AI Architect
- **Status:** Complete (Phase 1 Baseline)
- **Target Platform:** macOS (MacBook Air Intel Core i5, 8 GB RAM)

---

## 1. Executive Summary & Problem Context
*Lenny’s Podcast* and newsletter archive represent one of the world's most comprehensive repositories of verified product, growth, go-to-market, and leadership knowledge from world-class operators (e.g., Brian Chesky, Shreyas Doshi, Elena Verna, Gustaf Alströmer).

Despite this wealth of knowledge, product managers, founders, and growth leaders struggle to utilize it effectively in their daily operational workflows:
1. **Search & Attribution Friction:** Existing keyword search across hundreds of multi-hour episodes is time-prohibitive. Standard LLM chatbots hallucinate advice, misattribute quotes, or deliver generic growth clichés rather than the guest’s authentic playbook.
2. **Context Window & Synthesis Limits:** Raw transcripts are verbose, conversational, and contain conversational tangents. Synthesizing these into actionable playbooks requires structured semantic chunking and retrieval.
3. **Lack of Practitioner Formatting:** Product teams do not just want conversational text—they need publishable frameworks, actionable takeaways, and viral "Ship 30 for 30"-style atomic essays paired with live, exportable Markdown and HTML/CSS artifacts.

**The Lenny Growth Assistant** is an enterprise-grade, local-first conversational AI workbench combining:
- Deterministic, source-traceable Retrieval-Augmented Generation (RAG) with mathematical similarity guardrails.
- Persistent multi-session conversation history stored in PostgreSQL.
- A deterministic, lightweight Tool & Skill Router running natively on local Ollama models with cloud failover.
- An isolated, sandboxed side-by-side artifact viewer for safe HTML/CSS and Markdown rendering.

---

## 2. Primary Users & Jobs To Be Done (JTBD)

### User Personas

#### Persona A: Product Manager / Growth Lead (Primary User)
- **Profile:** Fast-paced operator designing retention loops, onboarding funnels, or pricing experiments.
- **Pain Point:** Needs proven playbooks and benchmarks from experienced leaders without spending 2 hours listening to audio or risking hallucinated metrics.
- **JTBD Core Statement:**
  > *"When I am planning a growth initiative or setting team benchmarks, I want to query verified practitioner experiences from Lenny's guests with exact quotes and timestamps, so that I can make defensible product decisions without second-guessing model hallucinations."*

#### Persona B: Growth Marketer / Content Creator (Secondary User)
- **Profile:** Growth writer distilling complex case studies into engaging, high-impact content.
- **Pain Point:** Turning long-form transcripts into punchy, skimmable essays takes hours of manual synthesis and formatting.
- **JTBD Core Statement:**
  > *"When I identify an inspiring growth strategy from an episode, I want to transform it into a structured 'Ship 30 for 30' atomic essay (~1,250 words) with clear hooks and modular takeaways, so that I can publish high-signal thought leadership in minutes."*

#### Persona C: Technical Evaluator / Forward Deployed Engineering Lead (Auditor)
- **Profile:** Senior software architect evaluating the take-home submission for engineering rigour, resilience, security, and code quality.
- **Pain Point:** Disconnected demos that break offline, leak secrets, lack automated tests, or render untrusted code unsafely.
- **JTBD Core Statement:**
  > *"When I review this implementation, I want to verify a robust full-stack architecture running locally on constrained hardware, with comprehensive test coverage, strict sandboxing, graceful failure handling, and transparent documentation."*

---

## 3. Problems & Proposed Solution

| Problem Area | Current Challenge | Proposed Solution in Lenny Growth Assistant |
|---|---|---|
| **Hallucination & Provenance** | Standard LLMs generate convincing falsehoods when asked specific questions about episodes. | Strict RAG pipeline with similarity thresholds. When evidence is below threshold, system returns an explicit refusal: *"Insufficient evidence found in the ingested transcripts."* Every accepted claim must cite `[Guest Name - Episode Title - Timestamp/Segment]`. |
| **Hardware Constraints (8GB RAM)** | Running heavy vector DBs and 70B models leads to memory thrashing and crashes on an Intel i5 MacBook Air. | Native Ollama integration using `llama3.2:3b` (~2.0 GB RAM) and `nomic-embed-text` (~274 MB RAM); unified PostgreSQL 16 + `pgvector` store eliminating separate vector server overhead. |
| **Agent Complexity & Lock-in** | Proprietary agent SDKs (Claude Agent SDK, Pi Coding Agent) introduce vendor lock-in, licensing hurdles, or cloud-only requirements. | Lightweight, deterministic Tool & Skill Router in Python. Dispatches typed skills (`rag_qa_skill`, `ship30_essay_skill`, `artifact_generator_skill`) predictably with local Ollama support. |
| **Security of Generated Artifacts** | LLM-generated HTML/CSS can execute malicious JavaScript, access parent window tokens, or steal cookies (XSS). | Multi-layer sandboxing: `<iframe>` with `sandbox="allow-scripts"` (strictly NO `allow-same-origin`, NO `allow-top-navigation`, NO `allow-forms`) and restrictive Content Security Policy (CSP). |
| **Workflow Continuity** | Ephemeral chat sessions lose conversational context upon page refresh or server restart. | ACID-compliant PostgreSQL persistence for sessions, message turns, citations, and generated artifacts with full historical reload. |

---

## 4. Hardware Profiling & Operating Environment

### Machine Baseline
- **Hardware:** MacBook Air (Dual-core Intel Core i5, 8 GB 1600 MHz LPDDR3 RAM).
- **Operating System:** macOS (Darwin Kernel).
- **Available Toolchain:**
  - Python: `3.12.10`
  - Node.js: `v26.3.0` / npm: `11.16.0`
  - Docker: `29.5.3` / Docker Compose
  - Ollama: `/usr/local/bin/ollama` (Pre-installed: `llama3.2:3b`, `nomic-embed-text:latest`)
  - PostgreSQL CLI: `/usr/local/bin/psql`

### Resource Allocation Budget (8 GB System Total)
- **macOS System & Core Daemons:** ~3.0 GB
- **Ollama Engine + `llama3.2:3b`:** ~2.2 GB
- **PostgreSQL 16 + `pgvector` Container:** ~0.4 GB
- **FastAPI Backend (Python 3.12, Uvicorn):** ~0.3 GB
- **Vite React Frontend + Browser Session:** ~1.2 GB
- **Safety Margin / Headroom:** ~0.9 GB
*Total Projected Usage: ~7.1 GB (< 90% threshold, preventing swap thrashing).*

---

## 5. Scope Boundaries: Mandatory Requirements vs. Optional Enhancements

### Mandatory Assignment Requirements (Must-Have for V1.0)
1. **Persistent Sessions & History:** PostgreSQL storage for sessions, messages, timestamps, and metadata.
2. **Transcript RAG Pipeline:** Ingestion, semantic chunking, embeddings, pgvector storage, and source citations.
3. **Grounded Answers & Evidence Guardrail:** Accurate quotes with speaker/episode attribution; explicit refusal when evidence is insufficient.
4. **Ship 30 for 30 Essay Skill:** Dedicated generator targeting ~1,250 words with hook, narrative progression, skimmable formatting, and actionable takeaway.
5. **Artifact Generation & Sandboxed In-App Viewer:** Side-by-side rendering of Markdown and HTML/CSS artifacts in a secure, sandboxed container.
6. **Local LLM First:** Mandatory local demo utilizing Ollama (`llama3.2:3b`).
7. **Replaceable Cloud Adapter:** Swappable provider interface supporting OpenAI or Anthropic when keys are provided.
8. **Graceful Failure Handling:** Structured handling for Ollama offline, missing keys, DB disconnects, and empty queries.
9. **Automated Testing Suite:** Pytest coverage for persistence, retrieval, routing, and provider adapters, plus manual UI test plan.
10. **Packaging & Documentation:** Docker Compose, `.env.example`, README, architecture/design docs, and agent transcripts.

### Optional Enhancements (Post-V1.0 Backlog / Stretch)
- Real-time audio ingestion and automatic Whisper transcription.
- Multi-user RBAC and workspace organization.
- Exporting essays directly to Notion, Substack, or Twitter/X via OAuth APIs.
- Voice-enabled playback of transcript segments.

---

## 6. Assumptions & Open Questions

### Recorded Assumptions
1. **Curated Transcript Ingestion:** Transcripts will be ingested from structured text/JSON files containing episode metadata (`title`, `guest`, `date`, `url`, `content`).
2. **Local Embedding Provider:** Local embeddings are produced via Ollama's `nomic-embed-text` (768 dimensions), maintaining a single unified runtime for both generation and embeddings without PyTorch bloat.
3. **Single Active User Workstation:** The system is architected as a local-first single-tenant workstation tool; no complex multi-tenant billing or multi-user isolation is needed for V1.0.
4. **Single Concurrency on Inference:** To prevent CPU/memory bottlenecks on the Intel i5 chip, the backend will process one LLM generation turn at a time per session.

### Open Questions (Non-Blocking)
- *Q1: How many initial transcripts should be bundled in the repository seed?*
  - **Resolution:** We will bundle 5 high-signal, diverse episodes covering core themes (PLG, Retention, PMF, GTM, Pricing) to provide immediate out-of-the-box utility while keeping git clone size minimal.
- *Q2: Should the Ship 30 for 30 essay automatically generate an HTML artifact?*
  - **Resolution:** Yes, when the essay skill is invoked, it will save the essay as both a structured chat message and an interactive HTML/CSS card artifact ready for viewing.
