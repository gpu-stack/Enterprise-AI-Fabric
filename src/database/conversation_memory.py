import json
import logging
from typing import List, Dict, Any, Optional
from src.config import settings

logger = logging.getLogger("ConversationMemory")

class RedisConversationMemoryManager:
    """Production-ready Redis-backed Multi-Turn Conversation Memory Manager."""
    _instance = None

    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or getattr(settings, "REDIS_URL", "redis://localhost:6379/0")

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _get_client(self):
        try:
            import redis
            return redis.Redis.from_url(self.redis_url, socket_timeout=3.0, decode_responses=True)
        except Exception as e:
            logger.warning(f"Redis connection error in ConversationMemoryManager: {str(e)}")
            return None

    def get_session_history(self, session_id: str, limit: int = 10) -> List[Dict[str, str]]:
        """Retrieves sliding window conversation history for a given session ID."""
        if not session_id:
            return []
        key = f"rag:session:{session_id}"
        client = self._get_client()
        if not client:
            return []
        try:
            # Fetch recent turns from Redis list
            raw_turns = client.lrange(key, -limit, -1)
            history = []
            for raw_item in raw_turns:
                try:
                    turn_data = json.loads(raw_item)
                    if isinstance(turn_data, list):
                        history.extend(turn_data)
                    elif isinstance(turn_data, dict):
                        history.append(turn_data)
                except Exception:
                    pass
            return history
        except Exception as e:
            logger.warning(f"Failed to fetch conversation history from Redis for session '{session_id}': {str(e)}")
            return []

    def add_turn(self, session_id: str, user_message: str, assistant_response: str, ttl: int = 86400) -> bool:
        """Appends a user/assistant turn to the session history in Redis."""
        if not session_id:
            return False
        key = f"rag:session:{session_id}"
        client = self._get_client()
        if not client:
            return False
        try:
            turn = [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": assistant_response}
            ]
            client.rpush(key, json.dumps(turn))
            # Limit stored items to max 20 turns
            client.ltrim(key, -20, -1)
            # Set TTL (default 24 hours)
            client.expire(key, ttl)
            return True
        except Exception as e:
            logger.warning(f"Failed to save conversation turn to Redis for session '{session_id}': {str(e)}")
            return False

    def clear_session(self, session_id: str) -> bool:
        """Purges conversation history for a session ID."""
        if not session_id:
            return False
        key = f"rag:session:{session_id}"
        client = self._get_client()
        if not client:
            return False
        try:
            client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Failed to clear conversation history from Redis for session '{session_id}': {str(e)}")
            return False
