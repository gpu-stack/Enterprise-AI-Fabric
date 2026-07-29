import os
import sys
import json
import time
import sqlite3
import logging
import traceback
import queue
from datetime import datetime, timezone
from contextvars import ContextVar
from logging.handlers import QueueHandler, QueueListener
from typing import List, Dict, Any, Optional

LOG_DIR = os.path.join(os.getcwd(), "app_data", "logs")
os.makedirs(LOG_DIR, exist_ok=True)
SYSTEM_LOG_FILE = os.path.join(LOG_DIR, "system.log")
DB_FILE = os.path.join(os.getcwd(), "app_data", "observability.db")
RETENTION_CONFIG_FILE = os.path.join(os.getcwd(), "app_data", "log_retention_config.json")

# --- CONTEXTVARS FOR TRANSPARENT CORRELATION & TENANT TRACING ---
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="sys-core")
tenant_id_var: ContextVar[str] = ContextVar("tenant_id", default="GLOBAL")

DEFAULT_RETENTION_CONFIG = {
    "log_retention_days": 30,
    "max_file_size_mb": 10,
    "max_backup_files": 5,
    "audit_retention_days": 365,
    "max_eval_runs_limit": 100
}

def load_retention_config() -> Dict[str, Any]:
    """Loads dynamic log retention settings from app_data/log_retention_config.json."""
    if os.path.exists(RETENTION_CONFIG_FILE):
        try:
            with open(RETENTION_CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                res = dict(DEFAULT_RETENTION_CONFIG)
                res.update(cfg)
                return res
        except Exception:
            pass
    return dict(DEFAULT_RETENTION_CONFIG)

def save_retention_config(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Saves dynamic retention settings to disk."""
    current = load_retention_config()
    current.update(cfg)
    os.makedirs(os.path.dirname(RETENTION_CONFIG_FILE), exist_ok=True)
    with open(RETENTION_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2)
    return current

def truncate_payload(text: Any, max_length: int = 500) -> str:
    """Helper: Truncates large prompt text, retrieved context chunks, and vectors in standard logs."""
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    if len(text) <= max_length:
        return text
    return f"{text[:max_length]}... [Truncated: Total {len(text)} chars]"

# --- SQLITE WAL DATABASE INITIALIZATION ---
def init_db():
    """Initializes SQLite database at app_data/observability.db with WAL mode enabled."""
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    try:
        cursor = conn.cursor()
        # Enable WAL mode & synchronous NORMAL for high-performance non-blocking writes
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        
        # System Logs Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                display_time TEXT NOT NULL,
                level TEXT NOT NULL,
                component TEXT NOT NULL,
                correlation_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                message TEXT NOT NULL,
                details_json TEXT,
                traceback TEXT
            );
        """)

        # Audit Logs Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                display_time TEXT NOT NULL,
                action_type TEXT NOT NULL,
                title TEXT NOT NULL,
                actor TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                details_json TEXT
            );
        """)

        # Request Telemetry Metrics Table (for p50, p90, p95, p99 percentiles)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS request_metrics (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                correlation_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                total_e2e_ms REAL NOT NULL,
                pre_processing_ms REAL DEFAULT 0.0,
                embedding_ms REAL DEFAULT 0.0,
                qdrant_ms REAL DEFAULT 0.0,
                rerank_ms REAL DEFAULT 0.0,
                generation_ms REAL DEFAULT 0.0,
                ttft_ms REAL DEFAULT 0.0,
                eval_ms REAL DEFAULT 0.0,
                tokens_gen INTEGER DEFAULT 0,
                tokens_per_sec REAL DEFAULT 0.0
            );
        """)

        # Indexes for fast querying
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_syslogs_ts ON system_logs(timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_syslogs_level ON system_logs(level);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_syslogs_comp ON system_logs(component);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_syslogs_corr ON system_logs(correlation_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_syslogs_tenant ON system_logs(tenant_id);")

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_logs(timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action_type);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);")

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reqm_ts ON request_metrics(timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reqm_tenant ON request_metrics(tenant_id);")
        conn.commit()
    finally:
        conn.close()

init_db()

# --- LOGGING FILTER FOR TRANSPARENT CONTEXTVARS INJECTION ---
class ContextualFilter(logging.Filter):
    """Filter that attaches current contextvars (correlation_id, tenant_id) to every LogRecord."""
    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = getattr(record, "correlation_id", None) or correlation_id_var.get()
        record.tenant_id = getattr(record, "tenant_id", None) or tenant_id_var.get()
        record.component = getattr(record, "component", None) or "SYSTEM"
        return True

# --- ASYNC SQLITE & FILE LOG HANDLER ---
class SQLiteAndFileHandler(logging.Handler):
    """Custom Log Handler that persists log entries to SQLite DB and system.log."""
    def emit(self, record: logging.LogRecord):
        try:
            now = datetime.now(timezone.utc)
            timestamp = now.isoformat()
            display_time = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            log_id = f"log-{int(time.time()*1000)}-{os.urandom(3).hex()}"

            level = record.levelname.upper()
            component = getattr(record, "component", "SYSTEM").upper()
            correlation_id = getattr(record, "correlation_id", "sys-core")
            tenant_id = getattr(record, "tenant_id", "GLOBAL")
            message = truncate_payload(record.getMessage(), max_length=1000)

            details_dict = getattr(record, "details", {}) or {}
            details_json = json.dumps(details_dict) if details_dict else "{}"

            traceback_str = None
            if record.exc_info:
                traceback_str = "".join(traceback.format_exception(*record.exc_info))
            elif getattr(record, "traceback_str", None):
                traceback_str = record.traceback_str

            # 1. Write to SQLite WAL DB
            conn = sqlite3.connect(DB_FILE, timeout=10.0)
            try:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO system_logs (id, timestamp, display_time, level, component, correlation_id, tenant_id, message, details_json, traceback)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (log_id, timestamp, display_time, level, component, correlation_id, tenant_id, message, details_json, traceback_str))
                conn.commit()
            finally:
                conn.close()

            # 2. Write to system.log file
            event = {
                "id": log_id,
                "timestamp": timestamp,
                "display_time": display_time,
                "level": level,
                "component": component,
                "correlation_id": correlation_id,
                "tenant_id": tenant_id,
                "message": message,
                "details": details_dict,
                "traceback": traceback_str
            }
            with open(SYSTEM_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(event) + "\n")
        except Exception:
            self.handleError(record)

# --- NON-BLOCKING QUEUE LISTENER WORKER ---
log_queue = queue.Queue(maxsize=10000)
sqlite_file_handler = SQLiteAndFileHandler()
sqlite_file_handler.addFilter(ContextualFilter())

console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [%(component)s] [%(correlation_id)s] %(message)s"))
console_handler.addFilter(ContextualFilter())

queue_listener = QueueListener(log_queue, sqlite_file_handler, console_handler, respect_handler_level=True)
queue_listener.start()

queue_handler = QueueHandler(log_queue)
queue_handler.addFilter(ContextualFilter())

root_logger = logging.getLogger("EnterpriseRAG")
root_logger.setLevel(logging.INFO)
root_logger.addHandler(queue_handler)

# --- CENTRALIZED LOGGER INTERFACE ---
class SystemLogger:
    @staticmethod
    def info(message: str, component: str = "SYSTEM", correlation_id: Optional[str] = None, tenant_id: Optional[str] = None, details: Dict[str, Any] = None):
        extra = {
            "component": component,
            "details": details or {}
        }
        if correlation_id:
            extra["correlation_id"] = correlation_id
        if tenant_id:
            extra["tenant_id"] = tenant_id
        root_logger.info(message, extra=extra)

    @staticmethod
    def success(message: str, component: str = "SYSTEM", correlation_id: Optional[str] = None, tenant_id: Optional[str] = None, details: Dict[str, Any] = None):
        extra = {
            "component": component,
            "details": details or {}
        }
        if correlation_id:
            extra["correlation_id"] = correlation_id
        if tenant_id:
            extra["tenant_id"] = tenant_id
        root_logger.info(f"SUCCESS: {message}", extra=extra)

    @staticmethod
    def warning(message: str, component: str = "SYSTEM", correlation_id: Optional[str] = None, tenant_id: Optional[str] = None, details: Dict[str, Any] = None):
        extra = {
            "component": component,
            "details": details or {}
        }
        if correlation_id:
            extra["correlation_id"] = correlation_id
        if tenant_id:
            extra["tenant_id"] = tenant_id
        root_logger.warning(message, extra=extra)

    @staticmethod
    def error(message: str, component: str = "SYSTEM", correlation_id: Optional[str] = None, tenant_id: Optional[str] = None, details: Dict[str, Any] = None, exception: Optional[Exception] = None):
        extra = {
            "component": component,
            "details": details or {}
        }
        if correlation_id:
            extra["correlation_id"] = correlation_id
        if tenant_id:
            extra["tenant_id"] = tenant_id
        if exception:
            extra["exc_info"] = (type(exception), exception, exception.__traceback__)
        root_logger.error(message, extra=extra)

    @staticmethod
    def get_logs_from_db(
        level: Optional[str] = None,
        component: Optional[str] = None,
        tenant_id: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 500,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Queries indexed system_logs table in SQLite observability.db."""
        conn = sqlite3.connect(DB_FILE, timeout=5.0)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            sql = "SELECT * FROM system_logs WHERE 1=1"
            params = []

            if level and level.upper() != "ALL":
                sql += " AND UPPER(level) = ?"
                params.append(level.upper())
            if component and component.upper() != "ALL":
                sql += " AND UPPER(component) LIKE ?"
                params.append(f"%{component.upper()}%")
            if tenant_id and tenant_id.upper() != "ALL":
                sql += " AND UPPER(tenant_id) = ?"
                params.append(tenant_id.upper())
            if search:
                sql += " AND (LOWER(message) LIKE ? OR LOWER(component) LIKE ? OR LOWER(correlation_id) LIKE ?)"
                s_pattern = f"%{search.lower()}%"
                params.extend([s_pattern, s_pattern, s_pattern])

            sql += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(sql, params)
            rows = cursor.fetchall()
            logs = []
            for row in rows:
                r = dict(row)
                try:
                    r["details"] = json.loads(r["details_json"]) if r["details_json"] else {}
                except Exception:
                    r["details"] = {}
                logs.append(r)
            return logs
        finally:
            conn.close()

    @staticmethod
    def get_telemetry_metrics() -> Dict[str, Any]:
        """Calculates 24-hour SLA telemetry metrics, recent 60s throughput (EPM/EPS), and component health."""
        if not os.path.exists(DB_FILE):
            return {}
        conn = sqlite3.connect(DB_FILE, timeout=5.0)
        try:
            cursor = conn.cursor()
            cutoff_24h = datetime.fromtimestamp(time.time() - 86400, timezone.utc).isoformat()
            cutoff_60s = datetime.fromtimestamp(time.time() - 60, timezone.utc).isoformat()
            
            # 1. 24-hour totals & error rates
            cursor.execute("""
                SELECT UPPER(component), 
                       COUNT(*) as total_cnt,
                       SUM(CASE WHEN UPPER(level) IN ('ERROR', 'FATAL') THEN 1 ELSE 0 END) as error_cnt
                FROM system_logs
                WHERE timestamp >= ?
                GROUP BY UPPER(component)
            """, (cutoff_24h,))
            
            rows_24h = cursor.fetchall()
            
            # 2. Recent 60-second throughput counts
            cursor.execute("""
                SELECT UPPER(component), COUNT(*) as recent_cnt
                FROM system_logs
                WHERE timestamp >= ?
                GROUP BY UPPER(component)
            """, (cutoff_60s,))
            recent_counts = dict(cursor.fetchall())

            metrics = {}
            for comp, total, errors in rows_24h:
                err_rate = round((errors / total * 100.0), 2) if total > 0 else 0.0
                success_rate = round(100.0 - err_rate, 2)
                recent_60s = recent_counts.get(comp, 0)
                epm = recent_60s
                eps = round(recent_60s / 60.0, 2)

                metrics[comp] = {
                    "total_events": total,
                    "error_events": errors,
                    "error_rate_pct": err_rate,
                    "success_rate_pct": success_rate,
                    "epm": epm,
                    "eps": eps,
                    "status": "HEALTHY" if err_rate < 5.0 else ("DEGRADED" if err_rate < 20.0 else "CRITICAL")
                }
            return metrics
        finally:
            conn.close()

    @staticmethod
    def record_request_telemetry(
        correlation_id: str,
        tenant_id: str,
        total_e2e_ms: float,
        pre_processing_ms: float = 0.0,
        embedding_ms: float = 0.0,
        qdrant_ms: float = 0.0,
        rerank_ms: float = 0.0,
        generation_ms: float = 0.0,
        ttft_ms: float = 0.0,
        eval_ms: float = 0.0,
        tokens_gen: int = 0,
        tokens_per_sec: float = 0.0
    ):
        """Asynchronously records granular RAG pipeline request telemetry in SQLite request_metrics table."""
        if not os.path.exists(DB_FILE):
            return
        now = datetime.now(timezone.utc).isoformat()
        rec_id = f"metric-{int(time.time()*1000)}-{os.urandom(3).hex()}"
        try:
            conn = sqlite3.connect(DB_FILE, timeout=5.0)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO request_metrics (
                    id, timestamp, correlation_id, tenant_id, total_e2e_ms,
                    pre_processing_ms, embedding_ms, qdrant_ms, rerank_ms,
                    generation_ms, ttft_ms, eval_ms, tokens_gen, tokens_per_sec
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                rec_id, now, correlation_id, tenant_id, float(total_e2e_ms),
                float(pre_processing_ms), float(embedding_ms), float(qdrant_ms), float(rerank_ms),
                float(generation_ms), float(ttft_ms), float(eval_ms), int(tokens_gen), float(tokens_per_sec)
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"⚠️ Error writing request metrics: {str(e)}")

    @staticmethod
    def calc_percentile(arr: List[float], p: float) -> float:
        if not arr:
            return 0.0
        s_arr = sorted(arr)
        k = (len(s_arr) - 1) * (p / 100.0)
        f = int(k)
        c = f + 1
        if c < len(s_arr):
            return round(s_arr[f] + (k - f) * (s_arr[c] - s_arr[f]), 2)
        return round(s_arr[f], 2)

    @classmethod
    def get_aggregate_metrics(cls, time_window: str = "24h", tenant_id: str = "ALL") -> Dict[str, Any]:
        """Calculates p50, p90, p95, p99 percentiles for RAG pipeline stages and component p95 values."""
        if not os.path.exists(DB_FILE):
            return cls._empty_aggregate_metrics()

        seconds_map = {"1h": 3600, "24h": 86400, "7d": 604800, "30d": 2592000}
        window_sec = seconds_map.get(time_window.lower(), 86400)
        cutoff = datetime.fromtimestamp(time.time() - window_sec, timezone.utc).isoformat()

        conn = sqlite3.connect(DB_FILE, timeout=5.0)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            sql = "SELECT * FROM request_metrics WHERE timestamp >= ?"
            params = [cutoff]
            if tenant_id and tenant_id.upper() != "ALL":
                sql += " AND UPPER(tenant_id) = ?"
                params.append(tenant_id.upper())

            cursor.execute(sql, params)
            rows = cursor.fetchall()
            if not rows:
                return cls._empty_aggregate_metrics()

            e2e_vals = [r["total_e2e_ms"] for r in rows if r["total_e2e_ms"] > 0]
            pre_vals = [r["pre_processing_ms"] for r in rows if r["pre_processing_ms"] > 0]
            emb_vals = [r["embedding_ms"] for r in rows if r["embedding_ms"] > 0]
            qdrant_vals = [r["qdrant_ms"] for r in rows if r["qdrant_ms"] > 0]
            rerank_vals = [r["rerank_ms"] for r in rows if r["rerank_ms"] > 0]
            gen_vals = [r["generation_ms"] for r in rows if r["generation_ms"] > 0]
            ttft_vals = [r["ttft_ms"] for r in rows if r["ttft_ms"] > 0]
            eval_vals = [r["eval_ms"] for r in rows if r["eval_ms"] > 0]
            tps_vals = [r["tokens_per_sec"] for r in rows if r["tokens_per_sec"] > 0]

            return {
                "sample_count": len(rows),
                "e2e": {
                    "p50": cls.calc_percentile(e2e_vals, 50),
                    "p90": cls.calc_percentile(e2e_vals, 90),
                    "p95": cls.calc_percentile(e2e_vals, 95),
                    "p99": cls.calc_percentile(e2e_vals, 99)
                },
                "stages_p95": {
                    "pre_processing_ms": cls.calc_percentile(pre_vals, 95),
                    "embedding_ms": cls.calc_percentile(emb_vals, 95),
                    "qdrant_ms": cls.calc_percentile(qdrant_vals, 95),
                    "rerank_ms": cls.calc_percentile(rerank_vals, 95),
                    "generation_ms": cls.calc_percentile(gen_vals, 95),
                    "eval_ms": cls.calc_percentile(eval_vals, 95)
                },
                "efficiency": {
                    "avg_ttft_ms": round(sum(ttft_vals)/len(ttft_vals), 2) if ttft_vals else 0.0,
                    "p95_ttft_ms": cls.calc_percentile(ttft_vals, 95),
                    "avg_tokens_per_sec": round(sum(tps_vals)/len(tps_vals), 2) if tps_vals else 0.0,
                    "p95_tokens_per_sec": cls.calc_percentile(tps_vals, 95)
                },
                "component_p95": {
                    "api_e2e_ms": cls.calc_percentile(e2e_vals, 95),
                    "qdrant_retrieval_ms": cls.calc_percentile(qdrant_vals, 95),
                    "reranker_ms": cls.calc_percentile(rerank_vals, 95),
                    "llm_gen_sec": round(cls.calc_percentile(gen_vals, 95) / 1000.0, 2),
                    "llm_ttft_ms": cls.calc_percentile(ttft_vals, 95),
                    "eval_sec": round(cls.calc_percentile(eval_vals, 95) / 1000.0, 2)
                }
            }
        finally:
            conn.close()

    @staticmethod
    def _empty_aggregate_metrics() -> Dict[str, Any]:
        return {
            "sample_count": 0,
            "e2e": {"p50": 0.0, "p90": 0.0, "p95": 0.0, "p99": 0.0},
            "stages_p95": {
                "pre_processing_ms": 0.0,
                "embedding_ms": 0.0,
                "qdrant_ms": 0.0,
                "rerank_ms": 0.0,
                "generation_ms": 0.0,
                "eval_ms": 0.0
            },
            "efficiency": {
                "avg_ttft_ms": 0.0,
                "p95_ttft_ms": 0.0,
                "avg_tokens_per_sec": 0.0,
                "p95_tokens_per_sec": 0.0
            },
            "component_p95": {
                "api_e2e_ms": 0.0,
                "qdrant_retrieval_ms": 0.0,
                "reranker_ms": 0.0,
                "llm_gen_sec": 0.0,
                "llm_ttft_ms": 0.0,
                "eval_sec": 0.0
            }
        }

logger = SystemLogger
