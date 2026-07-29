import os
import json
import time
import sqlite3
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from src.utils.logger import logger, DB_FILE

AUDIT_JSONL_FILE = os.path.join(os.getcwd(), "app_data", "audit_vault.jsonl")
os.makedirs(os.path.dirname(AUDIT_JSONL_FILE), exist_ok=True)

class AuditVaultManager:
    """Manages immutable administrative and security audit events with dual-write to SQLite and audit_vault.jsonl."""

    @classmethod
    def record_audit_event(
        cls,
        action_type: str,
        title: str,
        details: Dict[str, Any],
        actor: str = "Admin User",
        tenant_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Records a new security/administrative audit event (SQLite + JSONL dual-write)."""
        now = datetime.now(timezone.utc)
        timestamp = now.isoformat()
        display_time = now.strftime("%Y-%m-%d %H:%M:%S UTC")
        event_id = f"audit-{int(time.time()*1000)}-{os.urandom(3).hex()}"
        act_type = action_type.upper()
        t_id = tenant_id or "GLOBAL"
        details_json = json.dumps(details or {})

        event = {
            "id": event_id,
            "timestamp": timestamp,
            "display_time": display_time,
            "action_type": act_type,
            "title": title,
            "actor": actor,
            "tenant_id": t_id,
            "details": details or {}
        }

        # 1. Write to SQLite audit_logs table
        try:
            conn = sqlite3.connect(DB_FILE, timeout=10.0)
            try:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO audit_logs (id, timestamp, display_time, action_type, title, actor, tenant_id, details_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (event_id, timestamp, display_time, act_type, title, actor, t_id, details_json))
                conn.commit()
            finally:
                conn.close()
        except Exception as e:
            print(f"⚠️ AuditVault SQLite write fault: {str(e)}")

        # 2. Append-only write to app_data/audit_vault.jsonl
        try:
            with open(AUDIT_JSONL_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(event) + "\n")
        except Exception as e:
            print(f"⚠️ AuditVault JSONL write fault: {str(e)}")

        logger.info(f"[AUDIT] {act_type}: {title}", component="SECURITY_AUDIT", tenant_id=t_id, details=event)
        return event

    @classmethod
    def load_audit_events(cls, limit: int = 200, offset: int = 0, tenant_id: Optional[str] = None, action_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Queries audit trail events from SQLite database with fallback to JSONL file."""
        if os.path.exists(DB_FILE):
            try:
                conn = sqlite3.connect(DB_FILE, timeout=5.0)
                conn.row_factory = sqlite3.Row
                try:
                    cursor = conn.cursor()
                    sql = "SELECT * FROM audit_logs WHERE 1=1"
                    params = []
                    if tenant_id and tenant_id.upper() != "ALL":
                        sql += " AND UPPER(tenant_id) = ?"
                        params.append(tenant_id.upper())
                    if action_type and action_type.upper() != "ALL":
                        sql += " AND UPPER(action_type) = ?"
                        params.append(action_type.upper())
                    
                    sql += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
                    params.extend([limit, offset])

                    cursor.execute(sql, params)
                    rows = cursor.fetchall()
                    events = []
                    for row in rows:
                        r = dict(row)
                        try:
                            r["details"] = json.loads(r["details_json"]) if r["details_json"] else {}
                        except Exception:
                            r["details"] = {}
                        events.append(r)
                    return events
                finally:
                    conn.close()
            except Exception:
                pass

        # Fallback to JSONL file
        if os.path.exists(AUDIT_JSONL_FILE):
            events = []
            try:
                with open(AUDIT_JSONL_FILE, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            events.append(json.loads(line.strip()))
                events.reverse()
                return events[offset:offset+limit]
            except Exception:
                pass
        return []

    @classmethod
    def export_audit_csv(cls, tenant_id: Optional[str] = None, action_type: Optional[str] = None) -> str:
        """Exports audit vault events formatted as RFC 4180 CSV."""
        import csv
        import io
        events = cls.load_audit_events(limit=5000, offset=0, tenant_id=tenant_id, action_type=action_type)
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(["ID", "Timestamp_UTC", "Action_Type", "Title", "Actor", "Tenant_ID", "Details"])
        
        for ev in events:
            writer.writerow([
                ev.get("id", ""),
                ev.get("display_time", ev.get("timestamp", "")),
                ev.get("action_type", ""),
                ev.get("title", ""),
                ev.get("actor", ""),
                ev.get("tenant_id", ""),
                json.dumps(ev.get("details", {}))
            ])
        return output.getvalue()

AuditVault = AuditVaultManager
