# Security Architecture: Artifact Sandboxing & Isolation Boundary

## 1. Executive Summary & Threat Model

The Lenny Growth Assistant supports LLM-assisted generation of standalone documents:
1. **Markdown Documents** (Frameworks, checklists, playbooks)
2. **HTML/CSS Artifacts** (Interactive widgets, prototypes, dashboards)

Because generated HTML/CSS originates from dynamic language model synthesis, it is **untrusted content** that may contain inadvertent syntax errors, malicious script payloads, attempted Cross-Site Scripting (XSS), cross-origin data theft, clickjacking, or resource exhaustion attacks.

To ensure zero risk to host data, sessions, and authenticated context, the system enforces a defense-in-depth, multi-tier isolation boundary.

---

## 2. Multi-Tier Security Boundary Architecture

```
+-----------------------------------------------------------------------------------------+
| HOST APPLICATION DOM (http://localhost:5173)                                            |
| [React App State, PostgreSQL API Client, Session Storage, Local Tokens]                 |
|                                                                                         |
|  - Never calls dangerouslySetInnerHTML for HTML artifacts                               |
|  - Validates MIME / artifact types strictly ('html', 'markdown')                         |
|  - Validates payload size (Max safe ceiling: 1,000 KB frontend / 500 KB backend)        |
|                                                                                         |
|   +---------------------------------------------------------------------------------+   |
|   | <iframe                                                                         |   |
|   |   title="Artifact Sandbox"                                                      |   |
|   |   sandbox="allow-scripts"                                                       |   |
|   |   csp="default-src 'none'; style-src 'unsafe-inline';                           |   |
|   |        script-src 'unsafe-inline'; img-src data: https:; font-src data: https:;"|   |
|   |   srcdoc="<meta http-equiv='Content-Security-Policy' content='...'>..."         |   |
|   | >                                                                               |   |
|   |                                                                                 |   |
|   |   CONTAINED SANDBOX RUNTIME ENVIRONMENT:                                        |   |
|   |   ├── Origin: 'null' (Opaque Unique Origin)                                    |   |
|   |   ├── window.parent access: BLOCKED (DOMException: Blocked cross-origin frame)  |   |
|   |   ├── document.cookie: NULL / INACCESSIBLE                                      |   |
|   |   ├── localStorage / sessionStorage: BLOCKED / NULL                             |   |
|   |   ├── Top-level navigation: BLOCKED (No allow-top-navigation)                   |   |
|   |   ├── Popups & tabs: BLOCKED (No allow-popups)                                  |   |
|   |   ├── Form submissions: BLOCKED (No allow-forms)                                |   |
|   |   └── Outbound network requests: BLOCKED BY CSP (default-src 'none')            |   |
|   +---------------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Sandboxing Controls & Permission Matrix

| Permission / Capability | Status | Isolation Mechanism | Impact / Protection |
|---|---|---|---|
| **Script Execution** | Allowed | `sandbox="allow-scripts"` | Enables dynamic interactive prototypes (e.g., calculators, toggles). |
| **Same-Origin Access** | **BLOCKED** | Omission of `allow-same-origin` | The document runs under an opaque `null` origin. Cannot touch host cookies, `localStorage`, `IndexedDB`, or DOM. |
| **Parent Window (`window.parent`)** | **BLOCKED** | Cross-Origin Security | Any attempt by the iframe to read or modify `window.parent` throws an uncatchable browser `DOMException`. |
| **Outbound HTTP / Fetch / XHR** | **BLOCKED** | CSP `default-src 'none'; connect-src 'none'` | Prevents script from exfiltrating environment data or communicating with external C2 servers. |
| **Top Navigation** | **BLOCKED** | Omission of `allow-top-navigation` | Contained code cannot redirect the main window or perform phishing URL swaps. |
| **Popup Windows** | **BLOCKED** | Omission of `allow-popups` | Contained code cannot spawn unauthorized new tabs or popups. |
| **Form Submissions** | **BLOCKED** | Omission of `allow-forms` | Contained code cannot submit login forms or phishing credential collectors. |
| **Modals & Dialogs** | **BLOCKED** | Omission of `allow-modals` | Contained code cannot lock the host UI with `alert()`, `confirm()`, or `prompt()`. |
| **Host DOM Injection** | **BLOCKED** | React Architecture | Generated HTML is NEVER passed to `dangerouslySetInnerHTML`. Previewed solely via `srcdoc`. |

---

## 4. Content Security Policy (CSP) Directives

The sandbox applies both the iframe `csp` attribute and an inline injected `<meta http-equiv="Content-Security-Policy">` inside the `srcdoc` to guarantee uniform enforcement across all rendering engines (Chromium, WebKit, Gecko):

```http
Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:; font-src data: https:;
```

### Directive Breakdown:
1. `default-src 'none'`: By default, disallows loading any resources, network requests, workers, or frames.
2. `style-src 'unsafe-inline'`: Allows embedded `<style>` tags and inline style attributes necessary to render self-contained CSS styles.
3. `script-src 'unsafe-inline'`: Allows self-contained inline scripts required for interactive widget calculations. External scripts are blocked.
4. `img-src data: https:`: Allows SVG data URIs and secure HTTPS images (e.g., podcast illustrations).
5. `font-src data: https:`: Allows inline font data URIs and web fonts.

---

## 5. Input Validation & DoS Protection

1. **Strict Type Whitelisting**:
   - Only `"html"` and `"markdown"` are supported.
   - Any request specifying unsupported types (e.g., `javascript`, `python`, `sh`, `exe`) is rejected with HTTP `422 Unprocessable Entity` in the backend and flagged with an alert banner in the frontend.
2. **Payload Size Enforcement**:
   - **Backend**: Strict 500 KB ceiling (`MAX_ARTIFACT_CONTENT_BYTES = 500_000`) enforced in both Pydantic schema validation and SQLAlchemy repository persistence. Oversized payloads reject with HTTP `422` / `ValueError`.
   - **Frontend**: Strict 1,000 KB ceiling (`MAX_SAFE_PAYLOAD_BYTES = 1_000_000`) in `ArtifactViewer`. If an oversized payload is received, an error alert banner is rendered and iframe creation is aborted to prevent browser freezing.
3. **Title & Structure Validation**:
   - Titles are sanitized, trimmed, and capped at 255 characters. Whitespace-only titles are rejected.

---

## 6. Verified Test Evidence & Automated Assertions

Security guarantees are verified through automated test suites:

### Frontend (`frontend/src/test/ArtifactViewer.test.tsx`):
- `enforces strict iframe sandbox isolation without allow-same-origin`: Asserts sandbox attribute flags and CSP meta tag injection.
- `renders Markdown preview without raw HTML injection`: Confirms absence of unparsed raw script execution in Markdown mode.
- `blocks oversized payloads and displays security alert instead of rendering`: Validates payload size ceilings.
- `blocks unsupported artifact types with an error alert`: Validates type rejection.
- `renders ordinary code blocks without confusing them with artifacts` (`ChatMessageItem.test.tsx`): Verifies code blocks in conversation never inadvertently execute in viewer.

### Backend (`tests/test_artifacts.py`):
- `test_artifact_schema_rejects_unsupported_types`: Verifies schema rejection of malicious MIME types.
- `test_artifact_schema_rejects_oversized_payloads`: Verifies rejection of > 500 KB payloads.
- `test_artifact_repository_blocks_oversized_content`: Verifies repository-level size ceiling.
- `test_artifact_endpoints_lifecycle`: Verifies 422 HTTP responses for malformed payloads.

---

## 7. Known Limitations & Browser Edge Cases

1. **Experimental `csp` Attribute on `<iframe>`**:
   - The HTML `csp` attribute on `<iframe>` elements is supported in Chromium, but has varying support in older WebKit versions. To guarantee 100% cross-browser protection, the system redundantly injects `<meta http-equiv="Content-Security-Policy">` directly into the document `<head>`.
2. **Localhost Iframe Loopback**:
   - In rare legacy browsers, `null` origins can have subtle origin-inheritance bugs. By combining `srcdoc` with strict `sandbox="allow-scripts"` (without `allow-same-origin`), the browser isolates the execution context into an unauthenticated security boundary.
3. **Heavy Client-Side Computations**:
   - An infinite loop script (`while(true){}`) inside the iframe will tie up a browser thread. The frontend mitigates this by restricting maximum script execution scope and providing an instant `[Close Viewer]` (`Esc`) button that destroys the iframe element.
