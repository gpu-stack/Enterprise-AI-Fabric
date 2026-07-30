import os
import time
import asyncio
import sqlite3
from datetime import datetime, timezone
from typing import Dict, Any
from src.utils.logger import logger, load_retention_config, save_retention_config, DB_FILE, LOG_DIR
from src.database.audit_vault import AuditVault

class LogRetentionManager:
    """Manages dynamic retention policies and executes SQL/disk purges."""

    @classmethod
    def get_retention_config(cls) -> Dict[str, Any]:
        return load_retention_config()

    @classmethod
    def update_retention_config(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        updated = save_retention_config(payload)
        AuditVault.record_audit_event(
            action_type="CONFIG_UPDATE",
            title="Updated Log & Audit Vault Retention Rules",
            details=updated
        )
        return updated

    @classmethod
    def execute_purge(cls, purge_metrics: bool = False) -> Dict[str, Any]:
        """Executes immediate log cleanup in SQLite database and rotated disk files."""
        cfg = load_retention_config()
        sys_retention_days = cfg.get("log_retention_days", 30)
        audit_retention_days = cfg.get("audit_retention_days", 365)

        now_sec = time.time()
        sys_cutoff_iso = datetime.fromtimestamp(now_sec - (sys_retention_days * 86400), timezone.utc).isoformat()
        audit_cutoff_iso = datetime.fromtimestamp(now_sec - (audit_retention_days * 86400), timezone.utc).isoformat()

        sys_purged = 0
        audit_purged = 0
        metrics_purged = 0

        if os.path.exists(DB_FILE):
            conn = sqlite3.connect(DB_FILE, timeout=10.0)
            try:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM system_logs WHERE timestamp < ?", (sys_cutoff_iso,))
                sys_purged = cursor.rowcount

                cursor.execute("DELETE FROM audit_logs WHERE timestamp < ?", (audit_cutoff_iso,))
                audit_purged = cursor.rowcount

                if purge_metrics:
                    cursor.execute("DELETE FROM request_metrics")
                    metrics_purged = cursor.rowcount
                else:
                    cursor.execute("DELETE FROM request_metrics WHERE timestamp < ?", (sys_cutoff_iso,))
                    metrics_purged = cursor.rowcount

                conn.commit()
            finally:
                conn.close()

        # Purge rotated file segments on disk
        purged_files = []
        if os.path.exists(LOG_DIR):
            sys_cutoff_sec = now_sec - (sys_retention_days * 86400)
            for fname in os.listdir(LOG_DIR):
                if fname.startswith("system.log."):
                    fpath = os.path.join(LOG_DIR, fname)
                    if os.path.getmtime(fpath) < sys_cutoff_sec:
                        try:
                            os.remove(fpath)
                            purged_files.append(fname)
                        except Exception:
                            pass

        result = {
            "status": "success",
            "message": f"Successfully purged {sys_purged} system logs, {audit_purged} audit records, {metrics_purged} metrics, and {len(purged_files)} log file segments.",
            "sys_logs_purged": sys_purged,
            "audit_records_purged": audit_purged,
            "metrics_purged": metrics_purged,
            "purged_files": purged_files
        }

        AuditVault.record_audit_event(
            action_type="LOG_PURGE",
            title="Executed Manual Log & Audit Purge",
            details=result
        )

        return result

async def start_background_retention_worker():
    """Async background worker executing periodic log retention cleanup every 24 hours."""
    logger.info("Initializing 24-hour Background Log Retention Cleanup Worker...", component="SYSTEM")
    while True:
        try:
            await asyncio.sleep(86400) # 24 hours interval
            logger.info("Executing 24-hour Automated Log Retention Cleanup...", component="SYSTEM")
            LogRetentionManager.execute_purge()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Background retention worker fault: {str(e)}", component="SYSTEM")

RetentionManager = LogRetentionManager
