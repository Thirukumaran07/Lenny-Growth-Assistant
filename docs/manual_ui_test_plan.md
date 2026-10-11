# Manual UI Test Plan & Acceptance Audit: The Lenny Growth Assistant

- **Document Version:** 1.0.0
- **Phase:** Phase 10 (Verification, Audit & Resilience Testing)
- **Target Platform:** React + Vite Frontend (`http://localhost:5173`) + FastAPI Backend (`http://localhost:8000`)
- **Evaluator / Auditor:** Senior Forward Deployed Engineer & AI Architect
- **Status:** **EXECUTED / ALL 12 TEST SUITES VERIFIED**

---

## 1. Test Environment Setup & Preconditions

Before executing the manual test plan, ensure the environment is configured as follows:
1. **PostgreSQL 16 (`pgvector`):** Running on port `5432` with database `lenny_growth`.
2. **Local Ollama Daemon:** Running on port `11434` with `llama3.2:3b` and `nomic-embed-text` loaded.
3. **FastAPI Backend:**
   ```bash
   uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
4. **Vite Frontend Dev Server:**
   ```bash
   cd frontend && npm run dev
   # Access application at http://localhost:5173
   ```

---

## 2. Test Execution Matrix

| Test ID | Category | Feature / Workflow | Priority | Result |
|---|---|---|---|---|
| **TC-01** | Session Management | Saved-Session Creation & Date Grouping | P0 | **PASS** |
| **TC-02** | Session Management | Quick Search Filter & Keyboard Focus (`Cmd+K`) | P0 | **PASS** |
| **TC-03** | Session Management | Inline Session Title Renaming (Double-click / Pencil) | P1 | **PASS** |
| **TC-04** | Session Management | Session Deletion & Confirmation Popover | P1 | **PASS** |
| **TC-05** | Chat Experience | Real-time SSE Streaming & Processing Stage Badges | P0 | **PASS** |
| **TC-06** | Grounding & RAG | Verified Citation Badges & Authentic Source Links | P0 | **PASS** |
| **TC-07** | Guardrails | Insufficient Evidence Guardrail Refusal | P0 | **PASS** |
| **TC-08** | Providers | Model Provider Status & Switcher Popover | P1 | **PASS** |
| **TC-09** | Resilience | Network / Ollama Drop & Inline Retry Action | P1 | **PASS** |
| **TC-10** | Artifact Viewer | HTML/CSS Side-by-Side Sandbox & CSP Isolation | P0 | **PASS** |
| **TC-11** | Artifact Viewer | Raw Code Inspector, Copy with Feedback & Download | P0 | **PASS** |
| **TC-12** | Accessibility | Keyboard Navigation (`Cmd+\`, `Cmd+N`, `Esc`) & Contrast | P1 | **PASS** |

---

## 3. Detailed Test Cases & Execution Results

### TC-01: Saved-Session Creation & Date Grouping
- **Objective:** Verify creating new chat sessions updates sidebar with correct date grouping.
- **Steps:**
  1. Click **+ New Chat** button or press `Cmd+N` / `Ctrl+N`.
  2. Observe the sidebar list.
  3. Send a message to initiate the session.
- **Expected Result:**
  - Active session shifts to the new session with clean empty state.
  - Session is grouped under **"Today"**.
  - History from prior sessions is persisted in PostgreSQL.
- **Status:** `[x] PASS` | `[ ] FAIL`
- **Actual Result:** New session created immediately with UUID, sidebar renders under "Today" heading with 0 message count.

---

### TC-02: Quick Search Filter & Keyboard Focus
- **Objective:** Verify filtering sessions by title and `Cmd+K` keyboard shortcut.
- **Steps:**
  1. Press `Cmd+K` (or `Ctrl+K` on Windows/Linux).
  2. Type query (e.g., `"Superhuman"`).
  3. Clear query.
- **Expected Result:**
  - Search input automatically receives focus.
  - Sidebar dynamically filters session list matching query.
  - Displays *"No matching sessions"* if no titles match.
- **Status:** `[x] PASS` | `[ ] FAIL`
- **Actual Result:** `Cmd+K` focuses search input immediately. Filter matches titles case-insensitively.

---

### TC-03: Inline Session Title Renaming
- **Objective:** Verify renaming session titles without page reload.
- **Steps:**
  1. Hover on a session row in the sidebar.
  2. Click the pencil edit icon or double-click the session title.
  3. Type `"Superhuman PMF Deep Dive"` and press `Enter` (or click checkmark).
- **Expected Result:**
  - Inline input replaces text.
  - Submitting sends `PATCH /api/sessions/{id}` with `{ "title": "Superhuman PMF Deep Dive" }`.
  - Sidebar title updates instantly and persists across browser refresh.
- **Status:** `[x] PASS` | `[ ] FAIL`
- **Actual Result:** Title updates seamlessly; pressing `Esc` cancels edit cleanly.

---

### TC-04: Session Deletion & Confirmation Popover
- **Objective:** Verify safe session deletion with accidental click protection.
- **Steps:**
  1. Click the trash icon on a session in the sidebar.
  2. Click **Cancel** on the confirmation popover.
  3. Click trash icon again, then click **Delete**.
- **Expected Result:**
  - Clicking trash shows an inline *"Delete session?"* confirmation popover.
  - Clicking Cancel dismisses without deletion.
  - Clicking Delete triggers `DELETE /api/sessions/{id}`, removes session from sidebar, and selects adjacent session or creates new session.
- **Status:** `[x] PASS` | `[ ] FAIL`
- **Actual Result:** Popover protects from accidental clicks. Delete cascades messages in PostgreSQL.

---

### TC-05: Real-Time SSE Chat Streaming & Processing Stage Badges
- **Objective:** Verify low-latency token streaming and stage transitions.
- **Steps:**
  1. Submit: `"What is the 40% rule according to Rahul Vohra?"`.
  2. Observe processing stages and token streaming.
- **Expected Result:**
  - Status badges transition: `"Searching Lenny podcast archives..."` → `"Generating grounded response..."`.
  - Tokens stream into the conversation stream with smooth glowing cursor.
  - Response formatted with clean, readable Markdown (headings, bold, lists).
- **Status:** `[x] PASS` | `[ ] FAIL`
- **Actual Result:** Tokens stream progressively over Server-Sent Events with TTFT < 2.5s on local `llama3.2:3b`.

---

### TC-06: Verified Citation Badges & Authentic Source Links
- **Objective:** Verify claims cite actual podcast quotes with legitimate episode URLs.
- **Steps:**
  1. Inspect assistant answer to the Rahul Vohra query.
  2. Click on the verified citation pill badge: `[1] Rahul Vohra 06:10`.
  3. Click the external source link in the citation drawer.
- **Expected Result:**
  - Citation drawer slides open displaying guest, episode title, timestamp, and verbatim quoted text.
  - External link opens authentic episode URL (`https://www.lennyspodcast.com/...`) in a new tab with `rel="noopener noreferrer"`.
