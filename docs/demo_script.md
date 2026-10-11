# 2–3 Minute Video Demo Script: The Lenny Growth Assistant

- **Presenter Setup:** Camera enabled (picture-in-picture in corner), screen sharing the Lenny Growth Assistant web interface (`http://localhost:5173`).
- **Target Duration:** Exactly 2 minutes 45 seconds (within the 2–3 minute envelope).
- **Theme:** High-signal, authoritative, technical forward-deployed engineer walkthrough.

---

### Timeline & Stage Directions

```
 0:00 ───┬─── 1. Problem Introduction & Camera Hook [25s]
         │
 0:25 ───┼─── 2. Grounded Q&A with Verifiable Citations [30s]
         │
 0:55 ───┼─── 3. Conversational Follow-Up Turn [20s]
         │
 1:15 ───┼─── 4. Ship 30 for 30 Atomic Essay Generation [30s]
         │
 1:45 ───┼─── 5. Interactive Artifact Generation & Sandbox Security [30s]
         │
 2:15 ───┼─── 6. Host-Native Ollama & Hardware Architecture [25s]
         │
 2:40 ───┴─── 7. Technical Trade-Offs & Conclusion [20s]
 3:00 Max
```

---

### Detailed Script

#### 1. Introduction & The Problem (0:00 – 0:25)
- **Visual:** Presenter on camera (upper right), showing the Lenny Growth Assistant homepage and clean dark-mode UI.
- **Presenter (Speaking to Camera):**
  > *"Hi everyone. Lenny’s Podcast contains some of the highest-signal growth knowledge in tech—over 200 interviews with operators like Brian Chesky, Shreyas Doshi, and Rahul Vohra. But when product managers try using standard LLMs to query these insights, they run into two major problems: hallucinations with fabricated attribution, and clunky conversational walls of text that can't be put into production.
  >
  > I built **The Lenny Growth Assistant**—a local-first, privacy-preserving AI workbench that runs completely offline on an 8 GB Intel Mac, provides mathematically verified citations, and generates interactive artifacts."*

---

#### 2. Grounded Q&A with Verifiable Citations (0:25 – 0:55)
- **Visual:** Presenter clicks the composer and types:
  ```
  How did Superhuman measure product-market fit using Sean Ellis's framework?
  ```
- **Screen Action:** Press `Enter`. Watch Server-Sent Events (SSE) stream tokens smoothly.
- **Presenter (Screen Audio):**
  > *"Notice the real-time SSE stream. Rather than answering from generic web training data, the backend executes dense vector similarity search across chunked transcript archives in PostgreSQL with pgvector.
  >
  > Look at these citation badges above the response: **[1 Rahul Vohra - Superhuman - 00:08:45]**.
  > When I click this citation pill, a modal appears displaying the exact source episode title, verified URL, timestamp, and the verbatim transcript segment where Rahul describes the 40% threshold. If a query falls below our 0.65 similarity threshold, the model strictly refuses to hallucinate."*

---

#### 3. Conversational Follow-Up Turn (0:55 – 1:15)
- **Visual:** Type a conversational follow-up relying on session context:
  ```
  What specific percentage did he need to hit, and what did he ask the users?
  ```
- **Screen Action:** Press `Enter`. Observe immediate contextual resolution.
- **Presenter (Screen Audio):**
  > *"Here I'm asking a follow-up that references 'he' and 'the framework'. The agent retrieves the conversational context stored in PostgreSQL for this specific session without leaking data across sessions, explaining the 40% 'very disappointed' metric and the four specific survey questions."*

---

#### 4. Ship 30 for 30 Atomic Essay Generation (1:15 – 1:45)
- **Visual:** In the composer, type:
  ```
  /essay Write an atomic essay on the Superhuman Product-Market Fit Engine
  ```
- **Screen Action:** Press `Enter`. The Skill Router classifies the prompt as `SHIP30_ESSAY` and streams a structured atomic essay.
- **Presenter (Screen Audio):**
  > *"Product teams don't just want Q&A—they need publishable thought leadership. Our deterministic Skill Router detects the `/essay` trigger and executes the **Ship 30 for 30 Skill**.
  >
  > It formats the answer with a punchy 1-line hook, three progressive pillars with bold leads, skimmable bullet points, actionable takeaways, and a grounded citation anchor at the bottom. It transforms raw conversational transcripts into structured, high-signal content in seconds."*

---

#### 5. Interactive Artifact Generation & Sandbox Security (1:45 – 2:15)
- **Visual:** In the composer, type:
  ```
  /artifact Create an interactive HTML calculator for the PMF survey
  ```
- **Screen Action:** The agent streams the response, emits an `event: artifact`, and the **Artifact Viewer** panel automatically slides in on the right side of the screen.
- **Presenter (Camera & Screen):**
  > *"Now watch this: the assistant synthesizes a full HTML and CSS artifact, and our side-by-side Artifact Viewer opens automatically.
  >
  > Users can interact directly with the PMF calculator in real time, or toggle over to the 'Code' tab to inspect the raw HTML source and download it.
  >
  > **Crucially, let's talk security:** We treat all generated code as untrusted. The artifact is rendered inside an `<iframe>` with `sandbox="allow-scripts"`. We explicitly **omit** `allow-same-origin`, `allow-top-navigation`, and `allow-forms`. It executes in a null origin with zero access to the host app's DOM, cookies, or storage."*

---

#### 6. Host-Native Ollama & Hardware Architecture (2:15 – 2:40)
- **Visual:** Click the **Model Status Badge** in the top navigation bar. The modal displays active provider: `local_ollama`, model: `llama3.2:3b`, embedding: `nomic-embed-text`, RAM: 8 GB.
- **Presenter (Screen Audio):**
  > *"Looking at our diagnostics toolbar: the entire application is powered by **host-native Ollama** using `llama3.2:3b` and `nomic-embed-text`.
  >
  > Running Ollama natively on macOS host—rather than inside Docker—was a deliberate architectural decision for the Intel MacBook Air. It avoids Docker's virtualization penalty and memory thrashing, keeping RAM consumption under 2.5 GB while running completely offline."*

---

#### 7. Technical Trade-Offs & Conclusion (2:40 – 3:00)
- **Visual:** Presenter full-screen on camera with application in background.
- **Presenter (Direct to Camera):**
  > *"To summarize our core technical trade-off: We chose a lightweight 3-billion parameter model with strict mathematical RAG similarity thresholds over a bloated cloud agent. While CPU generation takes a few extra seconds on an Intel i5, we achieve 100% data privacy, zero vendor lock-in, mathematically verifiable citations, and complete offline capability.
  >
  > All 106 automated tests are passing, Docker Compose is configured for evaluation, and the complete audit report is in the repository. Thank you!"*

---

### Speaker Checklist
- [x] Camera positioned at eye level with good lighting
- [x] PostgreSQL database running with transcripts ingested
- [x] Host Ollama daemon running (`ollama serve`) with `llama3.2:3b` and `nomic-embed-text`
- [x] Frontend running at `http://localhost:5173`
- [x] Stopwatch set to 2m 45s
