import os
import json
from datetime import datetime, timezone
from cryptography.fernet import Fernet
from src.config import Config

# Setup centralized data directory for volume persistence
DATA_DIR = os.getenv("DATA_DIR", "/app/app_data" if os.path.exists("/app/app_data") else "app_data")
if not os.path.exists(DATA_DIR):
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
    except Exception:
        DATA_DIR = "."  # Fallback to local directory if permission denied

KEY_FILE = os.path.join(DATA_DIR, ".enc_key")
DATA_FILE = os.path.join(DATA_DIR, "model_profiles.enc")
REGISTRY_FILE = os.path.join(DATA_DIR, "tenant_registry.json")

class SecureStorageManager:
    @staticmethod
    def _get_or_create_key() -> bytes:
        if os.path.exists(KEY_FILE):
            with open(KEY_FILE, "rb") as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            # Set restrictive file permissions (read/write by owner only)
            with open(KEY_FILE, "wb") as f:
                f.write(key)
            try:
                os.chmod(KEY_FILE, 0o600)
            except Exception:
                pass
            return key

    @classmethod
    def save_encrypted_profiles(cls, profiles: dict):
        key = cls._get_or_create_key()
        fernet = Fernet(key)
        serialized = json.dumps(profiles).encode("utf-8")
        encrypted = fernet.encrypt(serialized)
        with open(DATA_FILE, "wb") as f:
            f.write(encrypted)

    @classmethod
    def load_encrypted_profiles(cls) -> dict:
        if not os.path.exists(DATA_FILE):
            # Seed with default config from env variables as the first profile
            default_profile = {
                "_active_profile": "Default Environment",
                "Default Environment": {
                    "LLM_DEPLOYMENT_MODE": Config.LLM_DEPLOYMENT_MODE,
                    "LLM_API_BASE_URL": Config.LLM_API_BASE_URL,
                    "LLM_API_KEY": Config.LLM_API_KEY,
                    "DEFAULT_MODEL_ID": Config.DEFAULT_MODEL_ID,
                    "QDRANT_URL": Config.QDRANT_BASE_URL or "",
                    "EMBEDDING_SERVER_URL": Config.EMBEDDING_SERVER_URL or "",
                    "RERANKER_SERVER_URL": Config.RERANKER_SERVER_URL or "",
                    "VECTOR_TOP_K": Config.VECTOR_TOP_K,
                    "RERANK_TOP_K": Config.RERANK_TOP_K,
                    "RERANKER_SCORE_THRESHOLD": Config.RERANKER_SCORE_THRESHOLD,
                    "PROVIDER_TYPE": "Cloud API" if Config.LLM_DEPLOYMENT_MODE == "CLOUD" else "vLLM"
                }
            }
            cls.save_encrypted_profiles(default_profile)
            return default_profile
        try:
            key = cls._get_or_create_key()
            fernet = Fernet(key)
            with open(DATA_FILE, "rb") as f:
                encrypted = f.read()
            decrypted = fernet.decrypt(encrypted)
            return json.loads(decrypted.decode("utf-8"))
        except Exception:
            return {}

    @classmethod
    def save_tenant_registry(cls, registry: dict):
        with open(REGISTRY_FILE, "w") as f:
            json.dump(registry, f, indent=4)

    @classmethod
    def load_tenant_registry(cls) -> dict:
        if not os.path.exists(REGISTRY_FILE):
            # Seed and save default settings
            default_registry = {
                "finance_reasoning": "finance_reasoning",
                "tech_support": "tech_support"
            }
            cls.save_tenant_registry(default_registry)
            return default_registry
        try:
            with open(REGISTRY_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {
                "finance_reasoning": "finance_reasoning",
                "tech_support": "tech_support"
            }

    EVAL_RUNS_FILE = os.path.join(DATA_DIR, "eval_runs.json")

    @classmethod
    def save_eval_runs(cls, runs: list):
        with open(cls.EVAL_RUNS_FILE, "w") as f:
            json.dump(runs, f, indent=4)

    @classmethod
    def load_eval_runs(cls) -> list:
        if not os.path.exists(cls.EVAL_RUNS_FILE):
            return []
        try:
            with open(cls.EVAL_RUNS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return []

    PROMPTS_FILE = os.path.join(DATA_DIR, "tenant_prompts.json")
    DEFAULT_SYSTEM_PROMPT = (
        "You are SandyGPT, an expert corporate AI assistant operating inside an isolated enterprise data partition.\n"
        "Answer user queries strictly, accurately, and concisely using the provided reference documents.\n\n"
        "### Strict Grounding Boundaries\n"
        "- State only the raw facts explicitly mentioned or directly answered in the reference documents.\n"
        "- Do NOT use logical transition words, summaries, or deductive connectors (e.g., do not say 'Therefore', 'However', 'Consequently', or 'As a result').\n"
        "- Completely eliminate explanatory bridges. Write only direct, independent factual declarations.\n"
        "- Output ONLY the pure extracted facts. Never include conversational preambles or comment on prompt structure.\n"
        "- Do NOT print document indices, source labels, file names, or citation markers (e.g., do not append '(Source: Document X)').\n"
        "- If the documents do not provide an answer, reply exactly with: \"The requested information is not available in the provided documents.\"\n\n"
        "### Response Formatting\n"
        "- State the direct answer clearly in your very first sentence.\n"
        "- Present multi-step rules or structured guidelines using clean Markdown bullet points."
    )

    @classmethod
    def load_tenant_prompts(cls) -> dict:
        if not os.path.exists(cls.PROMPTS_FILE):
            return {}
        try:
            with open(cls.PROMPTS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}

    @classmethod
    def save_tenant_prompts(cls, prompts: dict):
        with open(cls.PROMPTS_FILE, "w") as f:
            json.dump(prompts, f, indent=4)

    @classmethod
    def get_active_prompt(cls, tenant_id: str) -> str:
        prompts = cls.load_tenant_prompts()
        record = prompts.get(tenant_id)
        if record and record.get("current_prompt"):
            return record.get("current_prompt")
        return cls.DEFAULT_SYSTEM_PROMPT

    @classmethod
    def get_prompt_record(cls, tenant_id: str) -> dict:
        prompts = cls.load_tenant_prompts()
        record = prompts.get(tenant_id)
        if not record:
            return {
                "tenant_id": tenant_id,
                "current_prompt": cls.DEFAULT_SYSTEM_PROMPT,
                "version": "v1.0",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "history": []
            }
        return record

    @classmethod
    def update_tenant_prompt(cls, tenant_id: str, new_prompt: str, note: str = None) -> dict:
        prompts = cls.load_tenant_prompts()
        record = prompts.get(tenant_id)
        now_str = datetime.now(timezone.utc).isoformat()
        clean_new = new_prompt.strip()
        custom_note = note.strip() if note and note.strip() else None
        
        if not record:
            new_record = {
                "tenant_id": tenant_id,
                "current_prompt": clean_new,
                "version": "v1.0",
                "updated_at": now_str,
                "history": [
                    {
                        "version": "v1.0",
                        "prompt": clean_new,
                        "updated_at": now_str,
                        "note": custom_note or "Initial custom prompt version"
                    }
                ]
            }
            prompts[tenant_id] = new_record
            cls.save_tenant_prompts(prompts)
            return new_record

        current_active = record.get("current_prompt", cls.DEFAULT_SYSTEM_PROMPT)
        if current_active.strip() != clean_new:
            history = record.get("history", [])
            version_num = len(history) + 1
            ver_str = f"v{version_num}.0"

            history.insert(0, {
                "version": record.get("version", f"v{version_num-1}.0"),
                "prompt": current_active,
                "updated_at": record.get("updated_at", now_str),
                "note": custom_note or f"Archived prior to {ver_str}"
            })

            record["current_prompt"] = clean_new
            record["version"] = ver_str
            record["updated_at"] = now_str
            record["history"] = history
            prompts[tenant_id] = record
            cls.save_tenant_prompts(prompts)

        return prompts[tenant_id]

    @classmethod
    def rollback_tenant_prompt(cls, tenant_id: str, target_version: str, target_updated_at: str = None) -> dict:
        prompts = cls.load_tenant_prompts()
        record = prompts.get(tenant_id)
        if not record or not record.get("history"):
            return cls.get_prompt_record(tenant_id)

        history = record.get("history", [])
        matched = None
        for item in history:
            match_ver = item.get("version") == target_version
            match_time = target_updated_at is None or item.get("updated_at") == target_updated_at
            if match_ver and match_time:
                matched = item
                break

        if matched:
            now_str = datetime.now(timezone.utc).isoformat()
            current_active = record.get("current_prompt")
            version_num = len(history) + 1
            ver_str = f"v{version_num}.0"

            history.insert(0, {
                "version": record.get("version", "v1.0"),
                "prompt": current_active,
                "updated_at": record.get("updated_at", now_str),
                "note": f"Archived before rollback to {target_version}"
            })

            record["current_prompt"] = matched.get("prompt")
            record["version"] = ver_str
            record["updated_at"] = now_str
            record["history"] = history
            prompts[tenant_id] = record
            cls.save_tenant_prompts(prompts)

        return prompts.get(tenant_id, cls.get_prompt_record(tenant_id))

    @classmethod
    def delete_prompt_history_entry(cls, tenant_id: str, target_version: str, updated_at: str = None) -> dict:
        prompts = cls.load_tenant_prompts()
        record = prompts.get(tenant_id)
        if not record or not record.get("history"):
            return cls.get_prompt_record(tenant_id)

        history = record.get("history", [])
        new_history = []
        for item in history:
            match_ver = item.get("version") == target_version
            match_time = updated_at is None or item.get("updated_at") == updated_at
            if match_ver and match_time:
                continue
            new_history.append(item)

        record["history"] = new_history
        prompts[tenant_id] = record
        cls.save_tenant_prompts(prompts)
        return record

    @classmethod
    def update_prompt_history_note(cls, tenant_id: str, target_version: str, new_note: str, updated_at: str = None) -> dict:
        prompts = cls.load_tenant_prompts()
        record = prompts.get(tenant_id)
        if not record or not record.get("history"):
            return cls.get_prompt_record(tenant_id)

        history = record.get("history", [])
        for item in history:
            match_ver = item.get("version") == target_version
            match_time = updated_at is None or item.get("updated_at") == updated_at
            if match_ver and match_time:
                item["note"] = new_note.strip()
                break

        record["history"] = history
        prompts[tenant_id] = record
        cls.save_tenant_prompts(prompts)
        return record
