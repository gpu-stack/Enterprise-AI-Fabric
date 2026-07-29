#!/usr/bin/env python3
"""
Multi-Concurrent User RAG Traffic Simulator & SLA Benchmarker
Simulates concurrent virtual user traffic against RAG Search, Direct Chat, and Summarization endpoints.
"""

import time
import random
import argparse
import requests
from concurrent.futures import ThreadPoolExecutor

SAMPLE_QUERIES = [
    "What are the maternity leave rules for employees?",
    "What was the Q3 revenue growth percentage?",
    "Explain the Qdrant vector database Cosine metric configuration.",
    "What happens if unscheduled downtime exceeds 4 hours?",
    "What is the standard operating procedure for Severity 1 incidents?",
    "How many paid annual leave days are provided per fiscal year?",
    "Describe the rolling update deployment process."
]

TENANTS = ["hr_support_v2", "finance_v1", "engineering_v1"]

def calc_percentile(arr: list, p: float) -> float:
    if not arr:
        return 0.0
    s_arr = sorted(arr)
    k = (len(s_arr) - 1) * (p / 100.0)
    f = int(k)
    c = f + 1
    if c < len(s_arr):
        return round(s_arr[f] + (k - f) * (s_arr[c] - s_arr[f]), 3)
    return round(s_arr[f], 3)

def simulate_user_request(api_base_url: str, user_id: int) -> dict:
    tenant_id = random.choice(TENANTS)
    query_str = random.choice(SAMPLE_QUERIES)
    endpoint_type = random.choice(["query", "query", "query", "chat"])
    
    start_time = time.time()
    url = f"{api_base_url.rstrip('/')}/api/tenants/{tenant_id}/{endpoint_type}"
    
    headers = {"Content-Type": "application/json"}
    if endpoint_type == "query":
        payload = {
            "user_query": query_str,
            "temperature": 0.2,
            "top_k": 3
        }
    else: # chat
        payload = {
            "chat_history": [{"role": "user", "content": query_str}],
            "temperature": 0.3
        }
        
    try:
        response = requests.post(url, json=payload, headers=headers, stream=True, timeout=60.0)
        
        # Read stream response tokens
        bytes_received = 0
        for chunk in response.iter_content(chunk_size=1024):
            if chunk:
                bytes_received += len(chunk)
                
        latency = time.time() - start_time
        
        if response.status_code == 200:
            return {
                "status": "SUCCESS",
                "user_id": user_id,
                "tenant_id": tenant_id,
                "endpoint": endpoint_type,
                "latency_sec": round(latency, 3),
                "bytes_received": bytes_received,
                "http_code": 200
            }
        else:
            return {
                "status": "FAILED",
                "user_id": user_id,
                "tenant_id": tenant_id,
                "endpoint": endpoint_type,
                "latency_sec": round(latency, 3),
                "http_code": response.status_code,
                "error": f"HTTP status {response.status_code}"
            }
    except Exception as e:
        return {
            "status": "ERROR",
            "user_id": user_id,
            "tenant_id": tenant_id,
            "endpoint": endpoint_type,
            "latency_sec": round(time.time() - start_time, 3),
            "http_code": 0,
            "error": str(e)
        }

def run_concurrent_user_benchmark(api_base_url: str, virtual_users: int = 20, requests_per_user: int = 2):
    total_requests = virtual_users * requests_per_user
    print(f"🔥 Starting Multi-Concurrent User RAG Benchmark: {virtual_users} Virtual Users ({total_requests} Total Requests) against {api_base_url}...")
    
    start_bench = time.time()
    results = []
    
    with ThreadPoolExecutor(max_workers=virtual_users) as executor:
        futures = []
        for req_idx in range(total_requests):
            user_id = (req_idx % virtual_users) + 1
            futures.append(executor.submit(simulate_user_request, api_base_url, user_id))
            
        for future in futures:
            results.append(future.result())
            
    total_duration = time.time() - start_bench
    
    success_count = sum(1 for r in results if r["status"] == "SUCCESS")
    fail_count = sum(1 for r in results if r["status"] in ["FAILED", "ERROR"])
    latencies = [r["latency_sec"] for r in results if r["latency_sec"] > 0]
    
    qps = round(len(results) / total_duration, 2)
    p50 = calc_percentile(latencies, 50)
    p90 = calc_percentile(latencies, 90)
    p95 = calc_percentile(latencies, 95)
    p99 = calc_percentile(latencies, 99)
    avg_latency = round(sum(latencies) / len(latencies), 3) if latencies else 0.0
    
    print("\n" + "="*70)
    print("📈 MULTI-CONCURRENT USER RAG PERFORMANCE BENCHMARK REPORT")
    print("="*70)
    print(f"• Total Virtual Users      : {virtual_users} Concurrent Users")
    print(f"• Total Requests Processed : {len(results)} Requests")
    print(f"• Successful Responses     : {success_count} ({round(success_count/len(results)*100, 1)}%)")
    print(f"• Failed / Error Responses  : {fail_count}")
    print(f"• System Throughput (QPS)  : {qps} queries/sec")
    print(f"• Mean Response Latency    : {avg_latency} sec ({round(avg_latency*1000, 1)} ms)")
    print(f"• p50 SLA Latency          : {p50} sec ({round(p50*1000, 1)} ms)")
    print(f"• p90 SLA Latency          : {p90} sec ({round(p90*1000, 1)} ms)")
    print(f"• p95 SLA Latency (Target) : {p95} sec ({round(p95*1000, 1)} ms)")
    print(f"• p99 SLA Latency          : {p99} sec ({round(p99*1000, 1)} ms)")
    print("="*70 + "\n")
    
    return {
        "virtual_users": virtual_users,
        "total_requests": len(results),
        "success": success_count,
        "failed": fail_count,
        "qps": qps,
        "avg_sec": avg_latency,
        "p50_sec": p50,
        "p90_sec": p90,
        "p95_sec": p95,
        "p99_sec": p99
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Multi-Concurrent User RAG Traffic Simulator & SLA Benchmarker")
    parser.add_argument("--api_url", type=str, default="http://localhost:8000", help="Base API endpoint URL")
    parser.add_argument("--users", type=int, default=20, help="Number of concurrent virtual users (default: 20)")
    parser.add_argument("--requests_per_user", type=int, default=2, help="Number of requests per user (default: 2)")
    args = parser.parse_args()
    
    run_concurrent_user_benchmark(args.api_url, args.users, args.requests_per_user)
