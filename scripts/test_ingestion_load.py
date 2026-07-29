#!/usr/bin/env python3
"""
Ingestion Pipeline Concurrency & Stress Tester
Simulates concurrent multi-file ingestion uploads across multi-tenant workspaces.
"""

import os
import json
import time
import glob
import argparse
import requests
from concurrent.futures import ThreadPoolExecutor

TENANTS = ["hr_support_v2", "finance_v1", "engineering_v1"]

def upload_single_file(api_base_url: str, tenant_id: str, filepath: str) -> dict:
    start_time = time.time()
    filename = os.path.basename(filepath)
    url = f"{api_base_url.rstrip('/')}/api/tenants/{tenant_id}/ingest"
    cfg_json = json.dumps({filename: {"family_key": "auto", "version": "1.0"}})
    
    try:
        with open(filepath, "rb") as f:
            files = [("files", (filename, f, "application/pdf"))]
            data = {"configs": cfg_json}
            response = requests.post(url, files=files, data=data, timeout=60.0)
            latency = time.time() - start_time
            
            if response.status_code == 200:
                res_data = response.json()
                results_list = res_data.get("results", [])
                job_id = results_list[0].get("job_id", "N/A") if results_list else "queued"
                return {
                    "status": "SUCCESS",
                    "filename": filename,
                    "tenant_id": tenant_id,
                    "job_id": job_id,
                    "latency_sec": round(latency, 3),
                    "http_code": 200
                }
            else:
                return {
                    "status": "FAILED",
                    "filename": filename,
                    "tenant_id": tenant_id,
                    "error": response.text[:200],
                    "latency_sec": round(latency, 3),
                    "http_code": response.status_code
                }
    except Exception as e:
        return {
            "status": "ERROR",
            "filename": filename,
            "tenant_id": tenant_id,
            "error": str(e),
            "latency_sec": round(time.time() - start_time, 3),
            "http_code": 0
        }

def run_ingestion_stress_test(api_base_url: str, docs_dir: str, concurrency: int = 10, max_files: int = 50):
    pdf_files = sorted(glob.glob(os.path.join(docs_dir, "*.pdf")))
    if not pdf_files:
        print(f"❌ No PDF files found in '{docs_dir}'. Run scripts/generate_load_dataset.py first.")
        return
        
    pdf_files = pdf_files[:max_files]
    print(f"⚡ Starting Ingestion Stress Test: {len(pdf_files)} PDFs with Concurrency={concurrency} against {api_base_url}...")
    
    start_bench = time.time()
    results = []
    
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = []
        for idx, filepath in enumerate(pdf_files):
            tenant_id = TENANTS[idx % len(TENANTS)]
            futures.append(executor.submit(upload_single_file, api_base_url, tenant_id, filepath))
            
        for future in futures:
            results.append(future.result())
            
    total_duration = time.time() - start_bench
    
    success_count = sum(1 for r in results if r["status"] == "SUCCESS")
    fail_count = sum(1 for r in results if r["status"] in ["FAILED", "ERROR"])
    avg_latency = round(sum(r["latency_sec"] for r in results) / len(results), 3) if results else 0.0
    throughput_dps = round(len(results) / total_duration, 2)
    
    print("\n" + "="*70)
    print("📊 INGESTION PIPELINE STRESS TEST RESULTS")
    print("="*70)
    print(f"• Total Documents Processed : {len(results)}")
    print(f"• Successful Ingestion Tasks : {success_count} ({round(success_count/len(results)*100, 1)}%)")
    print(f"• Failed / Rejected Uploads  : {fail_count}")
    print(f"• Total Execution Duration   : {round(total_duration, 2)} seconds")
    print(f"• Average Submission Latency : {avg_latency} seconds")
    print(f"• Ingestion Submission Speed  : {throughput_dps} docs/sec ({round(throughput_dps*60, 1)} docs/min)")
    print("="*70 + "\n")
    
    return {
        "total": len(results),
        "success": success_count,
        "failed": fail_count,
        "duration_sec": round(total_duration, 2),
        "throughput_dps": throughput_dps,
        "avg_latency_sec": avg_latency
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingestion Pipeline Concurrency & Stress Tester")
    parser.add_argument("--api_url", type=str, default="http://localhost:8000", help="Base API endpoint URL")
    parser.add_argument("--docs_dir", type=str, default="load_test_docs", help="Path to PDF documents directory")
    parser.add_argument("--concurrency", type=int, default=10, help="Parallel upload thread count (default: 10)")
    parser.add_argument("--max_files", type=int, default=50, help="Maximum PDF files to upload (default: 50)")
    args = parser.parse_args()
    
    run_ingestion_stress_test(args.api_url, args.docs_dir, args.concurrency, args.max_files)
