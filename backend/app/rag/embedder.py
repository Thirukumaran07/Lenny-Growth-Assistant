"""Local embedding generator using Ollama nomic-embed-text."""

from typing import Any
import httpx
import structlog

from backend.app.config import get_settings

logger = structlog.get_logger()


class OllamaEmbedder:
    """Resource-conscious embedding generator using local Ollama nomic-embed-text."""

    def __init__(self, base_url: str | None = None, model: str | None = None):
        settings = get_settings()
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_EMBEDDING_MODEL
        self.endpoint = f"{self.base_url}/api/embeddings"

    async def get_embedding(self, text: str) -> list[float]:
        """Generate a single 768-dimensional normalized embedding vector."""
        cleaned = text.strip()
        if not cleaned:
            raise ValueError("Cannot embed empty text string.")

        payload = {
            "model": self.model,
            "prompt": cleaned,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.endpoint, json=payload)
                if response.status_code != 200:
                    raise RuntimeError(
                        f"Ollama embedding failed with status {response.status_code}: {response.text}"
                    )
                data = response.json()
                embedding = data.get("embedding")
                if not embedding or not isinstance(embedding, list):
                    raise RuntimeError("Invalid embedding response from Ollama daemon.")
                return embedding
        except httpx.ConnectError as e:
            logger.error("ollama_embed_connect_error", error=str(e), endpoint=self.endpoint)
            raise RuntimeError(
                f"Cannot connect to Ollama at {self.base_url}. Ensure 'ollama serve' is running."
            ) from e

    async def get_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        """Sequentially generate embeddings to prevent CPU/memory spikes on 8GB RAM."""
        embeddings: list[list[float]] = []
        for text in texts:
            emb = await self.get_embedding(text)
            embeddings.append(emb)
        return embeddings
