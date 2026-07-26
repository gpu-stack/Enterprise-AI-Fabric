import os
import asyncio
from celery import Celery
from src.config import settings
from src.processing.ingest_pipeline import TenantIngestionPipeline

redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery = Celery(
    "enterprise_rag_tasks",
    broker=redis_url,
    backend=redis_url,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)

@celery.task(bind=True, name="ingest_file_task", acks_late=True, max_retries=3)
def async_ingest_file(self, tenant_id: str, file_path: str, filename: str, custom_family_key: str = None, target_to_replace: str = None, document_version: str = None):
    """
    Celery task to run the ingestion pipeline.
    """
    def progress_callback(status: str, fraction: float):
        self.update_state(state='PROGRESS', meta={'status': status, 'progress': fraction})

    try:
        pipeline = TenantIngestionPipeline(tenant_id=tenant_id)
        
        # We assume file_source is a path because Celery cannot serialize file streams
        with open(file_path, "rb") as f:
            status = pipeline.process_and_upsert(
                document_name=filename,
                file_source=f,
                custom_family_key=custom_family_key,
                target_to_replace=target_to_replace,
                document_version=document_version,
                progress_callback=progress_callback
            )
            
        deprecation_count = getattr(pipeline, "last_deprecation_count", 0)
        
        # Clean up the temp file after successful ingestion
        if os.path.exists(file_path):
            os.remove(file_path)
            
        return {
            "status": "success",
            "ingest_status": status,
            "deprecation_count": deprecation_count,
            "family_key": custom_family_key
        }
    except Exception as e:
        # If we haven't exhausted our retries, retry the task.
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=5)
            
        # Clean up on ultimate failure
        if os.path.exists(file_path):
            os.remove(file_path)
        raise e
