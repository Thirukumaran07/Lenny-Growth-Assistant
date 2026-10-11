# Phase 8 Manual Smoke-Test Checklist

> **Status:** Phase 8 Complete
> **Environment:** `npm run dev` in `/frontend` and `uvicorn backend.app.main:app --reload` in root.
> **Base URL:** http://localhost:5173

---

## Prerequisites

- [ ] Backend starts without errors (`uvicorn backend.app.main:app --reload`)
- [ ] `GET /api/health` returns `{"status": "healthy"}`
- [ ] `GET /api/ready` returns `{"status": "ready"}` or `"degraded"` (DB healthy)
- [ ] Frontend dev server starts (`npm run dev` in `/frontend`)
- [ ] `npm test` passes — **41 tests in 4 files**

---

## 1. Session Sidebar

### 1.1 Session List & Grouping
- [ ] Sessions grouped under **Today**, **Previous 7 Days**, and **Older** headings
- [ ] Active session has left blue accent border and highlighted background

### 1.2 New Chat Action
- [ ] Clicking **New Chat** creates a new empty session
- [ ] Pressing **Cmd+N** / **Ctrl+N** creates a new chat session (global shortcut)
- [ ] New session appears at the top of the list
- [ ] Chat area shows empty state / starter cards after new session

### 1.3 Session Search (Cmd+K)
- [ ] Pressing **Cmd+K** / **Ctrl+K** focuses the search input
- [ ] Typing filters session titles in real time
- [ ] "No matching sessions" message when search yields nothing
- [ ] Clear X button inside search clears the filter

### 1.4 Session Rename
- [ ] Double-clicking a session title shows an inline text input
- [ ] Clicking the pencil icon on hover also opens inline rename
- [ ] Pressing **Enter** saves; **Escape** reverts
- [ ] Renamed title persists after page reload (stored in backend via PATCH /api/sessions/:id)

### 1.5 Session Delete
- [ ] Clicking the trash icon shows a confirmation popover
- [ ] Clicking **Confirm** deletes the session and removes it from the list
- [ ] Clicking **Cancel** dismisses without deleting
- [ ] Deleting the active session auto-selects the next available session

---

## 2. History Reload

- [ ] Refreshing the page reloads the session list (GET /api/sessions)
- [ ] Clicking a session in the sidebar loads its full message history (GET /api/sessions/:id)
- [ ] Message timestamps are visible on each message
- [ ] Previous citations on historical messages are clickable and open the drawer
- [ ] Switching between two sessions correctly shows each session's messages

---

## 3. New Chat Behavior

- [ ] New empty session shows the **Welcome / Empty State** view
- [ ] Four starter prompt cards are displayed with icons, titles, and descriptions
- [ ] Clicking a starter card auto-populates and submits the prompt
- [ ] Starter cards are disabled while a response is streaming

---

## 4. Message Sending & Streaming

### 4.1 Composer
- [ ] **Enter** submits the prompt
- [ ] **Shift+Enter** inserts a newline (does NOT submit)
- [ ] Prompt textarea auto-resizes (up to ~5 lines)
- [ ] Character count shows `n / 4000`; turns red and disables Send above 4000
- [ ] Sending while Ollama is offline shows the error banner with `ollama serve` hint

### 4.2 Streaming State
- [ ] Status badge shows stage labels: "Analyzing intent & routing skill...", "Searching Lenny podcast archives...", "Generating grounded response..."
- [ ] Tokens render in real-time with pulsing cursor `|`
- [ ] **Stop** button (square icon) cancels generation

### 4.3 Completed Response
- [ ] Full response renders as structured Markdown (headings, lists, code blocks, tables)
- [ ] No raw HTML is injected from the assistant response (markdown-to-jsx only)
- [ ] **Copy** button appears on completed messages; shows checkmark for 2s

---

## 5. Citations

### 5.1 Citation Pill Badges
- [ ] Citations appear below the response in green pill badges: `● [n] Guest Name  timestamp`
- [ ] "Verified Transcript Sources (n)" label shown
- [ ] Hovering a citation badge highlights it

