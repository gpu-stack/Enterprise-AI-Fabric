# 🎨 Enterprise-AI-Fabric Web SPA Console (`frontend/`)

[← Back to main README](../README.md)

The **Frontend Module** is a decoupled, modern React 18 single-page application written in TypeScript and bundled with Vite. It provides an intuitive interface for multi-tenant document ingestion, interactive grounded RAG search, raw LLM testing, system settings management, live SLA observability telemetry, and real-time workload tuning.

---

## 📁 Directory Structure & File Mapping

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Query.tsx           # Grounded RAG Play space with citation quality badges & ChatGPT-style textareas
│   │   ├── Chat.tsx            # MyGPT Non-RAG direct chat playground
│   │   ├── WorkloadTuning.tsx  # Live Workload & Runtime Tuning Engine with 1-click preset hardware profiles
│   │   ├── Ingestion.tsx       # Document upload, dropzone, and Celery task status monitoring
│   │   ├── DocumentLibrary.tsx # Active document management & partition filtering
│   │   ├── Summarize.tsx       # AI Document Summarizer
│   │   ├── Evaluation.tsx      # RAGAS Quality Gate & synthetic test set evaluator
│   │   ├── Analytics.tsx       # Analytics & system usage metrics
│   │   ├── Settings.tsx        # System Settings & LLM connection profile onboarding
│   │   └── LogsConsole.tsx     # Real-time SLA Telemetry Console & audit log vault
│   ├── useAppLogic.tsx         # Central application state, tenant scope context, and SSE streaming handlers
│   ├── App.tsx                 # Core router & navigation shell
│   ├── App.css                 # Styling system, responsive grid layouts, and textarea auto-expansion
│   └── main.tsx                # Application entry point
├── package.json                # Dependencies (Lucide React, Vite, TypeScript)
└── README.md                   # Frontend Documentation
```

---

## 📌 Key Features & Capabilities

### 💬 1. Grounded RAG Play Space (`/query`)
* **Interactive SSE Streaming:** Real-time token streaming with live Server-Sent Events (SSE).
* **ChatGPT-Style Multi-Line Textarea:** Supports `Shift + Enter` line breaks, `Enter` to submit, auto-expands up to 160px with focus-glow styling.
* **Citation Quality Badging:** Displays color-coded relevance badges for retrieved document chunks:
  * 🟢 **`HIGH_CONFIDENCE`** ($\ge 0.70$)
  * 🟡 **`MEDIUM_CONFIDENCE`** ($0.40 - 0.69$)
  * 🔴 **`LOW_CONFIDENCE`** ($< 0.40$)
* **Query Execution Trace Drawer:** Expandable sidebar showing vector pre-fetch metrics, Cross-Encoder score distributions, TTFT (Time-To-First-Token), and generation velocity (tokens/sec).

### 🤖 2. MyGPT Non-RAG Raw Chat (`/chat`)
* Direct model inference playground bypassing Qdrant context retrieval.
* Useful for raw model alignment testing, general queries, and prompt experimentation.
* Features multi-line `Shift + Enter` textarea input.

### ⚙️ 3. Workload & Runtime Tuning Engine (`/tuning`)
* **1-Click Preset Hardware Profiles:**
  * **Low-Latency Edge:** Optimized for fast small-model execution (`max_tokens: 512`, `VECTOR_TOP_K: 10`).
  * **High Reasoning & Policy Analysis:** Optimized for deep policy evaluation (`max_tokens: 2048`, `VECTOR_TOP_K: 20`).
  * **Dense Financial Audit:** High recall profile for complex balance sheet verification (`VECTOR_TOP_K: 30`, `RERANK_TOP_K: 10`).
* **Live Stack Settings Sync:** Dynamically updates backend configuration without container restarts.

### 📊 4. SLA Telemetry & Audit Vault (`/logs`)
* Live percentile SLA metrics: **p50**, **p90**, **p95**, **p99** request latencies.
* Real-time query execution log stream and admin security audit trail.

---

## 🛠️ Development & Build Commands

```bash
# Install dependencies
npm install

# Start local development server (with Vite HMR)
npm run dev

# Type check & build production bundle
npm run build
```

When building production containers, Vite compiles assets into `dist/`, which Nginx serves on host port **9090** (`http://localhost:9090`).
