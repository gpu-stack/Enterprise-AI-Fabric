import logging
from typing import List, Any
from src.config import settings

logger = logging.getLogger("SparseEncoder")

class SparseBM25Encoder:
    """Production-grade local sparse encoder utilizing fastembed for BM25 token vectors."""
    _instance = None

    def __init__(self, model_name: str = None):
        self.model_name = model_name or getattr(settings, "SPARSE_MODEL_ID", "Qdrant/bm25")
        self._model = None

    @property
    def model(self):
        if self._model is None:
            try:
                from fastembed import SparseTextEmbedding
                logger.info(f"Initializing FastEmbed SparseTextEmbedding model: '{self.model_name}'...")
                self._model = SparseTextEmbedding(model_name=self.model_name)
            except Exception as e:
                logger.error(f"Failed to initialize FastEmbed sparse model '{self.model_name}': {str(e)}")
                raise RuntimeError(f"FastEmbed sparse model initialization failure: {str(e)}")
        return self._model

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def embed_documents(self, texts: List[str]) -> List[Any]:
        """Generates sparse token vector embeddings for a list of document texts."""
        if not texts:
            return []
        try:
            embeddings_gen = self.model.embed(texts)
            return list(embeddings_gen)
        except Exception as e:
            logger.error(f"Sparse document embedding generation error: {str(e)}")
            raise RuntimeError(f"Sparse document embedding failure: {str(e)}")

    def embed_query(self, text: str) -> Any:
        """Generates sparse token vector embedding for a single query text."""
        if not text:
            raise ValueError("Query text cannot be empty.")
        embeddings = self.embed_documents([text])
        return embeddings[0]
