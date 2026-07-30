import os

class Config:
    """Central System Configuration Blueprint."""
    # Read the local .env file if it exists and load variables into the environment
    _env_path = os.path.join(os.getcwd(), ".env")
    if os.path.exists(_env_path):
        with open(_env_path, "r") as f:
            for line in f:
                clean_line = line.strip()
                if clean_line and not clean_line.startswith("#") and "=" in clean_line:
                    key, val = clean_line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

    # --- VECTOR DATABASE CONFIG ---
    QDRANT_URL = os.getenv("QDRANT_URL") or "http://10.145.244.17:6333"
    QDRANT_HOST = os.getenv("QDRANT_HOST", "10.145.244.17")
    QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
    QDRANT_BASE_URL = QDRANT_URL or f"http://{QDRANT_HOST}:{QDRANT_PORT}"
    COLLECTION_NAME = os.getenv("COLLECTION_NAME", "tenant_knowledge_base")
    
    # --- TEI EMBEDDING CONFIG ---
    EMBEDDING_SERVER_URL = os.getenv("EMBEDDING_SERVER_URL") or "http://10.145.244.17:8090"
    TEI_ENDPOINT = f"{EMBEDDING_SERVER_URL.rstrip('/')}/embed"
    VECTOR_DIMENSION = int(os.getenv("VECTOR_DIMENSION", "1024"))
    TEI_TIMEOUT = int(os.getenv("TEI_TIMEOUT", "60"))

    # --- RERANKER CONFIG ---
    RERANKER_SERVER_URL = os.getenv("RERANKER_SERVER_URL") or "http://10.145.244.17:8081"
    RERANKER_ENDPOINT = f"{RERANKER_SERVER_URL.rstrip('/')}/rerank"
    RERANK_ENABLED = os.getenv("RERANK_ENABLED", "True").lower() == "true"
    RERANK_TIMEOUT = int(os.getenv("RERANK_TIMEOUT", "60"))
    RERANKER_SCORE_THRESHOLD = float(os.getenv("RERANKER_SCORE_THRESHOLD", "0.40"))
    VECTOR_TOP_K = int(os.getenv("VECTOR_TOP_K", "20"))
    RERANK_TOP_K = int(os.getenv("RERANK_TOP_K", "3"))

    # --- MODULAR BACKEND ENGINE PARAMETERS ---
    LLM_DEPLOYMENT_MODE = os.getenv("LLM_DEPLOYMENT_MODE", "ON_PREM").upper()
    LLM_API_BASE_URL = os.getenv("LLM_API_BASE_URL", "http://localhost:8000/v1").rstrip("/")
    LLM_API_KEY = os.getenv("LLM_API_KEY", "none")
    DEFAULT_MODEL_ID = os.getenv("DEFAULT_MODEL_ID", "gemini-1.5-pro")
    DEFAULT_MAX_TOKENS = int(os.getenv("DEFAULT_MAX_TOKENS", "512"))
    DEFAULT_TEMPERATURE = float(os.getenv("DEFAULT_TEMPERATURE", "0.0"))
    DEFAULT_REPETITION_PENALTY = float(os.getenv("DEFAULT_REPETITION_PENALTY", "1.05"))

    # --- PARAMETRIC RECOVERY RULES ---
    CHUNK_MAX_SIZE = int(os.getenv("CHUNK_MAX_SIZE", "1200"))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))
    NOISE_THRESHOLD_GATE = int(os.getenv("NOISE_THRESHOLD_GATE", "60"))
    CLIENT_BATCH_LIMIT = int(os.getenv("CLIENT_BATCH_LIMIT", "32"))

    # --- MEMORY & SPARSE ENCODING CONFIG ---
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    SPARSE_MODEL_ID = os.getenv("SPARSE_MODEL_ID", "Qdrant/bm25")

    @classmethod
    def get_qdrant_client(cls):
        from qdrant_client import QdrantClient
        if cls.QDRANT_URL:
            return QdrantClient(url=cls.QDRANT_URL, timeout=60.0)
        return QdrantClient(host=cls.QDRANT_HOST, port=cls.QDRANT_PORT, timeout=60.0)

    @classmethod
    def apply_runtime_overrides(cls, overrides: dict):
        if "QDRANT_URL" in overrides and overrides["QDRANT_URL"]:
            cls.QDRANT_URL = overrides["QDRANT_URL"]
            cls.QDRANT_BASE_URL = overrides["QDRANT_URL"]
        if "EMBEDDING_SERVER_URL" in overrides and overrides["EMBEDDING_SERVER_URL"]:
            cls.EMBEDDING_SERVER_URL = overrides["EMBEDDING_SERVER_URL"]
            cls.TEI_ENDPOINT = f"{cls.EMBEDDING_SERVER_URL.rstrip('/')}/embed"
            settings.EMBEDDING_API_URL = cls.EMBEDDING_SERVER_URL
        if "RERANKER_SERVER_URL" in overrides and overrides["RERANKER_SERVER_URL"]:
            cls.RERANKER_SERVER_URL = overrides["RERANKER_SERVER_URL"]
            cls.RERANKER_ENDPOINT = f"{cls.RERANKER_SERVER_URL.rstrip('/')}/rerank"
        if "VECTOR_TOP_K" in overrides:
            try:
                cls.VECTOR_TOP_K = int(overrides["VECTOR_TOP_K"])
            except ValueError:
                pass
        if "RERANK_TOP_K" in overrides:
            try:
                cls.RERANK_TOP_K = int(overrides["RERANK_TOP_K"])
            except ValueError:
                pass
        if "RERANKER_SCORE_THRESHOLD" in overrides:
            try:
                cls.RERANKER_SCORE_THRESHOLD = float(overrides["RERANKER_SCORE_THRESHOLD"])
            except ValueError:
                pass
        if "LLM_DEPLOYMENT_MODE" in overrides and overrides["LLM_DEPLOYMENT_MODE"]:
            cls.LLM_DEPLOYMENT_MODE = str(overrides["LLM_DEPLOYMENT_MODE"]).upper()
        if "LLM_API_BASE_URL" in overrides and overrides["LLM_API_BASE_URL"]:
            cls.LLM_API_BASE_URL = str(overrides["LLM_API_BASE_URL"]).rstrip("/")
        if "LLM_API_KEY" in overrides:
            cls.LLM_API_KEY = str(overrides["LLM_API_KEY"])
        if "DEFAULT_MODEL_ID" in overrides and overrides["DEFAULT_MODEL_ID"]:
            cls.DEFAULT_MODEL_ID = str(overrides["DEFAULT_MODEL_ID"])
        if "DEFAULT_MAX_TOKENS" in overrides:
            try:
                cls.DEFAULT_MAX_TOKENS = int(overrides["DEFAULT_MAX_TOKENS"])
            except (ValueError, TypeError):
                pass
        if "DEFAULT_TEMPERATURE" in overrides:
            try:
                cls.DEFAULT_TEMPERATURE = float(overrides["DEFAULT_TEMPERATURE"])
            except (ValueError, TypeError):
                pass
        if "DEFAULT_REPETITION_PENALTY" in overrides:
            try:
                cls.DEFAULT_REPETITION_PENALTY = float(overrides["DEFAULT_REPETITION_PENALTY"])
            except (ValueError, TypeError):
                pass
        if "REDIS_URL" in overrides and overrides["REDIS_URL"]:
            cls.REDIS_URL = str(overrides["REDIS_URL"])
        if "RERANK_ENABLED" in overrides:
            cls.RERANK_ENABLED = str(overrides["RERANK_ENABLED"]).lower() == "true" or overrides["RERANK_ENABLED"] is True
        if "CHUNK_MAX_SIZE" in overrides:
            try:
                cls.CHUNK_MAX_SIZE = int(overrides["CHUNK_MAX_SIZE"])
            except (ValueError, TypeError):
                pass
        if "CHUNK_OVERLAP" in overrides:
            try:
                cls.CHUNK_OVERLAP = int(overrides["CHUNK_OVERLAP"])
            except (ValueError, TypeError):
                pass
        if "NOISE_THRESHOLD_GATE" in overrides:
            try:
                cls.NOISE_THRESHOLD_GATE = int(overrides["NOISE_THRESHOLD_GATE"])
            except (ValueError, TypeError):
                pass
        if "CLIENT_BATCH_LIMIT" in overrides:
            try:
                cls.CLIENT_BATCH_LIMIT = int(overrides["CLIENT_BATCH_LIMIT"])
            except (ValueError, TypeError):
                pass
        if "TEI_TIMEOUT" in overrides:
            try:
                cls.TEI_TIMEOUT = int(overrides["TEI_TIMEOUT"])
            except (ValueError, TypeError):
                pass
        if "RERANK_TIMEOUT" in overrides:
            try:
                cls.RERANK_TIMEOUT = int(overrides["RERANK_TIMEOUT"])
            except (ValueError, TypeError):
                pass
        if "VECTOR_DIMENSION" in overrides:
            try:
                cls.VECTOR_DIMENSION = int(overrides["VECTOR_DIMENSION"])
            except (ValueError, TypeError):
                pass

# Create settings alias for compatibility with modules
settings = Config
settings.EMBEDDING_API_URL = os.getenv("EMBEDDING_API_URL", Config.EMBEDDING_SERVER_URL)