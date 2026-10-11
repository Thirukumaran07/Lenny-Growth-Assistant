# Local Model Guide & Troubleshooting

- **Hardware Target:** MacBook Air (Intel Core i5, 8 GB RAM)
- **Primary Engine:** Ollama with `llama3.2:3b` and `nomic-embed-text`

---

## 1. Local Model Memory & Hardware Footprint

| Component | Model Name | Disk Size | Runtime RAM | Context Window |
|---|---|---|---|---|
| **Text Generation** | `llama3.2:3b` | 2.0 GB | ~2.2 GB | 8,192 tokens |
| **Embeddings** | `nomic-embed-text` | 274 MB | ~280 MB | 8,192 tokens |
| **Host Headroom** | N/A | N/A | ~5.5 GB available | Safe from swap thrashing |

---

## 2. Setup & Download Commands

Verify or pull models via Ollama:
```bash
# Check existing models
ollama list

# Pull generation model if missing
ollama pull llama3.2:3b

# Pull embedding model if missing
ollama pull nomic-embed-text
```

---

## 3. Explicit Cloud Privacy Policy

1. **Local-First Default:** All prompts, transcript chunks, embeddings, and chat histories remain 100% on this local machine. Zero outbound traffic occurs.
2. **Never Silent Failover:** If Ollama daemon is offline, the application **never** forwards your queries to third-party cloud APIs automatically.
3. **Explicit Opt-In:** Cloud inference is only activated if the user explicitly switches the provider toggle in the UI header and supplies valid API keys in `.env`.

---

## 4. Diagnostics & Troubleshooting

### Scenario A: Ollama daemon is not running
- **Symptom:** API returns HTTP 503 with `"Cannot connect to Ollama daemon at http://localhost:11434"`.
- **Fix:** Start the daemon in a separate terminal:
  ```bash
  ollama serve
  ```

### Scenario B: Model is missing
- **Symptom:** API returns HTTP 404 with `"Model llama3.2:3b not found"`.
- **Fix:** Pull the model:
  ```bash
  ollama pull llama3.2:3b
  ```

### Scenario C: High thermal or CPU load
- **Mitigation:** The application enforces sequential turn generation (1 active stream per worker) and caps top-K retrieval chunks to 4.
