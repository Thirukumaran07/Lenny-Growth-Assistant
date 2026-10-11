# Product Requirements Document (PRD)
## The Lenny Growth Assistant

- **Document Version:** 1.0.0
- **Status:** Approved / In Progress
- **Target Release:** v1.0.0 (Forward Deployed Engineer Demonstration)
- **Author:** Senior Forward Deployed Engineer & AI Architect

---

## 1. Product Overview & Vision
"The Lenny Growth Assistant" is an enterprise-grade, local-first conversational AI workbench designed for product managers, growth leaders, and founders. It enables teams to query Lenny Rachitsky's podcasts and newsletter archives with mathematically traceable citations, synthesize atomic essays following the "Ship 30 for 30" framework, and preview dynamic Markdown/HTML artifacts safely in an isolated side-by-side workspace.

---

## 2. Target Users & Core Use Cases

### User Personas
1. **VP of Product / Head of Growth:** Needs grounded benchmarks on retention, onboarding, PLG vs SLG, and PMF without hallucinated advice.
2. **Growth Marketer / Operator:** Needs rapid distillation of podcast strategies into punchy, actionable essays formatted for publication.
3. **Engineering Evaluator:** Assesses system architecture, error resilience, security isolation, and hardware-conscious implementation.

### Primary User Journeys
1. **Journey 1: Grounded Q&A Session**
   - User launches app -> Selects or creates a chat session -> Enters: *"What are the common retention benchmarks for B2B SaaS according to Lenny's guests?"*
   - System queries vector index -> Injects relevant transcript chunks -> LLM generates synthesis citing specific episodes, speakers, and quotes.
   - If no relevant transcript is found, system explicitly returns: *"Insufficient evidence found in the ingested transcripts to answer this query."*

2. **Journey 2: Ship 30 for 30 Essay Generation & Artifact Preview**
   - User requests: *"Write an atomic essay on how Miro scaled its product-led growth flywheel."*
   - Router selects `Ship 30 for 30` skill -> Generates structured ~1,250-word essay with a compelling hook, 3 key milestones, actionable takeaways, and transcript citations.
   - Assistant automatically produces an Artifact card -> User clicks or views in the side-by-side viewer -> Renders sandboxed HTML/CSS card preview.

3. **Journey 3: Model Provider Switching**
   - User checks model status in header -> Toggles between `Local Ollama (llama3.2:3b)` and `Cloud Provider (OpenAI/Anthropic)`.
   - If local Ollama is offline or unpulls, the UI shows a clear diagnostic banner with remediation commands.

---

## 3. Functional Requirements (FR)

### FR-1: Session & Conversation Management
- **FR-1.1:** Persistent chat sessions stored in PostgreSQL.
- **FR-1.2:** Session listing, creation, renaming, and deletion.
- **FR-1.3:** Message persistence including role (`user`, `assistant`, `system`), content, timestamps, citation metadata, and linked artifacts.
- **FR-1.4:** Session context window management: preserve conversation history across turns within LLM token constraints.

### FR-2: Knowledge Ingestion & Source Traceability (RAG)
- **FR-2.1:** Ingestion pipeline supporting raw transcripts (JSON/Markdown/text formats) containing episode title, guest name, URL/date, and text.
- **FR-2.2:** Semantic chunking strategy (target 500–800 tokens, 100-token overlap) preserving speaker turns and timestamps.
- **FR-2.3:** Embeddings using `nomic-embed-text` (local Ollama) or fallback embedding provider, indexed into PostgreSQL `pgvector`.
- **FR-2.4:** Hybrid/semantic retrieval with cosine distance threshold and Top-K retrieval (3–5 chunks).
- **FR-2.5:** Deterministic citation format: Every claim derived from transcripts must reference `[Guest Name - Episode Title - Segment/Timestamp]`.
- **FR-2.6:** Evidence Guardrail: When maximum similarity score is below the relevance threshold (e.g., < 0.65), system must explicitly state that evidence is insufficient rather than guessing.

### FR-3: Skill & Agent Routing Layer
- **FR-3.1:** Router Architecture: A lightweight, deterministic Tool & Skill Router dispatching based on user intent and parameters:
  - `rag_qa_skill`: Standard grounded Q&A with strict citations.
  - `ship30_essay_skill`: Specialized essay synthesizer following Ship 30 for 30 principles (~1,250 words, hook, 3 core pillars, skimmable subheadings, actionable takeaways).
  - `artifact_generator_skill`: Structured generator producing standalone Markdown or HTML/CSS documents.
- **FR-3.2:** Explicit fallback to direct assistant conversation when no specialized skill matches.

### FR-4: Artifact Generation & Sandboxed Viewer
- **FR-4.1:** Artifact creation: Assistant can generate structured artifacts with metadata (`id`, `title`, `type`: `markdown` | `html`, `content`, `created_at`).
- **FR-4.2:** Side-by-side desktop layout: Left panel conversational chat, right panel collapsible live preview pane.
- **FR-4.3:** Security Sandboxing:
  - HTML artifacts rendered strictly inside an `<iframe>` with `sandbox="allow-scripts"` (without `allow-same-origin`, `allow-top-navigation`, or `allow-forms`).
  - Restrictive Content Security Policy (`default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:;`).
  - Origin isolation: Parent application cookies, session storage, and API keys are completely inaccessible to the rendered artifact.
- **FR-4.4:** Markdown artifacts rendered using safe, sanitized parser with syntax highlighting.
- **FR-4.5:** Artifact export/copy functionality (Copy Raw, Download File).

