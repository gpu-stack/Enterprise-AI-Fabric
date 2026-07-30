import logging
import time
from qdrant_client.models import Filter, FieldCondition, MatchValue
from src.config import settings
from src.processing.semantic_splitter import TEIEmbeddingClient
from src.utils.logger import logger as sys_logger

logger = logging.getLogger("QueryEngine")

class MultiTenantQueryEngine:
    def __init__(self) -> None:
        """Initializes the decoupled embedding client and the Qdrant cluster connection."""
        self.collection_name = settings.COLLECTION_NAME

    @property
    def qdrant(self):
        return settings.get_qdrant_client()

    @property
    def embedder(self):
        return TEIEmbeddingClient(settings.EMBEDDING_API_URL)

    def retrieve_context(self, query_str: str, tenant_id: str, limit: int = 3) -> tuple:
        """Vectorizes a search query and returns isolated semantic matches for the specified tenant alongside query telemetry."""
        retrieval_telemetry = {
            "embedding_ms": 0.0,
            "qdrant_ms": 0.0,
            "rerank_ms": 0.0
        }
        try:
            # 1. Convert natural language query into Dense (TEI) and Sparse (FastEmbed BM25) vectors
            embed_start = time.perf_counter_ns()
            query_vector = self.embedder.embed_query(query_str)
            
            sparse_query = None
            try:
                from src.processing.sparse_encoder import SparseBM25Encoder
                sparse_encoder = SparseBM25Encoder.get_instance()
                sparse_query = sparse_encoder.embed_query(query_str)
            except Exception as se_err:
                sys_logger.warning(f"Sparse query encoding fault: {str(se_err)}", component="HYBRID_SEARCH")

            retrieval_telemetry["embedding_ms"] = round((time.perf_counter_ns() - embed_start) / 1_000_000.0, 2)
            
            # 2. Query candidates using True Hybrid Search Fusion (RRF) with graceful fallback
            qdrant_limit = getattr(settings, "VECTOR_TOP_K", max(limit * 5, 20))
            qdrant_start = time.perf_counter_ns()
            
            query_filter = Filter(
                must=[
                    FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id)),
                    FieldCondition(key="is_latest", match=MatchValue(value=True))
                ]
            )

            response = None
            if sparse_query is not None:
                try:
                    from qdrant_client.models import Prefetch, SparseVector, FusionQuery, Fusion
                    s_indices = sparse_query.indices.tolist()
                    s_values = sparse_query.values.tolist()

                    response = self.qdrant.query_points(
                        collection_name=self.collection_name,
                        prefetch=[
                            Prefetch(
                                query=query_vector,
                                using="dense",
                                limit=qdrant_limit,
                                filter=query_filter
                            ),
                            Prefetch(
                                query=SparseVector(indices=s_indices, values=s_values),
                                using="sparse",
                                limit=qdrant_limit,
                                filter=query_filter
                            )
                        ],
                        query=FusionQuery(fusion=Fusion.RRF),
                        limit=qdrant_limit,
                        with_payload=True
                    )
                    sys_logger.info("Executed True Hybrid Search Fusion (Dense + Sparse BM25 via RRF)", component="VECTOR_DB")
                except Exception as hybrid_err:
                    sys_logger.warning(f"Hybrid search prefetch failed (falling back to dense query): {str(hybrid_err)}", component="VECTOR_DB")
                    response = None

            if response is None:
                # Standard dense search fallback (un-named vector or legacy single-vector collection)
                response = self.qdrant.query_points(
                    collection_name=self.collection_name,
                    query=query_vector,
                    using="dense",
                    query_filter=query_filter,
                    limit=qdrant_limit,
                    with_payload=True
                )

            retrieval_telemetry["qdrant_ms"] = round((time.perf_counter_ns() - qdrant_start) / 1_000_000.0, 2)
            sys_logger.info(f"Retrieved {len(response.points)} vector candidates from Qdrant in {retrieval_telemetry['qdrant_ms']}ms", component="VECTOR_DB")
            
            # 3. Parse out structural data records (parent blocks if available) and deduplicate by parent_id
            retrieved_contexts = []
            seen_parent_ids = set()
            
            for point in response.points:
                parent_id = point.payload.get("parent_id")
                parent_text = point.payload.get("parent_text")
                
                if parent_id and parent_text:
                    # Parent-child structure detected
                    if parent_id in seen_parent_ids:
                        continue
                    seen_parent_ids.add(parent_id)
                    text_content = parent_text
                else:
                    # Fallback for standard legacy documents
                    text_content = point.payload.get("document_text", "")
                    
                if text_content:
                    retrieved_contexts.append({
                        "score": point.score,
                        "text": text_content,
                        "chunk_type": point.payload.get("chunk_type", "prose"),
                        "page_number": point.payload.get("page_number", 0),
                        "source_file": point.payload.get("source_file", "unknown")
                    })
            
            # 4. If Reranker is enabled and reachable, perform Cross-Encoder reranking
            if getattr(settings, "RERANK_ENABLED", True) and retrieved_contexts:
                rerank_start = time.perf_counter_ns()
                try:
                    import requests
                    sys_logger.info(f"Submitting {len(retrieved_contexts)} context blocks to Reranker Engine...", component="RERANKER")
                    rerank_payload = {
                        "query": query_str,
                        "texts": [c["text"] for c in retrieved_contexts]
                    }
                    rerank_url = getattr(settings, "RERANKER_ENDPOINT", None) or f"{getattr(settings, 'RERANKER_SERVER_URL', '').rstrip('/')}/rerank"
                    timeout = getattr(settings, "RERANK_TIMEOUT", 60)
                    
                    res = requests.post(rerank_url, json=rerank_payload, timeout=timeout)
                    if res.status_code == 200:
                        rerank_results = res.json()
                        # Track which indices were re-scored
                        rescored_indices = set()
                        for r_item in rerank_results:
                            idx = r_item["index"]
                            if idx < len(retrieved_contexts):
                                retrieved_contexts[idx]["score"] = float(r_item["score"])
                                rescored_indices.add(idx)
                        
                        # Set default 0.0 score for any un-scored candidate so no item retains raw RRF fraction
                        for idx in range(len(retrieved_contexts)):
                            if idx not in rescored_indices:
                                retrieved_contexts[idx]["score"] = 0.0
                        
                        # Sort ENTIRE candidate list strictly in descending order by Cross-Encoder score
                        retrieved_contexts.sort(key=lambda x: x["score"], reverse=True)
                        sys_logger.success(f"Reranker re-ranked and uniformly scored {len(retrieved_contexts)} blocks successfully", component="RERANKER")
                    else:
                        sys_logger.warning(f"Reranker returned status code {res.status_code}. Falling back to vector ranking.", component="RERANKER")
                except Exception as rerank_err:
                    sys_logger.warning(f"Cross-Encoder reranking fault: {str(rerank_err)}. Falling back to vector ranking.", component="RERANKER")
                finally:
                    retrieval_telemetry["rerank_ms"] = round((time.perf_counter_ns() - rerank_start) / 1_000_000.0, 2)

            # 5. Slice top N candidates after sorting
            final_limit = getattr(settings, "RERANK_TOP_K", limit)
            accepted_contexts = retrieved_contexts[:final_limit]
            discarded_contexts = retrieved_contexts[final_limit:]
            
            sys_logger.info(f"Retrieved {len(accepted_contexts)} context blocks for workspace partition '{tenant_id}'", component="VECTOR_DB")
            return accepted_contexts, retrieval_telemetry, discarded_contexts

        except Exception as e:
            logger.error(f"Critical failure during multi-tenant vector retrieval pass: {str(e)}")
            raise RuntimeError("Context retrieval failure encountered.")