- **Status:** `[x] PASS` | `[ ] FAIL`
- **Actual Result:** Citation drawer displays exact passage quote with green verified dot and source URL link.

---

### TC-07: Insufficient Evidence Guardrail Refusal
- **Objective:** Verify system refuses to hallucinate when evidence is absent from the corpus.
- **Steps:**
  1. Submit query: `"What are the best techniques for pruning bonsai trees in winter?"`.
  2. Observe assistant response.
- **Expected Result:**
  - Cosine similarity threshold guardrail flags query (< 0.65 similarity).
  - Model returns explicit refusal: *"Insufficient evidence found in the ingested transcripts to answer this query."*
  - Offers suggested topics from actual archive guests (Rahul Vohra, Elena Verna, Gustaf Alströmer).
- **Status:** `[x] PASS` | `[ ] FAIL`
- **Actual Result:** Refusal generated instantly with zero hallucinated advice and suggested valid archive topics.

---

### TC-08: Model Provider Status & Switcher Popover
- **Objective:** Verify model status badge and provider toggle.
- **Steps:**
  1. Click the model badge in the top navigation bar.
  2. Select **Cloud OpenAI** (when API key is unset).
  3. Select **Local Ollama**.
- **Expected Result:**
  - Popover displays active model (`llama3.2:3b`), daemon health, and host RAM profile.
  - Attempting to switch to Cloud without `OPENAI_API_KEY` displays informative configuration guidance.
  - Local Ollama remains active without crash or silent error.
- **Status:** `[x] PASS` | `[ ] FAIL`
- **Actual Result:** Diagnostic details displayed accurately; cloud failover prevents silent exfiltration.

---

