# 🚀 Scaling Enterprise-RAG-V2 to 100,000 PDFs: Architecture & Operations Blueprint

## 📌 Executive Summary

Processing and serving an enterprise knowledge base of **100,000 PDF documents** (~50,000,000 pages / 150,000,000 text chunks) requires moving from a single-node setup to a **massively parallel, decoupled, distributed architecture**.

This document outlines the architectural changes, cluster topologies, database sharding strategies, hardware sizing models, and operational runbooks required to scale **Enterprise-RAG-V2** to ingest and query 100K high-density financial, technical, and legal PDFs.

---

## 🧮 Hardware & Capacity Scale Estimation

### Data Scale Parameters
* **Total Documents**: 100,000 PDFs
* **Average Page Count**: 50 pages per PDF = **5,000,000 pages total**
* **Average Chunks per Page**: 3 chunks (Parent/Child structure) = **15,000,000 total vectors**
* **Embedding Vector Dimension**: 1024 floats (`BAAI/bge-large-en-v1.5`)
* **Vector Memory Footprint (FP32)**: `15,000,000 * 1024 * 4 bytes` ≈ **61.44 GB** (raw vectors)
* **HNSW Index Overhead (~20%)**: **12.3 GB**
* **Payload Metadata Storage (Text, Filenames, Lineage)**: ~**75 GB**
* **Total Storage Budget**: **~150 GB** (in-memory + payload disk footprint)

---

## 🏛️ High-Level Distributed Architecture (100K PDFs)

```mermaid
graph TD
    Client[Web Console / API Clients] --> Gateway[API Gateway / Load Balancer<br>NGINX / Envoy]
    
    subgraph Control_Plane ["FastAPI Control Plane Cluster"]
        Gateway --> API1[FastAPI Server Node 1]
        Gateway --> API2[FastAPI Server Node 2]
        Gateway --> APIN[FastAPI Server Node N]
    
    subgraph Ingestion_Pipeline ["Distributed Async Ingestion Cluster"]
        Upload[PDF Ingestion Trigger] --> MessageQueue[(Apache Kafka / RabbitMQ)]
        MessageQueue --> Worker1[Celery/Ray Parsing Worker 1]
        MessageQueue --> Worker2[Celery/Ray Parsing Worker 2]
        MessageQueue --> WorkerN[Celery/Ray Parsing Worker N]
    end

    subgraph Infrastructure_Layer ["Decoupled Microservice Engine Layer"]
        Worker1 & Worker2 & WorkerN --> TEI_Batch[Distributed TEI Embedding Pool<br>bge-large-en-v1.5 GPUs]
        Worker1 & Worker2 & WorkerN --> QdrantCluster[("Qdrant Distributed Cluster<br>(Multi-Node Sharded + HNSW)")]
        
        API1 & API2 & APIN --> QdrantCluster
        API1 & API2 & APIN --> RerankerPool[Distributed TEI Reranker Pool<br>bge-reranker-large GPUs]
        API1 & API2 & APIN --> vLLMCluster[vLLM Tensor-Parallel Engine Farm<br>Ray / vLLM Router]
    end
    
    subgraph Security_State ["Encrypted State & Task Registry"]
        API1 & Worker1 --> RedisCache[(Redis Cluster<br>Task Status & Query Caching)]
        API1 & Worker1 --> EncStorage[Fernet AES-128 Encrypted Credentials & Tenant Registry]
    end
```

---

## 🔧 Component-by-Component Scaling Strategy

### 1. Document Parsing & Semantic Chunking Engine

#### Bottleneck in Single-Node Setup
* PDF layout parsing (`pdfplumber`) and optical element isolation are CPU-intensive operations (~0.2 – 0.5s per page).
* 5,000,000 pages sequentially would take ~700 CPU hours (~29 days) on a single machine.

#### 100K PDF Distributed Scaling Solution
1. **Asynchronous Distributed Worker Pools**:
   * Replace synchronously bound FastAPI upload calls with an asynchronous event-driven task architecture powered by **Celery + Redis/RabbitMQ** or **Ray Core**.
   * Run a Kubernetes Deployment with **Auto-scaling Worker Pods** (KEDA driven by Kafka queue depth).

2. **Parsing Microservice Isolation**:
   * Decouple layout extraction into lightweight PyMuPDF + pdfplumber microservices.
   * Parse pages in parallel using multi-process pools within each worker (e.g., 8 workers × 16 threads = 128 parallel pages parsed simultaneously).
   * **Processing Velocity**: 128 pages/sec → 5,000,000 pages parsed in **~10.8 hours**.

3. **Multimodal Visual Processing Batching**:
   * For visual charts/diagrams extracted from PDFs, queue base64 images into an async batch inference queue to Gemini or local Qwen-2-VL/LLaVA instances instead of sequential HTTP blocking calls.

