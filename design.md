# UI/UX Design Specification: The Lenny Growth Assistant

- **Document Version:** 1.0.0
- **Status:** Approved / Phase 2 Baseline
- **Target Platform:** Desktop / Web (Optimized for >= 1024px, responsive down to 375px mobile)
- **Design System:** Obsidian Slate (Dark Mode First, High-Contrast WCAG AA, Typography: Inter / Fira Code)

---

## 1. Overview & Visual Design Language

"The Lenny Growth Assistant" is designed as a focused, high-density practitioner workbench. It avoids generic chatbot patterns in favor of a dual-pane productivity workspace (similar to modern IDEs and research interfaces like Cursor, Linear, and Perplexity).

### 1.1 Color Tokens & Palette

| Token Name | Hex Code | HSL | Usage |
|---|---|---|---|
| `--bg-base` | `#0B0F17` | `220°, 35%, 7%` | Root application background |
| `--bg-surface` | `#111827` | `220°, 38%, 11%` | Sidebar, message bubbles, panels |
| `--bg-surface-elevated`| `#1F2937` | `220°, 28%, 17%` | Modals, citation drawers, active cards |
| `--bg-input` | `#161F30` | `220°, 37%, 14%` | Input textareas, search inputs |
| `--border-subtle` | `#1F293D` | `220°, 33%, 18%` | Panel borders, dividers |
| `--border-focus` | `#3B82F6` | `217°, 91%, 60%` | Keyboard focus outlines |
| `--text-primary` | `#F9FAFB` | `210°, 20%, 98%` | Primary titles, chat responses |
| `--text-secondary` | `#9CA3AF` | `220°, 9%, 65%` | Timestamps, metadata, labels |
| `--text-muted` | `#6B7280` | `220°, 9%, 46%` | Disabled text, subtle footers |
| `--accent-primary` | `#3B82F6` | `217°, 91%, 60%` | Primary CTAs, active highlights |
| `--accent-hover` | `#2563EB` | `221°, 83%, 53%` | Button hover states |
| `--accent-growth` | `#10B981` | `160°, 84%, 39%` | Lenny Brand / Grounded badges |
| `--warning` | `#F59E0B` | `38°, 92%, 50%` | Insufficient evidence / alerts |
| `--danger` | `#EF4444` | `0°, 84%, 60%` | Errors, connection drops, deletion |

### 1.2 Typography Hierarchy
- **Font Family:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace Family (Code & Artifacts):** `"JetBrains Mono", "Fira Code", monospace`
- **Headings:**
  - `H1 (Page/Title):` 20px / 600 weight / Line height 28px
  - `H2 (Section/Card):` 16px / 600 weight / Line height 24px
  - `H3 (Subheading):` 14px / 600 weight / Line height 20px
- **Body & Chat:**
  - `Body Regular:` 14px / 400 weight / Line height 22px
  - `Body Strong:` 14px / 600 weight / Line height 22px
  - `Caption / Metadata:` 12px / 400 weight / Line height 16px
  - `Inline Badges / Citations:` 11px / 500 weight / Line height 14px

---

## 2. Layout Architecture & Responsive Breakpoints

The workspace uses a 3-column flexible CSS Grid / Flexbox layout:
1. **Left Column: Session Sidebar (260px fixed width, collapsible)**
2. **Center Column: Chat Conversation Stream (min 480px, flexible 1fr)**
3. **Right Column: Side-by-Side Artifact Viewer (520px default, resizable/collapsible)**

```
+----------------------------------------------------------------------------------------------------+
| TOP HEADER: App Title | Model Indicator: [● Ollama llama3.2:3b] | Cloud Toggle | New Chat Button  |
+-------------------+----------------------------------------------------+---------------------------+
| SESSION SIDEBAR   | MAIN CONVERSATION STREAM                           | ARTIFACT VIEWER (SPLIT)   |
| (260px)           | (Flexible 1fr)                                     | (520px / Collapsible)     |
|                   |                                                    |                           |
| [Search sessions] | [User Message]                                     | [Tabs: Preview | Code]   |
| + New Session     |  "What are Figma's onboarding metrics?"            | Title: Growth Flywheel    |
|                   |                                                    | Type: HTML/CSS            |
| Recent Sessions:  | [Assistant Grounded Response]                      | +-----------------------+ |
| ● Retention Q&A   |  "According to Amanda Kleha [1], Figma focused on  | | [Sandboxed <iframe>]  | |
| ● Ship30: Miro PLG|   collaborative activation..."                     | |                       | |
| ● PMF Benchmarks  |                                                    | | Interactive visual    | |
|                   |  [Citation Drawer: 1 Citation Verified]            | | rendered card         | |
|                   |  - [1] Amanda Kleha - Onboarding Playbook (12:30)  | |                       | |
|                   |                                                    | +-----------------------+ |
|                   |  [Artifact Card: Figma Onboarding Framework HTML]  | [Actions: Copy | Download]|
|                   |  [Open in Viewer ->]                               |                           |
|                   |                                                    |                           |
| System Health:    |----------------------------------------------------|                           |
| DB: OK | LLM: OK  | INPUT AREA: [Ask a growth question or /essay...] [Send]|                           |
+-------------------+----------------------------------------------------+---------------------------+
```

