# ⚙️ Document Processing & Ingestion Service (`src/processing/`)

[← Back to main README](../../README.md) | [🔍 Hybrid Search Documentation](../../HYBRID_SEARCH.md)

The **Processing Service** is the document ingestion backbone of **Enterprise-RAG-V2**. It handles layout-aware PDF parsing, grid-aware tabular formatting, multimodal image description, semantic parent-child chunking, dual vector embedding generation (Dense 1024-dim TEI + Sparse BM25 FastEmbed), chunk deduplication, and revision version tracking. Ingestion runs asynchronously via a Celery worker (`tasks.py`).

---

## 📚 Component Sub-Module Documentation

For exhaustive deep-dives into each specific component, select a guide below:

* 🔍 **[Hybrid Search Fusion Architecture (`HYBRID_SEARCH.md`)](../../HYBRID_SEARCH.md)**: Dense + Sparse BM25 dual vector embedding and Qdrant RRF fusion.
* 📄 **[Document Parsing Engine (`PARSING.md`)](./PARSING.md)**: Layout-aware visual geometry extraction (`pdfplumber`), median font size heading resolution, table boundary isolation, and multimodal chart descriptions.
* ✂️ **[Semantic Chunking Engine (`CHUNKING.md`)](./CHUNKING.md)**: Parent-Child document hierarchy (1500-2048 token parent blocks, 300-500 token child chunks), table protection, and TEI embedding integration.
* 🔄 **[Ingestion & Lineage Pipeline (`INGESTION.md`)](./INGESTION.md)**: SHA-256 duplicate suppression, deterministic UUIDv5 chunk hashing, and version deprecation (`is_latest: False`).
* 🚀 **[100K PDF Scaling Architecture](../../docs/100K_PDF_SCALING_ARCHITECTURE.md)**: Enterprise distributed worker pools, GPU-accelerated embedding farms, and Qdrant cluster sharding.

---

## 📁 Directory Structure & File Mapping

```
src/processing/
├── layout_parser.py       # Visual geometry parser (PDF, Excel, CSV, Multimodal LLM)
├── semantic_splitter.py   # Parent-Child semantic chunker & TEI Embedding client wrapper
├── sparse_encoder.py      # FastEmbed BM25 sparse vector encoder (Qdrant/bm25)
├── ingest_pipeline.py     # Ingestion pipeline, UUIDv5 deduplication & revision lineage
├── tasks.py               # Celery async worker task definitions (ingest_file_task)
├── PARSING.md             # Detailed Parsing Engine Documentation
├── CHUNKING.md             # Detailed Semantic Chunking Documentation
└── INGESTION.md            # Detailed Ingestion Pipeline Documentation
```

---

## 🏛️ End-to-End Processing Architecture

```mermaid
graph TD
    Upload[User File Upload: PDF / Excel / CSV] --> API[FastAPI: POST /api/tenants/tenant_id/ingest]
    API -->|enqueue| Queue[(Redis Broker)]
    Queue --> Worker[Celery Worker: async_ingest_file]

    Worker --> IngestPipe[TenantIngestionPipeline]
    IngestPipe --> HashCheck{SHA-256 Hash Exists?}
    HashCheck -- YES --> Skip[Abort Ingestion - File Duplicate]

    HashCheck -- NO --> Parser[LayoutAwareParser]
    Parser --> TextTables[Extract Text & Convert Tables to Markdown Matrix]
    Parser --> VisionElements[Extract Charts/Diagrams -> Crop PNG Base64]
    VisionElements --> MultimodalLLM[Multimodal LLM API]
    MultimodalLLM --> MergeStream[Merge Image Descriptions into Markdown Stream]
    TextTables --> MergeStream

    MergeStream --> SemanticEngine[SemanticProcessingEngine]
    SemanticEngine --> ParentBlocks[Generate Parent Context Blocks ~1500 Tokens]
    ParentBlocks --> ChildChunks[Generate Child Retrieval Chunks ~400 Tokens]
    ChildChunks --> TEIEmbed[TEI Embedding Container bge-large-en-v1.5]
    ChildChunks --> SparseBM25[FastEmbed BM25 Encoder Qdrant/bm25]
    TEIEmbed --> Vectors[1024-Dim Dense Vector]
    SparseBM25 --> Vectors[Sparse Indices & Values Vector]

    Vectors --> LineageCheck[Deprecate Legacy Revisions: set is_latest=False]
    LineageCheck --> QdrantUpsert[Qdrant DB Upsert with Dual Named Vectors]
    QdrantUpsert --> JobStore[Update Celery Job State: PROGRESS/SUCCESS]
```

---

## 🔑 Key Enterprise Features

1. **Dual Vector Ingestion**: Generates both dense (TEI 1024-dim) and sparse (FastEmbed BM25) vectors for every chunk.
2. **Asynchronous, Non-Blocking Ingestion**: Uploads are dispatched to a Celery task (`async_ingest_file`) instead of running inside the HTTP request thread.
3. **Zero Table Fragmentation**: Financial statement rows and grid tables remain intact as unbroken Markdown matrices.
4. **Parent-Child Retrieval Strategy**: Small child chunks match queries accurately; full parent blocks provide rich context to the LLM.
5. **Automated Document Version Lineage**: Updating a document marks older vectors as `is_latest: False`.
6. **Deterministic Deduplication**: UUIDv5 point IDs guarantee re-ingesting identical content replaces existing records cleanly.