---

### 2. Vector Embeddings & Vector Database (Qdrant)

#### Bottleneck in Single-Node Setup
* Vectorizing 15 million chunks sequentially over HTTP to a single TEI CPU container creates network and CPU saturation.
* Standard Qdrant collection in single-node RAM reaches memory ceilings.

#### 100K PDF Distributed Scaling Solution

1. **Distributed TEI Embedding Farm**:
   * Deploy Hugging Face `text-embeddings-inference` (TEI) containers backed by **NVIDIA T4 or A10G GPUs**.
   * Enable TEI server-side dynamic batching (`--max-batch-tokens 16384`) and FlashAttention-2.
   * Achieves **1,500+ embeddings/sec per GPU node**. 15 million chunks vectorized in **~2.7 hours** with 3 GPU instances.

2. **Qdrant Distributed Cluster Setup**:
   * **Multi-Node Clustering**: Run Qdrant in distributed mode across 3+ nodes with **6 shards** and a replication factor of 2.
   * **HNSW Quantization**: Enable **Scalar Quantization (SQ8)** or **Product Quantization (PQ)** in Qdrant. SQ8 reduces vector memory footprint by **75%** (from 61 GB down to ~15 GB) with < 1% retrieval accuracy loss.
   * **On-Disk Payload Storage**: Configure `on_disk_payload: true` to keep large raw Markdown texts on SSDs (NVMe drives) while keeping HNSW graph indices in RAM.
   * **Tenant HNSW Indexing**: Leverage Qdrant's `is_tenant: True` payload index. Queries only search within the specific tenant's HNSW subgraph, reducing search space from 15M vectors down to just that tenant's document subset (e.g. 50k vectors) in **< 5ms**.

---

### 3. Retrieval, Reranking & LLM Generation

#### 100K PDF Distributed Scaling Solution

1. **TEI Cross-Encoder Reranker Farm**:
   * Deploy TEI Cross-Encoder instances (`bge-reranker-large`) on dedicated GPU nodes.
   * Rerank top-50 candidate chunks down to top-5 chunks in **< 15ms**.

2. **vLLM Inference Farm with Dynamic Router**:
   * Deploy a multi-node **vLLM Engine Cluster** using Ray or a load balancer (vLLM Router).
   * **Continuous Batching & PagedAttention**: Maximizes GPU memory utilization and handles high query concurrency (100+ requests/sec).
   * **Tenant LoRA Adapters**: Dynamic loading of tenant-specific LoRA adapters on shared base weights without restarting servers.

3. **Query Response Caching**:
   * Implement a **Semantic Query Cache** (Redis + Cosine similarity threshold 0.96).
   * Identical or semantically equivalent questions for the same tenant return cached SSE token responses instantly without invoking Qdrant or LLM inference.

---

## 📈 Cost & Resource Breakdown for 100K PDFs

| Tier | Component | Sizing / Hardware Spec | Quantity | Estimated Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Ingestion Workers** | Celery/Ray Processing | 16 vCPU, 32 GB RAM (AWS c6i.4xlarge) | 4 Nodes | ~$0.68/hr × 11 hrs = ~$7.50 |
| **TEI Embeddings** | GPU Embedder Pool | 1x NVIDIA A10G GPU (AWS g5.xlarge) | 2 Nodes | ~$2.00/hr |
| **Vector DB** | Qdrant Cluster | 8 vCPU, 32 GB RAM, NVMe SSD (AWS r6i.2xlarge) | 3 Nodes | ~$1.50/hr |
| **TEI Reranker** | GPU Reranker | 1x NVIDIA A10G GPU (AWS g5.xlarge) | 1 Node | ~$1.00/hr |
| **LLM Inference** | vLLM Engine Farm | 4x NVIDIA A100 80GB (AWS g5.12xlarge or p4d.24xlarge) | 1 Cluster | Dynamic / On-Demand |
| **State & Cache** | Redis Cluster | ElastiCache Redis 16 GB | 1 Cluster | ~$0.20/hr |

---

## 🛡️ Resiliency, Monitoring & Recovery

1. **Idempotent Upsert Guarantee**:
   * Deterministic `UUIDv5` generated from `tenant_id:filename:chunk_text` guarantees that interrupted or retried ingestion tasks overwrite exact points rather than creating duplicates.

2. **Dead-Letter Queues (DLQ)**:
   * Corrupted or unparseable PDFs (e.g. password-protected or binary-corrupted files) are routed to a DLQ and recorded in `eval_runs.json` without halting the batch ingestion pipeline.

3. **Prometheus & Grafana Telemetry**:
   * Export Qdrant search latency, TEI embedding queue depth, vLLM TTFT, and Celery task throughput metrics to Grafana for enterprise real-time observability.