### Responsive Breakpoints
- **Desktop (>= 1280px):** Full 3-pane experience. Sidebar, chat, and artifact viewer can all be open simultaneously.
- **Laptop / Tablet Landscape (1024px - 1279px):** Sidebar collapses to an icon rail or slide-over drawer when artifact viewer is active, maintaining chat readability.
- **Tablet Portrait (768px - 1023px):** Artifact viewer transitions from side-by-side to a sliding full-height drawer (overlay mode) with a close button.
- **Mobile (< 768px):** Single active view at a time (Bottom navigation or hamburger drawer to toggle between Sessions, Chat, and Artifact).

---

## 3. Session Sidebar Specifications

### 3.1 Features & Interactions
- **Session List:** Chronologically grouped (`Today`, `Previous 7 Days`, `Older`).
- **Active Indicator:** Highlighted background (`--bg-surface-elevated`) with active left border (`3px solid --accent-primary`).
- **Inline Actions on Hover:**
  - Rename Session: Inline text input on double-click or pencil icon.
  - Delete Session: Trash icon with immediate confirmation popover (`Delete session? [Cancel] [Confirm]`).
- **New Session Button (`+ New Chat`):** Prominently placed at top with keyboard shortcut indicator (`Cmd+N` / `Ctrl+N`).
- **Filter / Search Input:** Debounced instant filter across session titles.

---

## 4. Chat Conversation Stream & Citations

### 4.1 Message Bubbles
- **User Message:** Right-aligned or distinct inset box with subtle primary tint (`--bg-surface-elevated`), showing user query and timestamp.
- **Assistant Message:** Left-aligned full-width bubble (`--bg-surface`), clean Markdown rendering, code highlighting, and structured citation anchors.

### 4.2 Citations Display
Citations are rendered as interactive, pill-shaped inline badges:
- **Visual Presentation:** `[1 Elena Verna - 14:20]` styled with green verified dot (`●`), background `#064E3B`, text `#6EE7B7`, border `1px solid #059669`.
- **Interaction (Click/Hover):**
  - Clicking an inline citation opens the **Citation Drawer** underneath the message.
  - The drawer displays:
    1. Guest Name & Headshot / Avatar icon.
    2. Episode Title & Original Air Date.
    3. Verbatim Transcript Quote with exact matching text highlighted.
    4. Similarity Confidence Score (e.g., `Confidence: 89%`).
    5. Direct Link / Timestamp jump.

---

## 5. Model Provider Indicator & Switcher

Located prominently in the top navigation header:
- **Indicator Badge:**
  - `Green Dot (●)`: Local Ollama active (`llama3.2:3b`). Zero data leaves machine.
  - `Blue Dot (●)`: Cloud Provider active (`OpenAI gpt-4o-mini` or `Anthropic claude-3-5-sonnet`).
  - `Amber Dot (▲)`: Degraded state / Fallback in effect (e.g., Ollama offline, switched to Cloud).
  - `Red Dot (✖)`: Offline / Model service unreachable.
- **Provider Switcher Popover:**
  - Toggle between **Local Ollama (Default)** and **Cloud Provider**.
  - Displays local model memory usage estimate (~2.0 GB) and health ping status.
  - If Cloud is selected but API key is missing, provides an inline configuration modal explaining `.env` variable setup.

---

## 6. Comprehensive UI State Machine

