# Phase 1 Transcript: Discovery, Environment Verification & PRD

## Date: 2026-10-11
## Agent: Senior Forward Deployed Engineer & AI Architect
## Objective:
Execute Phase 1 requirements discovery, audit host environment, evaluate hardware constraints (Intel Core i5, 8 GB RAM), specify agent architecture, and establish formal testable acceptance criteria.

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
- **Integrity Guarantee:** We will explicitly document this decision in `design.md` and `architecture.md` without falsely claiming to use third-party proprietary agent SDKs.

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

## 3. Artifacts Created in Phase 1
- `docs/discovery_brief.md`: Problem statement, persona definition, constraints, and scope boundaries.
- `docs/prd.md`: Formal PRD with 5 Functional Requirement clusters, 4 Non-Functional clusters, and 9 testable Acceptance Criteria.
- `agent-transcripts/phase-1-discovery.md`: This execution log.

---

## 4. Phase 1 Acceptance Criteria Checklist
- [x] Host environment inspected (Python 3.12, Node v26, Docker 29, Ollama models verified).
- [x] Hardware constraints analyzed (Intel i5, 8GB RAM profile established).
- [x] Discovery Brief compiled in [discovery_brief.md](file:///Users/apple/Downloads/Lenny-Growth-Assistant/docs/discovery_brief.md).
- [x] Complete, testable PRD produced in [prd.md](file:///Users/apple/Downloads/Lenny-Growth-Assistant/docs/prd.md).
- [x] Agent layer approach justified and documented.
- [x] No unauthorized code written before Phase 1 completion.
- [x] Transcript record maintained without secrets.
