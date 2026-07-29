#!/usr/bin/env python3
"""
Synthetic Load Test Document Generator
Generates realistic corporate PDF documents for ingestion and RAG benchmark testing.
"""

import os
import random
import argparse
from typing import List
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

CORPORATE_SECTORS = [
    {
        "category": "HR_Policy",
        "title": "Corporate Human Resources & Leave Policy 2026",
        "sections": [
            "Employees are entitled to 25 calendar days of paid annual leave per fiscal year.",
            "Maternity leave provides 26 consecutive weeks of fully paid leave for eligible employees.",
            "Remote work options are accessible for up to 3 days per week subject to managerial approval.",
            "Health insurance covers inpatient treatment up to 500,000 INR per family unit per annum."
        ]
    },
    {
        "category": "Finance_Audit",
        "title": "Quarterly Financial Performance & Balance Sheet Report",
        "sections": [
            "Q3 Consolidated Revenue reached 42.8 Million USD representing a 14.2% YoY growth.",
            "Operating expenses decreased by 3.5% due to automation in invoice processing.",
            "EBITDA margin improved to 28.4% compared to 24.1% in the prior fiscal quarter.",
            "Capital expenditures for cloud infrastructure totaled 6.1 Million USD."
        ]
    },
    {
        "category": "Tech_Spec",
        "title": "Enterprise RAG Microservices Architecture & Protocol Spec",
        "sections": [
            "Vector database index operates on Qdrant cluster with Cosine distance metric.",
            "Text embedding inference container handles dense vectors with 1024 dimensions.",
            "Cross-encoder reranking microservice scores candidates using a score threshold of 0.40.",
            "Celery task workers process document chunks asynchronously with Redis broker queueing."
        ]
    },
    {
        "category": "Legal_Contract",
        "title": "Master Services & Non-Disclosure Agreement (SLA Terms)",
        "sections": [
            "The Provider guarantees 99.9% uptime for API gateway and retrieval pipelines.",
            "Both parties agree to treat proprietary data with strict confidentiality for 5 years.",
            "Unscheduled downtime exceeding 4 hours per month triggers a service credit of 15%.",
            "Liability limit shall not exceed total fees paid during the preceding 12 months."
        ]
    },
    {
        "category": "Operations_SOP",
        "title": "Standard Operating Procedure: Incident Response & Deployment",
        "sections": [
            "Severity 1 incidents require notification within 15 minutes of detection.",
            "Post-mortem analysis reports must be published within 48 hours of resolution.",
            "Production container deployments follow a blue-green rolling update sequence.",
            "Database backups are executed every 6 hours with 30-day retention policies."
        ]
    }
]

def generate_pdf(filepath: str, category_info: dict, doc_id: int, page_count: int = 2):
    doc = SimpleDocTemplate(filepath, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor('#1e293b'))
    heading_style = ParagraphStyle('SectionHeading', parent=styles['Heading2'], fontSize=12, leading=16, textColor=colors.HexColor('#3b82f6'), spaceBefore=10)
    body_style = ParagraphStyle('BodyTextCustom', parent=styles['BodyText'], fontSize=10, leading=14, textColor=colors.HexColor('#334155'))
    
    story = []
    
    # Header
    story.append(Paragraph(f"<b>{category_info['title']} (Ref ID: DOC-{doc_id:04d})</b>", title_style))
    story.append(Spacer(1, 12))
    
    for page_idx in range(page_count):
        story.append(Paragraph(f"<b>Section {page_idx + 1}: Overview & Guidelines</b>", heading_style))
        for section in category_info['sections']:
            story.append(Paragraph(f"• {section} (Batch Item {doc_id}-{page_idx})", body_style))
            story.append(Spacer(1, 4))
            
        # Add a financial/tabular metrics layout for realism
        table_data = [
            ["Metric Parameter", "Target Value", "SLA Threshold", "Status"],
            [f"Pipeline Stage {page_idx+1}", f"{random.randint(10, 99)} ms", "< 150 ms", "HEALTHY"],
            ["Throughput Capacity", f"{random.randint(100, 500)} req/sec", "> 50 req/sec", "OPTIMAL"],
            ["Verification Score", f"{round(random.uniform(0.85, 0.99), 2)}", "> 0.80", "PASSED"]
        ]
        t = Table(table_data, colWidths=[140, 100, 100, 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#0f172a')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(Spacer(1, 8))
        story.append(t)
        story.append(Spacer(1, 14))
        
    doc.build(story)

def generate_dataset(count: int = 100, output_dir: str = "load_test_docs"):
    os.makedirs(output_dir, exist_ok=True)
    print(f"🚀 Generating {count} synthetic PDF documents in '{output_dir}/'...")
    
    generated_files = []
    for i in range(1, count + 1):
        sector = CORPORATE_SECTORS[(i - 1) % len(CORPORATE_SECTORS)]
        filename = f"{sector['category']}_doc_{i:04d}.pdf"
        filepath = os.path.join(output_dir, filename)
        pages = random.choice([1, 2, 3, 5])
        generate_pdf(filepath, sector, i, page_count=pages)
        generated_files.append(filepath)
        if i % 25 == 0 or i == count:
            print(f"  └── Progress: {i}/{count} PDFs created...")
            
    print(f"✅ Successfully generated {len(generated_files)} synthetic PDF files in '{output_dir}/'.\n")
    return generated_files

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synthetic PDF Document Generator for Load Testing")
    parser.add_argument("--count", type=int, default=100, help="Number of synthetic PDF files to generate (default: 100)")
    parser.add_argument("--output_dir", type=str, default="load_test_docs", help="Target output directory for PDFs")
    args = parser.parse_args()
    
    generate_dataset(count=args.count, output_dir=args.output_dir)