### FR-5: Model Abstraction & Graceful Degradation
- **FR-5.1:** Unified `LLMProvider` interface defining `generate_stream()` and `generate_completion()`.
- **FR-5.2:** Implementations:
  - `OllamaProvider`: Default local provider communicating with `http://localhost:11434` (model: `llama3.2:3b`).
  - `CloudProvider`: Replaceable provider adapter supporting OpenAI (`gpt-4o-mini` / `gpt-4o`) and Anthropic (`claude-3-5-sonnet`) when API keys are configured.
- **FR-5.3:** Dynamic runtime switching via UI indicator or configuration without server restart.
- **FR-5.4:** Graceful Error Handling:
  - Connection refused to Ollama -> Return status code 503 with instruction: *"Ollama service is not reachable at localhost:11434. Run `ollama serve` or switch to cloud provider."*
  - Cloud API key missing / invalid -> Return clear validation error without leaking sensitive logs.
  - Timeout protection -> 60-second request timeout on LLM inference with cancellation tokens.

---

## 4. Non-Functional Requirements (NFR)

### NFR-1: Performance & Resource Footprint
- **Target Machine:** MacBook Air (Intel Core i5, 8 GB RAM).
- **RAM Budget:** Maximum application memory consumption < 1.5 GB for backend + frontend services; Ollama memory footprint < 2.5 GB. Total system memory usage < 75%.
- **Latency:** Time-to-first-token < 2.5s on local Ollama `llama3.2:3b`; retrieval query latency < 150ms.

### NFR-2: Reliability & Observability
- **Health Checks:** `/health` endpoint returning database connection status, vector index count, Ollama service availability, and active model.
- **Structured Logging:** Standard JSON logging with request IDs, trace contexts, retrieval scores, and token usage metrics.
- **Resilience:** Automatic retry on transient DB connection dropouts; zero crashes on malformed user inputs.

### NFR-3: Security & Data Privacy
- **Local-First Privacy:** All transcripts, chat histories, and embeddings reside locally in PostgreSQL. No data sent to third parties unless cloud model is explicitly enabled.
- **XSS & Code Injection Prevention:** Strictly isolated iframe sandboxing; HTML sanitizer for markdown; sanitized SQL queries via SQLAlchemy parameterized bindings.
- **Zero Secrets in Code:** Strict environment variable isolation; `.env.example` provided; `.env` excluded in `.gitignore`.

### NFR-4: Accessibility & User Experience
- **Responsive Layout:** Works smoothly on desktop viewports down to 1024px, with collapsible sidebar and split-pane toggle.
- **Design System:** Sleek dark-mode aesthetic, typography using modern fonts (Inter), accessible contrast ratios (WCAG AA compliant).

---

## 5. Verification & Acceptance Criteria (AC)

| ID | Category | Acceptance Criteria |
|---|---|---|
| **AC-1** | Persistence | User can create 3 distinct sessions, switch between them, restart the server, and verify all message history remains intact in PostgreSQL. |
| **AC-2** | Ingestion & RAG | At least 5 full/curated Lenny transcripts ingested, chunked, and embedded into PostgreSQL. Querying a specific guest topic returns accurate quotes with episode title and timestamp. |
| **AC-3** | Hallucination Guard | When asked an ungrounded question (e.g., *"What did Lenny's guest say about nuclear fusion reactors in 1985?"*), the system explicitly states evidence is insufficient. |
| **AC-4** | Ship 30 for 30 Skill | Prompting an atomic essay generates a structured document (~1,250 words) with clear hook, 3 progression points, skimmable bolding, actionable takeaway, and citations. |
| **AC-5** | Artifact Sandboxing | Generating an HTML artifact renders in the right preview pane. Attempting `window.parent.location` or `document.cookie` within the artifact throws security errors and fails safely. |
| **AC-6** | Model Switching | Switching between local Ollama (`llama3.2:3b`) and cloud adapter is visible in UI, and the assistant generates valid responses on both. |
| **AC-7** | Error Handling | Killing the Ollama process results in a graceful UI notification with remediation steps, not an uncaught 500 crash. |
| **AC-8** | Automated Testing | Backend pytest suite passes with >85% coverage on persistence, retrieval, agent routing, and provider adapters. |
| **AC-9** | Containerization | `docker compose up` brings up PostgreSQL with pgvector, backend, and frontend without manual configuration. |

---

## 6. Implementation Milestones (Phases)
- **Phase 1:** Requirements, discovery brief, PRD, scope, acceptance criteria (CURRENT).
- **Phase 2:** UX and system design; `design.md` and `architecture.md`.
- **Phase 3:** Repository scaffold, developer environment, configuration, and health checks.
- **Phase 4:** PostgreSQL schema, persistence, session/message APIs, and migrations.
- **Phase 5:** Transcript ingestion, chunking, embeddings, retrieval, and source citations.
- **Phase 6:** LLM provider abstraction, Ollama integration, cloud provider integration, graceful failures.
- **Phase 7:** Agent orchestration, grounded question-answering skill, session context, and Ship 30 for 30 skill.
- **Phase 8:** React chat UI, session controls, streaming/status/error states, model visibility.
- **Phase 9:** Markdown/HTML artifact generation, artifact viewer, security isolation.
- **Phase 10:** Integration, automated tests, manual UI test plan, reliability checks.
- **Phase 11:** Docker Compose, `.env.example`, README, observability, troubleshooting guide.
- **Phase 12:** GitHub preparation, agent transcripts review, final demo, submission checklist.
