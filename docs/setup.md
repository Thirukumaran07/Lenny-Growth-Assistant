# Local Developer Setup Guide: The Lenny Growth Assistant

This document provides step-by-step instructions to run the application locally without Docker on macOS (including Intel Core i5 with 8 GB RAM).

---

## 1. Prerequisites

Verify installed toolchains:
```bash
python3 --version  # Requires Python 3.12+
node --version     # Requires Node 18+
ollama --version   # Requires Ollama
psql --version     # Requires PostgreSQL 16+
```

---

## 2. Environment Configuration

Clone the repository and copy the environment configuration template:
```bash
cp .env.example .env
```

Review `.env` settings:
- `DATABASE_URL`: Connection URL for PostgreSQL.
  - Native Homebrew PostgreSQL default: `postgresql+asyncpg://apple:@localhost:5432/lenny_growth`
  - Docker Compose default: `postgresql+asyncpg://postgres:postgres@localhost:5432/lenny_growth`
- `OLLAMA_BASE_URL`: `http://localhost:11434`
- `OLLAMA_GENERATION_MODEL`: `llama3.2:3b`
- `OLLAMA_EMBEDDING_MODEL`: `nomic-embed-text`
- `ACTIVE_LLM_PROVIDER`: `local_ollama`

---

## 3. Local Model Verification (Ollama)

Ensure the Ollama service is running and models are downloaded:
```bash
# Check if ollama is running and list models
ollama list

# If models are not yet downloaded:
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

---

## 4. Backend Setup & Startup

1. **Create and activate Python virtual environment:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. **Install dependencies:**
```bash
pip install --upgrade pip
pip install -r backend/requirements.txt
```

3. **Run automated checks and tests:**
```bash
pytest -v tests/
```

4. **Start the FastAPI backend server:**
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API is now running at `http://localhost:8000`.
Interactive Swagger API documentation is available at `http://localhost:8000/docs`.

---

## 5. Frontend Setup & Startup

In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
The React + Vite frontend is now live at `http://localhost:5173`.

---

## 6. Verification Probes

Test health and truthful readiness in terminal or browser:
```bash
# Liveness probe (HTTP 200)
curl http://localhost:8000/api/health

# Readiness probe (inspects PostgreSQL, Ollama, and models)
curl http://localhost:8000/api/ready
```
