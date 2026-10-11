# Phase 1 Transcript: Discovery, Environment Verification & PRD

## Date: 2026-10-11
## Agent: Senior Forward Deployed Engineer & AI Architect
## Objective:
Execute Phase 1 requirements discovery, audit host environment, evaluate hardware constraints (Intel Core i5, 8 GB RAM), specify agent architecture, and establish formal testable acceptance criteria across 10 specific functional and risk areas.

---

## 1. Host Environment Audit
The following commands were run to inspect the host system and available binaries:

```bash
python3 --version
# Output: Python 3.12.10

node --version && npm --version
# Output: Node v26.3.0, npm 11.16.0

docker --version
# Output: Docker version 29.5.3, build d1c06ef

which ollama
# Output: /usr/local/bin/ollama

ollama list
# Output:
# nomic-embed-text:latest    0a109f422b47    274 MB    24 hours ago
# llama3.2:3b                a80c4f17acd5    2.0 GB    25 hours ago

which psql
# Output: /usr/local/bin/psql
```

### Hardware Impact Assessment:
- **CPU & Memory:** MacBook Air with Intel Core i5 and 8 GB RAM.
- **Model Choice:** `llama3.2:3b` (2.0 GB memory footprint) and `nomic-embed-text:latest` (274 MB memory footprint). This combination leaves ~5.7 GB RAM available for the OS, PostgreSQL, FastAPI, and browser, preventing swap thrashing and keeping thermal throttling to a minimum.
- **Embedding Choice:** `nomic-embed-text` runs natively on local Ollama without loading heavy PyTorch/SentenceTransformers in Python backend process memory.

---

## 2. Key Technical Decisions & Evaluations

### Decision 1: Agent Layer Architecture (Router vs Agent SDK)
- **Evaluation:** Evaluated Pi Coding Agent and Anthropic Claude Agent SDK. The Claude Agent SDK requires Anthropic cloud credentials and is not designed for offline local execution with Ollama. Pi Coding Agent introduces additional dependency overhead and licensing constraints.
- **Resolution:** As permitted by the assignment prompt ("propose and document a lightweight, maintainable tool/skill router that meets the product requirements; do not falsely claim to use either SDK"), we implement a clean, lightweight, deterministic **Tool & Skill Router** in Python. It routes user intents to:
  1. `RAG Grounded Q&A Skill`
  2. `Ship 30 for 30 Essay Skill`
  3. `Artifact Generator Skill`
  4. `Direct Conversation Skill`
- **Integrity Guarantee:** We have explicitly documented this decision in `PRD.md` and `discovery_brief.md` without falsely claiming to use third-party proprietary agent SDKs.

### Decision 2: Storage and Vector Retrieval
- **Resolution:** PostgreSQL 16 with the `pgvector` extension.
- **Justification:** Unifies relational application data (sessions, messages, artifacts) and high-dimensional vector embeddings in a single database container. Eliminates the need for a separate vector database (e.g., Pinecone, Qdrant, Chroma), drastically lowering memory footprint on 8GB RAM.

### Decision 3: Artifact Security Sandboxing
- **Resolution:** Generated HTML/CSS will be rendered in a dedicated `<iframe>` using strict attributes:
  ```html
  <iframe
    sandbox="allow-scripts"
    csp="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:;"
    srcdoc="..."
  />
  ```
- **Justification:** Guarantees zero access to parent `window`, `document.cookie`, `localStorage`, or top-level navigation, mitigating XSS and prompt-injection-driven script execution.

---

## 3. Files Created in Phase 1
1. `PRD.md`: Master Product Requirements Document covering:
   - Primary users and JTBD (Product Manager, Growth Content Creator, Technical Evaluator).
   - Problems and proposed solution.
   - Measurable success metrics (citation accuracy, refusal rate, TTFT, word count, memory limits, test coverage).
   - Assumptions and open questions.
   - In-scope vs. out-of-scope boundaries (mandatory requirements vs. optional enhancements).
   - 4 End-to-end user journeys (Grounded Q&A, Multi-turn Follow-up, Ship 30 for 30 essay, Sandboxed Artifact preview).
   - Functional (FR-1 through FR-5) and Non-Functional (NFR-1 through NFR-4) requirements.
   - Acceptance criteria for every core requirement (AC-1 through AC-10).
   - 7 Risk categories analyzed with severity and mitigation strategies.
   - Milestones, dependencies, and prioritized backlog.
2. `docs/discovery_brief.md`: Detailed discovery brief with background, persona JTBD, architecture trade-offs, and hardware profiling.
3. `docs/prd.md`: Synchronized documentation copy of `PRD.md`.
4. `agent-transcripts/phase-1-discovery.md`: This execution log and environment audit.

---

## 4. Phase 1 Acceptance Criteria Checklist
- [x] Primary users and their jobs to be done documented.
- [x] Problems and proposed solution articulated.
- [x] Measurable success metrics defined (TTFT < 2.5s, RAM < 4.5GB, 100% citation accuracy, 100% refusal rate on ungrounded queries).
- [x] Assumptions and open questions documented.
- [x] In-scope vs. out-of-scope features clearly delineated.
- [x] Mandatory assignment requirements distinguished from optional enhancements.
- [x] User journeys for grounded Q&A, follow-up questions, essay generation, and artifact creation fully specified.
- [x] Functional (FR-1 to FR-5) and non-functional requirements (NFR-1 to NFR-4) detailed.
- [x] Testable acceptance criteria for every core requirement specified (AC-1 to AC-10).
- [x] 7 critical risks analyzed: hallucinations, data provenance, model latency, memory constraints, privacy, database outages, and unsafe HTML.
- [x] Milestones, dependencies, and prioritized implementation backlog mapped.
- [x] Zero application implementation code written (scaffold reserved for subsequent phases).
- [x] No secrets recorded in transcripts.