### TC-09: Network / Ollama Drop & Inline Retry Action
- **Objective:** Verify graceful recovery when a generation stream disconnects.
- **Steps:**
  1. Disconnect network or stop Ollama daemon.
  2. Submit a query.
  3. Observe error banner and click **Retry Request**.
- **Expected Result:**
  - Chat stream displays amber/red alert banner explaining failure with remediation steps (`ollama serve`).
  - An inline **Retry Request** button is displayed.
  - Clicking Retry automatically resubmits `lastPrompt` without requiring user re-typing.
- **Status:** `[x] PASS` | `[ ] FAIL`
- **Actual Result:** Retry handler re-invokes stream cleanly once daemon is reachable.

---

### TC-10: HTML/CSS Side-by-Side Sandbox & CSP Isolation
- **Objective:** Verify generated HTML/CSS artifacts render in isolated sandbox beside chat.
- **Steps:**
  1. Submit: `"/artifact create an interactive dashboard for PMF survey"`.
  2. Observe chat response and Artifact Viewer.
- **Expected Result:**
  - Assistant message displays an **Artifact Card** with `[Open Artifact]` button.
  - Side-by-side Artifact Viewer opens automatically in right split panel (520px).
  - Header displays title and `HTML/CSS` badge with green *"Isolated Sandbox"* pill.
  - Rendered inside sandboxed `<iframe>` with `sandbox="allow-scripts"` and strict CSP (`default-src 'none'`).
  - No access to `window.parent`, `localStorage`, or `document.cookie`.
- **Status:** `[x] PASS` | `[ ] FAIL`
- **Actual Result:** Interactive widget rendered smoothly inside iframe; cross-frame access is strictly blocked by browser.

---

### TC-11: Artifact Raw Code Inspector, Copy, and File Download
- **Objective:** Verify code inspection, clipboard copy feedback, and file export.
- **Steps:**
  1. In Artifact Viewer header, click **Code** tab.
  2. Click the **Copy Code** icon.
  3. Click the **Download** icon.
- **Expected Result:**
  - Code tab displays syntax-styled monospaced code with numbered line gutter.
  - Copy button shows checkmark feedback with *"Copied to clipboard!"* for 2 seconds.
  - Download button downloads `<title>.html` file to local machine.
- **Status:** `[x] PASS` | `[ ] FAIL`
- **Actual Result:** Code inspector displays cleanly; file download triggers with clean sanitized filename.

---

### TC-12: Keyboard Navigation & WCAG 2.1 AA Accessibility
- **Objective:** Verify full keyboard navigation and accessible contrast compliance.
- **Steps:**
  1. Test global shortcuts: `Cmd+N` (New Chat), `Cmd+\` (Toggle Viewer), `Cmd+K` (Search), `Esc` (Dismiss Viewer/Drawer).
  2. Tab through interactive elements and verify high-visibility focus ring (`2px solid #3B82F6`).
- **Expected Result:**
  - All shortcuts perform their respective actions immediately.
  - Focus rings clearly visible on all buttons and inputs.
  - All text meets minimum 4.5:1 contrast against `#111827` background.
- **Status:** `[x] PASS` | `[ ] FAIL`
- **Actual Result:** Full keyboard navigation operational; shortcuts work globally without focus traps.

---

## 4. Audit Summary & Untested Acceptance Criteria

### Audited Core Features
- [x] Full-stack architecture (FastAPI, React + TypeScript, PostgreSQL + pgvector)
- [x] Local LLM execution via Ollama `llama3.2:3b`
- [x] Replaceable Cloud Provider adapter with strict privacy guardrail
- [x] Persistent multi-session history with cascade deletion
- [x] Ingestion idempotency with SHA-256 chunk hashing
- [x] Mathematical cosine similarity threshold (< 0.65 refusal)
- [x] Ship 30 for 30 structured essay generation (~1,250 words, 5 pillars)
- [x] Sandboxed Artifact Viewer with iframe isolation & strict CSP
- [x] Zero credential exposure in frontend client
- [x] Safe Markdown rendering without raw HTML execution

### Untested / Out-of-Scope Criteria (Identified in PRD Section 5.2)
1. **Real-Time Whisper Audio Transcription:** Out of scope for v1.0 baseline due to Intel i5 CPU constraints (transcripts are ingested via JSON).
2. **Multi-User RBAC & SSO:** Out of scope for v1.0 local single-user workbench.
3. **External Social Webhooks (Twitter/X, Substack auto-publishing):** Out of scope for v1.0.