```
+---------------------------------------------------------------------------------+
|                             UI STATE TRANSITIONS                                |
+---------------------------------------------------------------------------------+
|                                                                                 |
|   +---------------+         User Sends Query         +---------------------+    |
|   |  EMPTY STATE  | -------------------------------> |   STREAMING STATE   |    |
|   | (Starter Prompts)                                | (Shimmer + SSE Feed)|    |
|   +---------------+                                  +---------------------+    |
|                                                                 |               |
|                                                                 |               |
|            +-----------------------+----------------------------+               |
|            | Similarity < 0.65     | Similarity >= 0.65         | Network / 503 |
|            v                       v                            v               |
|   +---------------------+  +---------------------+   +----------------------+   |
|   | INSUFFICIENT EV.    |  |  GROUNDED ANSWER    |   |     ERROR STATE      |   |
|   | Explicit Refusal &  |  | Response + Badges + |   |  Diagnose & Retry    |   |
|   | Suggested Topics    |  | Linked Artifacts    |   |  Banner & Actions    |   |
|   +---------------------+  +---------------------+   +----------------------+   |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

### 6.1 State Specifications
1. **Empty State:**
   - Displayed when a new session has 0 messages.
   - Shows "The Lenny Growth Assistant" badge with curated starter cards:
     - *"How did Superhuman measure product-market fit?"*
     - *"Write a Ship 30 for 30 essay on Miro's product-led growth flywheel."*
     - *"What retention benchmarks should a seed-stage B2B SaaS target?"*
     - *"Generate an HTML visual cheat sheet for Figma's onboarding loop."*
   - Clicking any starter card automatically populates and submits the query.

2. **Loading / Streaming State:**
   - Input bar disabled with animated pulsing status: *"Retrieving Lenny's transcripts..."* -> *"Synthesizing with llama3.2:3b..."*.
   - Streamed tokens render in real time with an unobtrusive cursor pulse (`|`).
   - Stop button (`■ Stop Generating`) allows user to cancel inference at any moment.

3. **Insufficient Evidence State:**
   - Triggered when vector retrieval confidence is below threshold (< 0.65).
   - Displayed with an amber warning badge (`▲ Insufficient Evidence in Transcripts`).
   - Standard message copy:
     > *"Insufficient evidence found in the ingested transcripts to answer this query grounded in Lenny's podcast archive."*
   - Offers helpful follow-up suggestions (e.g., *"Try asking about Product-Market Fit, Retention Loops, or Pricing Models from ingested guests."*).

4. **Error & Disconnect State:**
   - Displayed if Ollama daemon terminates or database connection fails.
   - Distinct red alert container with concrete, copy-pasteable remediation steps:
     - E.g., *"Cannot connect to Ollama at localhost:11434. Please open Terminal and run `ollama serve`, or switch to the Cloud Provider in the top bar."*
     - **[Retry Request]** button to replay the last query without re-typing.

---

## 7. Side-by-Side Artifact Viewer & Sandboxing UI

### 7.1 Visual Layout
- Placed in the right split panel, separated by a draggable border divider.
- Header Bar contains:
  - Artifact Title and badge (`HTML/CSS` or `Markdown`).
  - View Toggle: **[Visual Preview]** | **[Raw Code]**.
  - Action Buttons:
    - **[Copy Code]** (copies with checkmark feedback).
    - **[Download]** (triggers `.html` or `.md` file download).
    - **[Close Viewer]** (`Esc` or `✕` icon).

### 7.2 Security Sandbox Container
- Visual preview rendered strictly via an `<iframe>`:
  ```html
  <iframe
    title="Artifact Sandbox"
    sandbox="allow-scripts"
    csp="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:;"
    srcdoc="<!DOCTYPE html><html>...</html>"
    class="w-full h-full border-0 bg-white"
  />
  ```
- Transparent visual border indicates isolated sandbox mode.

---

## 8. Accessibility & Keyboard Navigation

### 8.1 Accessibility (WCAG 2.1 AA Standards)
- **Contrast Ratios:** All text elements adhere to minimum 4.5:1 contrast against their respective backgrounds (e.g., `#F9FAFB` on `#111827` provides 14.8:1 contrast).
- **Focus Rings:** High-visibility focus indicator (`2px solid #3B82F6` with 2px offset) on all interactive elements during keyboard navigation.
- **ARIA Semantics:**
  - `role="region" aria-label="Chat conversation history"`
  - `role="complementary" aria-label="Artifact preview pane"`
  - `aria-live="polite"` on streaming response containers for screen reader announcements.

### 8.2 Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| `Cmd + K` / `Ctrl + K` | Focus Quick Search / Session Switcher | Global |
| `Cmd + N` / `Ctrl + N` | Create New Chat Session | Global |
| `Enter` | Submit Prompt (when not holding Shift) | Prompt Input |
| `Shift + Enter` | Insert New Line in Prompt | Prompt Input |
| `Esc` | Close Artifact Viewer / Dismiss Citation Drawer | Global |
| `Cmd + \` / `Ctrl + \` | Toggle Side-by-Side Artifact Viewer | Global |
| `Tab` / `Shift + Tab` | Navigate interactive elements sequentially | Global |