### 5.2 Citation Drawer
- [ ] Clicking a badge opens the Citation Drawer from the right
- [ ] Drawer shows: Episode Title, Guest Name badge, Timestamp badge, Cosine Match %
- [ ] Verbatim transcript quote in styled blockquote
- [ ] If `source_url` is set, "Open Verified Source Episode" links to the real podcast URL (new tab, `rel="noopener noreferrer"`)
- [ ] Multiple citations show a tab bar to switch between sources
- [ ] Pressing **Escape** closes the drawer

---

## 6. Provider / Model Status

- [ ] Model indicator in header shows icon + model name + status dot
- [ ] Green dot = Ollama healthy; Red dot = unreachable; Amber = degraded
- [ ] Clicking the model badge opens Provider Switcher popover
- [ ] Popover shows Local Ollama with memory footprint (~2.0 GB RAM)
- [ ] Switching to Cloud OpenAI without API key shows an error
- [ ] Refresh button in popover re-fetches provider health
- [ ] System health badge shows **Ready** / **Degraded** / **Unhealthy** with color-coded dot

---

## 7. Error States

### 7.1 Ollama Offline
- [ ] Stopping Ollama shows red error banner with message
- [ ] Banner includes remediation: `ollama serve` in Terminal
- [ ] **Retry** button replays the last prompt without re-typing
- [ ] Dismiss X clears the banner

### 7.2 Database Disconnected
- [ ] Sidebar footer shows "Connecting..." with amber dot when DB unreachable
- [ ] System health badge shows **Unhealthy**

### 7.3 Insufficient Evidence
- [ ] Low-confidence queries show amber banner: "Insufficient Evidence in Transcripts"
- [ ] Suggested follow-up topics shown below the warning

---

## 8. Session-Specific Follow-up Context

- [ ] After a response with citations, "Suggested follow-ups" chips appear below the last message
- [ ] Follow-up chips reference the guest from citations
- [ ] Clicking a chip sends that prompt in the same session
- [ ] Chips disappear during streaming and reappear after

---

## 9. Keyboard Navigation

| Shortcut | Expected Behavior |
|---|---|
| `Cmd+N` / `Ctrl+N` | Creates new chat session |
| `Cmd+K` / `Ctrl+K` | Focuses session search input |
| `Enter` in composer | Submits prompt |
| `Shift+Enter` in composer | Inserts newline |
| `Escape` | Closes citation drawer |
| `Cmd+\` / `Ctrl+\` | Toggles Artifact Viewer skeleton |
| `Tab` / `Shift+Tab` | Navigates with visible focus rings (2px blue outline) |

---

## 10. Accessibility

- [ ] All interactive elements have descriptive `aria-label` or `title` attributes
- [ ] Session list has `role="list"` with `role="listitem"` rows
- [ ] Chat history has `role="region" aria-label="Chat conversation history"` with `aria-live="polite"`
- [ ] Streaming status has `aria-live="polite"`
- [ ] Error banner has `role="alert" aria-live="assertive"`
- [ ] Citation drawer has `role="dialog" aria-modal="true"`
- [ ] Focus rings visible on keyboard nav (`2px solid #3B82F6`)
- [ ] Color contrast meets WCAG 2.1 AA (#F9FAFB on #111827 = 14.8:1)

---

## 11. Automated Test Suite

```bash
cd frontend
npm test
# Expected:
# Test Files  4 passed (4)
#      Tests  41 passed (41)
```

- `ChatComposer.test.tsx` — 8 tests
- `ChatMessageItem.test.tsx` — 11 tests
- `Sidebar.test.tsx` — 12 tests
- `apiClient.test.ts` — 10 tests

---

## Out of Scope (Phase 9)

- [ ] Artifact Viewer (sandboxed iframe, Preview/Code tabs, Download)
- [ ] Artifact tile cards in the message stream
