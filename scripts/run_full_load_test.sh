#!/usr/bin/env bash
# =====================================================================
# Enterprise RAG V2 - Automated Load, Stress & SLA Performance Suite
# =====================================================================

set -e

API_URL="${1:-http://localhost:8000}"
PDF_COUNT="${2:-100}"
CONCURRENT_USERS="${3:-30}"

echo "====================================================================="
echo "⚡ STARTING ENTERPRISE RAG V2 LOAD & STRESS BENCHMARK SUITE"
echo "====================================================================="
echo "• Target API Endpoint : ${API_URL}"
echo "• Synthetic PDF Count : ${PDF_COUNT} PDF files"
echo "• Virtual User Load   : ${CONCURRENT_USERS} Concurrent Users"
echo "====================================================================="
echo ""

# 1. Generate Synthetic Corporate Documents
echo "📝 Stage 1/3: Generating ${PDF_COUNT} Synthetic PDF Documents..."
python3 scripts/generate_load_dataset.py --count "${PDF_COUNT}" --output_dir "load_test_docs"

# 2. Ingestion Pipeline Stress Test
echo "⚡ Stage 2/3: Executing Ingestion Pipeline Concurrency Test..."
python3 scripts/test_ingestion_load.py --api_url "${API_URL}" --docs_dir "load_test_docs" --concurrency 10 --max_files 30

# 3. Multi-Concurrent User RAG Traffic Benchmark
echo "🔥 Stage 3/3: Executing Multi-Concurrent User RAG Traffic Benchmark..."
python3 scripts/test_concurrent_users.py --api_url "${API_URL}" --users "${CONCURRENT_USERS}" --requests_per_user 2

echo "====================================================================="
echo "✅ BENCHMARK SUITE EXECUTED SUCCESSFULLY!"
echo "====================================================================="
