import logging
from typing import List, Union, Optional
import numpy as np
from fastembed import TextEmbedding
from app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingProvider:
    """
    Manages deterministic, batched embedding generation using fastembed (ONNX runtime).
    Ensures identical embeddings are produced at indexing and query time.
    """

    def __init__(
        self,
        model_name: Optional[str] = None,
        embedding_dim: Optional[int] = None
    ):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self.embedding_dim = embedding_dim or settings.EMBEDDING_DIM
        self._model: Optional[TextEmbedding] = None

    @property
    def model(self) -> TextEmbedding:
        if self._model is None:
            logger.info(f"Loading fastembed TextEmbedding model: {self.model_name}")
            self._model = TextEmbedding(model_name=self.model_name)
        return self._model

    def embed_texts(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        Embeds a list of texts into unit-normalized 384-dimensional float vectors.
        """
        if not texts:
            return []

        clean_texts = [t.strip() if t.strip() else " " for t in texts]
        all_embeddings: List[List[float]] = []

        try:
            # fastembed.embed handles batching and returns a generator of numpy arrays
            generator = self.model.embed(clean_texts, batch_size=batch_size)
            for vec in generator:
                # Ensure float list
                vec_norm = vec / (np.linalg.norm(vec) + 1e-9)
                all_embeddings.append(vec_norm.tolist())
            return all_embeddings
        except Exception as e:
            logger.error(f"Error during batched embedding generation: {e}")
            raise e

    def embed_query(self, query: str) -> List[float]:
        """
        Embeds a single query string for vector similarity retrieval.
        """
        clean_query = query.strip()
        if not clean_query:
            clean_query = " "
        embeddings = self.embed_texts([clean_query], batch_size=1)
        return embeddings[0]

# Singleton embedding provider instance
embedding_provider = EmbeddingProvider()
