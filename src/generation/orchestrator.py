import json
import time
import urllib.request
import urllib.error
from typing import Dict, Any, List
from src.config import Config
from src.database.query_engine import MultiTenantQueryEngine
from src.utils.logger import logger as sys_logger

import ssl
ssl._create_default_https_context = ssl._create_unverified_context

def get_citation_quality_badge(score: float) -> Dict[str, str]:
    """Determines Cross-Encoder Citation Quality Badge based on confidence or RRF fusion scores."""
    if score < 0.05:
        # RRF (Reciprocal Rank Fusion) scores from Qdrant sparse+dense hybrid search
        if score >= 0.003:
            return {"badge": "HIGH_CONFIDENCE", "label": "High Confidence (RRF)", "class": "badge-success"}
        elif score >= 0.0003:
            return {"badge": "MEDIUM_CONFIDENCE", "label": "Medium Confidence (RRF)", "class": "badge-warning"}
        elif score > 0:
            return {"badge": "LOW_CONFIDENCE", "label": "Low Confidence", "class": "badge-info"}
        else:
            return {"badge": "UNVERIFIED", "label": "Unverified", "class": "badge-danger"}
    else:
        # Cross-Encoder Reranker probabilities/scores
        if score >= 0.50:
            return {"badge": "HIGH_CONFIDENCE", "label": "High Confidence", "class": "badge-success"}
        elif score >= 0.25:
            return {"badge": "MEDIUM_CONFIDENCE", "label": "Medium Confidence", "class": "badge-warning"}
        elif score >= 0.10:
            return {"badge": "LOW_CONFIDENCE", "label": "Low Confidence", "class": "badge-info"}
        else:
            return {"badge": "UNVERIFIED", "label": "Unverified", "class": "badge-danger"}

class ContextOrchestrator:
    def __init__(self):
        self.query_engine = MultiTenantQueryEngine()

    def _build_llm_endpoint_and_headers(self, api_base_url: str, api_key: str, provider_type: str) -> tuple:
        """Constructs valid REST endpoint URL and authentication headers supporting Azure OpenAI, Cloud APIs, and vLLM."""
        base_url = api_base_url.strip().rstrip('/')
        
        if "openai.azure.com" in base_url or "azure" in provider_type.lower():
            if "/chat/completions" in base_url:
                vllm_endpoint = base_url
            else:
                if "api-version" not in base_url:
                    vllm_endpoint = f"{base_url}/chat/completions?api-version=2024-02-15-preview"
                else:
                    vllm_endpoint = f"{base_url}/chat/completions"
        elif base_url.endswith("/chat/completions"):
            vllm_endpoint = base_url
        else:
            if provider_type in ["Ollama", "OpenAI-Compatible"] and not base_url.endswith("/v1") and "/v1/" not in base_url:
                base_url = f"{base_url}/v1"
            vllm_endpoint = f"{base_url}/chat/completions"

        headers = {"Content-Type": "application/json"}
        if api_key and api_key.lower() != "none":
            headers["Authorization"] = f"Bearer {api_key}"
            headers["api-key"] = api_key  # Required for Azure OpenAI REST API authentication

        return vllm_endpoint, headers

    def get_standalone_query(self, user_query: str, chat_history: List[Dict[str, str]], llm_overrides: Dict[str, Any] = None) -> str:
        """Converts a user query and conversation history into a clean standalone search query.
        If the user switches topics (e.g. from medical insurance to car lease), prior topic keywords are completely dropped.
        """
        # Fast Bypass on Turn 1 (0ms latency cost)
        if not chat_history or len(chat_history) == 0:
            return user_query.strip()

        history_lines = []
        for turn in chat_history[-6:]:
            role = turn.get("role", "user").upper()
            content = turn.get("content", "").strip()
            if content:
                history_lines.append(f"{role}: {content[:300]}")

        history_text = "\n".join(history_lines)
        if not history_text.strip():
            return user_query.strip()

        reformulation_prompt = (
            "Given the conversation history and a new user question, rephrase the question into a standalone search query.\n\n"
            "CRITICAL RULES:\n"
            "1. If the user question switches topics entirely (e.g. from medical insurance to car lease), DROP all prior topic keywords completely.\n"
            "2. Output ONLY the standalone search query without explanations, quotes, or conversational preamble.\n\n"
            f"--- CONVERSATION HISTORY ---\n{history_text}\n---------------------------\n\n"
            f"--- NEW USER QUESTION ---\n{user_query.strip()}\n-------------------------\n\n"
            "STANDALONE SEARCH QUERY:"
        )

        overrides = llm_overrides or {}
        deployment_mode = overrides.get("LLM_DEPLOYMENT_MODE", Config.LLM_DEPLOYMENT_MODE)
        api_base_url = overrides.get("LLM_API_BASE_URL", Config.LLM_API_BASE_URL)
        api_key = overrides.get("LLM_API_KEY", Config.LLM_API_KEY)
        default_model = overrides.get("DEFAULT_MODEL_ID", Config.DEFAULT_MODEL_ID)
        provider_type = overrides.get("PROVIDER_TYPE", "Cloud API" if deployment_mode == "CLOUD" else "vLLM")

        vllm_endpoint, headers = self._build_llm_endpoint_and_headers(api_base_url, api_key, provider_type)

        try:
            import requests
            vllm_payload = {
                "model": default_model,
                "messages": [{"role": "user", "content": reformulation_prompt}],
                "temperature": 0.0,
                "max_tokens": 30,
                "stop": ["\n", "User:", "Question:", "STANDALONE SEARCH QUERY:"]
            }
            res = requests.post(vllm_endpoint, json=vllm_payload, headers=headers, timeout=3.0)
            if res.status_code == 200:
                res_data = res.json()
                standalone = res_data["choices"][0]["message"]["content"].strip()
                if standalone.startswith('"') and standalone.endswith('"'):
                    standalone = standalone[1:-1].strip()
                if standalone:
                    sys_logger.info(f"Query reformulated: '{user_query}' -> '{standalone}'", component="ORCHESTRATOR")
                    return standalone
        except Exception as e:
            sys_logger.warning(f"Query reformulation pass failed: {str(e)}. Falling back to raw user query.", component="ORCHESTRATOR")

        return user_query.strip()

    def generate_answer(self, tenant_id: str, target_adapter: str, user_query: str, temperature: float, top_k: int, llm_overrides: Dict[str, Any] = None, request_start_time: float = None, session_id: str = None) -> Dict[str, Any]:
        pre_start = request_start_time or time.perf_counter_ns()
        pre_processing_ms = round((time.perf_counter_ns() - pre_start) / 1_000_000.0, 2)
        sys_logger.info(f"Generating answer for workspace '{tenant_id}' (query: '{user_query[:30]}...')", component="ORCHESTRATOR")

        try:
            # 1. Retrieve Redis conversation history if session_id is supplied
            history_turns = []
            if session_id:
                try:
                    from src.database.conversation_memory import RedisConversationMemoryManager
                    history_turns = RedisConversationMemoryManager.get_instance().get_session_history(session_id, limit=6)
                except Exception:
                    pass

            # 2. Perform Query Reformulation to isolate history topic switches from vector search
            search_query = self.get_standalone_query(user_query=user_query, chat_history=history_turns, llm_overrides=llm_overrides)

            # 3. Vector Context Retrieval
            points, retrieval_telemetry, discarded_points = self.query_engine.retrieve_context(
                query_str=search_query,
                tenant_id=tenant_id,
                limit=top_k
            )
            
            context_chunks = []
            citations = []
            context_nodes = []
            
            for pt in points:
                score = pt.get("score", 0.0)
                badge_info = get_citation_quality_badge(score)
                text_content = pt.get("text", "")
                if text_content:
                    context_chunks.append(text_content)
                    citations.append({
                        "source": pt.get("source_file", "unknown_source.pdf"),
                        "page": pt.get("page_number", "N/A"),
                        "score": round(score, 4),
                        "quality_badge": badge_info["badge"],
                        "badge_label": badge_info["label"],
                        "badge_class": badge_info["class"]
                    })
                    context_nodes.append({
                        "source": pt.get("source_file", "unknown_source.pdf"),
                        "page": pt.get("page_number", "N/A"),
                        "score": round(score, 4),
                        "quality_badge": badge_info["badge"],
                        "badge_label": badge_info["label"],
                        "badge_class": badge_info["class"],
                        "text": text_content,
                        "selected": True
                    })

            for pt in discarded_points:
                score = pt.get("score", 0.0)
                badge_info = get_citation_quality_badge(score)
                text_content = pt.get("text", "")
                if text_content:
                    context_nodes.append({
                        "source": pt.get("source_file", "unknown_source.pdf"),
                        "page": pt.get("page_number", "N/A"),
                        "score": round(score, 4),
                        "quality_badge": badge_info["badge"],
                        "badge_label": badge_info["label"],
                        "badge_class": badge_info["class"],
                        "text": text_content,
                        "selected": False
                    })

            flat_context = "\n---\n".join(context_chunks) if context_chunks else "NO VERIFIED CONTEXT DETECTED."

            ref_docs_str = ""
            if points:
                for idx, pt in enumerate(points[:4]):
                    title = pt.get("source_file", "unknown_source.pdf")
                    source = pt.get("source_file", "unknown_source.pdf")
                    content = pt.get("text", "").strip()
                    ref_docs_str += (
                        f"Document {idx + 1}\n\n"
                        f"Title:\n{title}\n\n"
                        f"Source:\n{source}\n\n"
                        f"Content:\n{content}\n\n"
                        "--------------------------------\n\n"
                    )
            else:
                ref_docs_str = "No verified context detected.\n\n--------------------------------\n\n"

            from src.database.secure_storage import SecureStorageManager
            custom_prompt = SecureStorageManager.get_active_prompt(tenant_id)
            system_instruction = (
                f"<system_instructions>\n"
                f"You are an Enterprise HR Operations Assistant operating in workspace [{tenant_id.upper()}]. Your ONLY task is to answer the user query strictly using the provided reference context.\n\n"
                f"<critical_rules>\n"
                f"1. STRICT TOPIC MATCHING: Before drafting an answer, verify if the provided context directly addresses the SPECIFIC topic in the user query (e.g., if the user asks about \"car lease\", the context MUST contain car lease policies).\n"
                f"2. DO NOT ANSWER OFF-TOPIC CONTEXT: If the provided context belongs to a different HR topic (e.g., medical claims, leave rules) than what was explicitly asked (e.g., car lease), treat the context as COMPLETELY IRRELEVANT.\n"
                f"3. EXACT FALLBACK TRIGGER: If the context is irrelevant or does not contain direct policy details for the specific requested topic, respond ONLY with this exact sentence and nothing else:\n"
                f"   \"The requested information regarding this topic is not available in the provided documents. Please reach out to your HR Business Partner for assistance.\"\n"
                f"4. ZERO FLUFF: Provide direct, dense, and complete policy answers. Avoid conversational preamble, filler transitions, or redundant pleasantries.\n"
                f"</critical_rules>\n\n"
                f"<output_format>\n"
                f"- State the direct answer in the very first sentence using pure extracted facts.\n"
                f"- Present multi-step rules or structured guidelines using clean Markdown bullet points (-).\n"
                f"- Bold exact deadlines, approval roles, or document names.\n"
                f"</output_format>\n"
                f"</system_instructions>\n\n"
                f"{custom_prompt}"
            )

            user_payload = (
                "### REFERENCE DOCUMENTS\n\n"
                f"{ref_docs_str.strip()}\n\n"
                "### QUESTION\n\n"
                f"{user_query.strip()}\n\n"
                "### GROUNDING INSTRUCTIONS\n\n"
                "Answer the question using ONLY the reference documents above.\n"
                "Before producing the final response, internally verify that every statement is directly supported by the text.\n"
                "Remove any unsupported claims. If the information is missing from the documents or irrelevant to the question topic, reply exactly with:\n"
                "\"The requested information regarding this topic is not available in the provided documents. Please reach out to your HR Business Partner for assistance.\"\n\n"
                "### FINAL ANSWER\n"
            )

            messages = [{"role": "system", "content": system_instruction}]
            for turn in history_turns:
                messages.append(turn)
            messages.append({"role": "user", "content": user_payload})

            overrides = llm_overrides or {}
            deployment_mode = overrides.get("LLM_DEPLOYMENT_MODE", Config.LLM_DEPLOYMENT_MODE)
            api_base_url = overrides.get("LLM_API_BASE_URL", Config.LLM_API_BASE_URL)
            api_key = overrides.get("LLM_API_KEY", Config.LLM_API_KEY)
            default_model = overrides.get("DEFAULT_MODEL_ID", Config.DEFAULT_MODEL_ID)
            provider_type = overrides.get("PROVIDER_TYPE", "Cloud API" if deployment_mode == "CLOUD" else "vLLM")

            vllm_endpoint, request_headers = self._build_llm_endpoint_and_headers(api_base_url, api_key, provider_type)

            if provider_type in ["Ollama", "OpenAI-Compatible", "Cloud API"] or "azure" in provider_type.lower() or "openai.azure.com" in api_base_url:
                target_model = default_model
            else:
                live_models = []
                try:
                    url = f"{api_base_url.rstrip('/')}/models"
                    req = urllib.request.Request(url, method="GET")
                    if api_key and api_key.lower() != "none":
                        req.add_header("Authorization", f"Bearer {api_key}")
                        req.add_header("api-key", api_key)
                    with urllib.request.urlopen(req, timeout=1.5) as res:
                        data = json.loads(res.read().decode("utf-8"))
                        live_models = [m["id"] for m in data.get("data", [])]
                except Exception:
                    pass
                
                if target_adapter in live_models:
                    target_model = target_adapter
                else:
                    target_model = default_model

            vllm_payload = {
                "model": target_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": 512
            }
            
            # Enforce strict local structural bounds to prevent token drift
            if provider_type not in ["Cloud API"]:
                vllm_payload["repetition_penalty"] = 1.05

            # Preserve request_headers generated by _build_llm_endpoint_and_headers (including Azure api-key)

            ttft_ms = 0.0
            generation_ms = 0.0
            response_text = ""
            token_metrics = {}

            try:
                import httpx
                vllm_payload["stream"] = True
                llm_start = time.perf_counter_ns()
                first_chunk_received = False
                
                with httpx.stream("POST", vllm_endpoint, json=vllm_payload, headers=request_headers, timeout=15.0) as r:
                    r.raise_for_status()
                    for line in r.iter_lines():
                        if not first_chunk_received:
                            ttft_ms = round((time.perf_counter_ns() - llm_start) / 1_000_000.0, 2)
                            first_chunk_received = True
                        
                        if line.startswith("data:"):
                            data_str = line[5:].strip()
                            if data_str == "[DONE]":
                                break
                            try:
                                chunk_data = json.loads(data_str)
                                delta = chunk_data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    response_text += delta["content"]
                            except Exception:
                                pass
                generation_ms = round((time.perf_counter_ns() - llm_start) / 1_000_000.0, 2)
                
                prompt_tokens = len(system_instruction.split()) + len(user_payload.split())
                completion_tokens = len(response_text.split())
                token_metrics = {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": prompt_tokens + completion_tokens
                }
            except Exception:
                import requests
                vllm_payload["stream"] = False
                llm_start = time.perf_counter_ns()
                res_sync = requests.post(vllm_endpoint, json=vllm_payload, headers=request_headers, timeout=15.0)
                res_sync.raise_for_status()
                res_data = res_sync.json()
                response_text = res_data["choices"][0]["message"]["content"]
                generation_ms = round((time.perf_counter_ns() - llm_start) / 1_000_000.0, 2)
                ttft_ms = round(generation_ms * 0.15, 2)
                token_metrics = res_data.get("usage", {})

            telemetry = {
                "pre_processing_ms": pre_processing_ms,
                "embedding_ms": retrieval_telemetry["embedding_ms"],
                "qdrant_ms": retrieval_telemetry["qdrant_ms"],
                "rerank_ms": retrieval_telemetry["rerank_ms"],
                "ttft_ms": ttft_ms,
                "generation_ms": generation_ms
            }

            total_e2e = round((time.perf_counter_ns() - pre_start) / 1_000_000.0, 2)
            comp_tokens = token_metrics.get("completion_tokens", 0)
            tps = round(comp_tokens / (generation_ms / 1000.0), 2) if generation_ms > 0 else 0.0
            
            sys_logger.record_request_telemetry(
                correlation_id="sys-gen",
                tenant_id=tenant_id,
                total_e2e_ms=total_e2e,
                pre_processing_ms=pre_processing_ms,
                embedding_ms=retrieval_telemetry["embedding_ms"],
                qdrant_ms=retrieval_telemetry["qdrant_ms"],
                rerank_ms=retrieval_telemetry["rerank_ms"],
                generation_ms=generation_ms,
                ttft_ms=ttft_ms,
                tokens_gen=comp_tokens,
                tokens_per_sec=tps
            )

            if session_id and response_text.strip():
                try:
                    from src.database.conversation_memory import RedisConversationMemoryManager
                    RedisConversationMemoryManager.get_instance().add_turn(session_id, user_query, response_text.strip())
                except Exception:
                    pass

            return {
                "status": "success",
                "answer": response_text.strip(),
                "citations": citations,
                "latency_seconds": round(total_e2e / 1000.0, 3),
                "token_metrics": token_metrics,
                "telemetry": telemetry,
                "raw_context_block": flat_context,
                "context_nodes": context_nodes
            }
        except Exception as e:
            return {"status": "error", "message": f"Modular Inference routing path failure: {str(e)}"}

    def generate_answer_stream(self, tenant_id: str, target_adapter: str, user_query: str, temperature: float, top_k: int, llm_overrides: Dict[str, Any] = None, request_start_time: float = None, session_id: str = None):
        pre_start = request_start_time or time.perf_counter_ns()
        pre_processing_ms = round((time.perf_counter_ns() - pre_start) / 1_000_000.0, 2)

        try:
            # 1. Retrieve Redis conversation history if session_id is supplied
            history_turns = []
            if session_id:
                try:
                    from src.database.conversation_memory import RedisConversationMemoryManager
                    history_turns = RedisConversationMemoryManager.get_instance().get_session_history(session_id, limit=6)
                except Exception:
                    pass

            # 2. Perform Query Reformulation to isolate history topic switches from vector search
            search_query = self.get_standalone_query(user_query=user_query, chat_history=history_turns, llm_overrides=llm_overrides)

            # 3. Vector Context Retrieval
            points, retrieval_telemetry, discarded_points = self.query_engine.retrieve_context(
                query_str=search_query,
                tenant_id=tenant_id,
                limit=top_k
            )
            
            context_chunks = []
            citations = []
            context_nodes = []
            
            for pt in points:
                score = pt.get("score", 0.0)
                badge_info = get_citation_quality_badge(score)
                text_content = pt.get("text", "")
                if text_content:
                    context_chunks.append(text_content)
                    citations.append({
                        "source": pt.get("source_file", "unknown_source.pdf"),
                        "page": pt.get("page_number", "N/A"),
                        "score": round(score, 4),
                        "quality_badge": badge_info["badge"],
                        "badge_label": badge_info["label"],
                        "badge_class": badge_info["class"]
                    })
                    context_nodes.append({
                        "source": pt.get("source_file", "unknown_source.pdf"),
                        "page": pt.get("page_number", "N/A"),
                        "score": round(score, 4),
                        "quality_badge": badge_info["badge"],
                        "badge_label": badge_info["label"],
                        "badge_class": badge_info["class"],
                        "text": text_content,
                        "selected": True
                    })

            for pt in discarded_points:
                score = pt.get("score", 0.0)
                badge_info = get_citation_quality_badge(score)
                text_content = pt.get("text", "")
                if text_content:
                    context_nodes.append({
                        "source": pt.get("source_file", "unknown_source.pdf"),
                        "page": pt.get("page_number", "N/A"),
                        "score": round(score, 4),
                        "quality_badge": badge_info["badge"],
                        "badge_label": badge_info["label"],
                        "badge_class": badge_info["class"],
                        "text": text_content,
                        "selected": False
                    })

            flat_context = "\n---\n".join(context_chunks) if context_chunks else "NO VERIFIED CONTEXT DETECTED."

            ref_docs_str = ""
            if points:
                for idx, pt in enumerate(points[:4]):
                    title = pt.get("source_file", "unknown_source.pdf")
                    source = pt.get("source_file", "unknown_source.pdf")
                    content = pt.get("text", "").strip()
                    ref_docs_str += (
                        f"Document {idx + 1}\n\n"
                        f"Title:\n{title}\n\n"
                        f"Source:\n{source}\n\n"
                        f"Content:\n{content}\n\n"
                        "--------------------------------\n\n"
                    )
            else:
                ref_docs_str = "No verified context detected.\n\n--------------------------------\n\n"

            from src.database.secure_storage import SecureStorageManager
            custom_prompt = SecureStorageManager.get_active_prompt(tenant_id)
            system_instruction = (
                f"<system_instructions>\n"
                f"You are an Enterprise HR Operations Assistant operating in workspace [{tenant_id.upper()}]. Your ONLY task is to answer the user query strictly using the provided reference context.\n\n"
                f"<critical_rules>\n"
                f"1. STRICT TOPIC MATCHING: Before drafting an answer, verify if the provided context directly addresses the SPECIFIC topic in the user query (e.g., if the user asks about \"car lease\", the context MUST contain car lease policies).\n"
                f"2. DO NOT ANSWER OFF-TOPIC CONTEXT: If the provided context belongs to a different HR topic (e.g., medical claims, leave rules) than what was explicitly asked (e.g., car lease), treat the context as COMPLETELY IRRELEVANT.\n"
                f"3. EXACT FALLBACK TRIGGER: If the context is irrelevant or does not contain direct policy details for the specific requested topic, respond ONLY with this exact sentence and nothing else:\n"
                f"   \"The requested information regarding this topic is not available in the provided documents. Please reach out to your HR Business Partner for assistance.\"\n"
                f"4. ZERO FLUFF: Provide direct, dense, and complete policy answers. Avoid conversational preamble, filler transitions, or redundant pleasantries.\n"
                f"</critical_rules>\n\n"
                f"<output_format>\n"
                f"- State the direct answer in the very first sentence using pure extracted facts.\n"
                f"- Present multi-step rules or structured guidelines using clean Markdown bullet points (-).\n"
                f"- Bold exact deadlines, approval roles, or document names.\n"
                f"</output_format>\n"
                f"</system_instructions>\n\n"
                f"{custom_prompt}"
            )

            user_payload = (
                "### REFERENCE DOCUMENTS\n\n"
                f"{ref_docs_str.strip()}\n\n"
                "### QUESTION\n\n"
                f"{user_query.strip()}\n\n"
                "### GROUNDING INSTRUCTIONS\n\n"
                "Answer the question using ONLY the reference documents above.\n"
                "Before producing the final response, internally verify that every statement is directly supported by the text.\n"
                "Remove any unsupported claims. If the information is missing from the documents or irrelevant to the question topic, reply exactly with:\n"
                "\"The requested information regarding this topic is not available in the provided documents. Please reach out to your HR Business Partner for assistance.\"\n\n"
                "### FINAL ANSWER\n"
            )

            messages = [{"role": "system", "content": system_instruction}]
            for turn in history_turns:
                messages.append(turn)
            messages.append({"role": "user", "content": user_payload})

            overrides = llm_overrides or {}
            deployment_mode = overrides.get("LLM_DEPLOYMENT_MODE", Config.LLM_DEPLOYMENT_MODE)
            api_base_url = overrides.get("LLM_API_BASE_URL", Config.LLM_API_BASE_URL)
            api_key = overrides.get("LLM_API_KEY", Config.LLM_API_KEY)
            default_model = overrides.get("DEFAULT_MODEL_ID", Config.DEFAULT_MODEL_ID)
            provider_type = overrides.get("PROVIDER_TYPE", "Cloud API" if deployment_mode == "CLOUD" else "vLLM")

            vllm_endpoint, request_headers = self._build_llm_endpoint_and_headers(api_base_url, api_key, provider_type)

            if provider_type in ["Ollama", "OpenAI-Compatible", "Cloud API"] or "azure" in provider_type.lower() or "openai.azure.com" in api_base_url:
                target_model = default_model
            else:
                live_models = []
                try:
                    url = f"{api_base_url.rstrip('/')}/models"
                    req = urllib.request.Request(url, method="GET")
                    if api_key and api_key.lower() != "none":
                        req.add_header("Authorization", f"Bearer {api_key}")
                        req.add_header("api-key", api_key)
                    with urllib.request.urlopen(req, timeout=1.5) as res:
                        data = json.loads(res.read().decode("utf-8"))
                        live_models = [m["id"] for m in data.get("data", [])]
                except Exception:
                    pass
                
                if target_adapter in live_models:
                    target_model = target_adapter
                else:
                    target_model = default_model

            vllm_payload = {
                "model": target_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": 512
            }
            
            if provider_type not in ["Cloud API"]:
                vllm_payload["repetition_penalty"] = 1.05

            # Preserve request_headers generated by _build_llm_endpoint_and_headers (including Azure api-key)

            ttft_ms = 0.0
            generation_ms = 0.0
            response_text = ""
            token_metrics = {}

            try:
                import httpx
                vllm_payload["stream"] = True
                llm_start = time.perf_counter_ns()
                first_chunk_received = False
                
                with httpx.stream("POST", vllm_endpoint, json=vllm_payload, headers=request_headers, timeout=15.0) as r:
                    r.raise_for_status()
                    for line in r.iter_lines():
                        if not first_chunk_received:
                            ttft_ms = round((time.perf_counter_ns() - llm_start) / 1_000_000.0, 2)
                            first_chunk_received = True
                        
                        if line.startswith("data:"):
                            data_str = line[5:].strip()
                            if data_str == "[DONE]":
                                break
                            try:
                                chunk_data = json.loads(data_str)
                                delta = chunk_data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    chunk_text = delta["content"]
                                    response_text += chunk_text
                                    yield {"type": "token", "content": chunk_text}
                            except Exception:
                                pass
                generation_ms = round((time.perf_counter_ns() - llm_start) / 1_000_000.0, 2)
                
                prompt_tokens = len(system_instruction.split()) + len(user_payload.split())
                completion_tokens = len(response_text.split())
                token_metrics = {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": prompt_tokens + completion_tokens
                }
            except Exception:
                import requests
                vllm_payload["stream"] = False
                llm_start = time.perf_counter_ns()
                res_sync = requests.post(vllm_endpoint, json=vllm_payload, headers=request_headers, timeout=15.0)
                res_sync.raise_for_status()
                res_data = res_sync.json()
                response_text = res_data["choices"][0]["message"]["content"]
                generation_ms = round((time.perf_counter_ns() - llm_start) / 1_000_000.0, 2)
                ttft_ms = round(generation_ms * 0.15, 2)
                token_metrics = res_data.get("usage", {})
                yield {"type": "token", "content": response_text}

            telemetry = {
                "pre_processing_ms": pre_processing_ms,
                "embedding_ms": retrieval_telemetry["embedding_ms"],
                "qdrant_ms": retrieval_telemetry["qdrant_ms"],
                "rerank_ms": retrieval_telemetry["rerank_ms"],
                "ttft_ms": ttft_ms,
                "generation_ms": generation_ms
            }

            total_e2e = round((time.perf_counter_ns() - pre_start) / 1_000_000.0, 2)
            comp_tokens = token_metrics.get("completion_tokens", 0)
            tps = round(comp_tokens / (generation_ms / 1000.0), 2) if generation_ms > 0 else 0.0

            sys_logger.record_request_telemetry(
                correlation_id="sys-stream",
                tenant_id=tenant_id,
                total_e2e_ms=total_e2e,
                pre_processing_ms=pre_processing_ms,
                embedding_ms=retrieval_telemetry["embedding_ms"],
                qdrant_ms=retrieval_telemetry["qdrant_ms"],
                rerank_ms=retrieval_telemetry["rerank_ms"],
                generation_ms=generation_ms,
                ttft_ms=ttft_ms,
                tokens_gen=comp_tokens,
                tokens_per_sec=tps
            )

            if session_id and response_text.strip():
                try:
                    from src.database.conversation_memory import RedisConversationMemoryManager
                    RedisConversationMemoryManager.get_instance().add_turn(session_id, user_query, response_text.strip())
                except Exception:
                    pass

            yield {
                "type": "final",
                "status": "success",
                "answer": response_text.strip(),
                "citations": citations,
                "latency_seconds": round(total_e2e / 1000.0, 3),
                "token_metrics": token_metrics,
                "telemetry": telemetry,
                "raw_context_block": flat_context,
                "context_nodes": context_nodes
            }
        except Exception as e:
            yield {"type": "error", "status": "error", "message": f"Modular Inference routing path failure: {str(e)}"}

    def generate_summary(self, document_name: str, full_text_content: str, summary_length: str, max_tokens: int = 3000, max_context_chars: int = 300000, llm_overrides: Dict[str, Any] = None) -> Dict[str, Any]:
        start_time = time.time()
        
        truncated_content = full_text_content[:max_context_chars]
        if len(full_text_content) > max_context_chars:
            print(f"⚠️ Truncating document context from {len(full_text_content)} to {max_context_chars} characters.")

        system_instruction = (
            "You are an expert corporate analyst.\n"
            "Your task is to analyze the provided document and generate a highly professional executive summary.\n"
            "Structure your output using clean Markdown formatting with the following sections:\n"
            "1. 📌 **Executive Overview** (A high-level 3-sentence summary of the document's purpose)\n"
            "2. 🔑 **Key Takeaways & Core Pillars** (Bullet points outlining the most critical rules, numbers, or terms)\n"
            "3. ⚠️ **Critical Warnings / Action Items** (Any deadlines, penalties, or constraints mentioned)\n\n"
            f"Enforce a target length constraint of: {summary_length} details."
        )

        overrides = llm_overrides or {}
        deployment_mode = overrides.get("LLM_DEPLOYMENT_MODE", Config.LLM_DEPLOYMENT_MODE)
        api_base_url = overrides.get("LLM_API_BASE_URL", Config.LLM_API_BASE_URL)
        api_key = overrides.get("LLM_API_KEY", Config.LLM_API_KEY)
        default_model = overrides.get("DEFAULT_MODEL_ID", Config.DEFAULT_MODEL_ID)

        provider_type = overrides.get("PROVIDER_TYPE", "Cloud API" if deployment_mode == "CLOUD" else "vLLM")
        base_url = api_base_url.rstrip('/')
        if provider_type in ["Ollama", "OpenAI-Compatible"] and not base_url.endswith("/v1") and "/v1/" not in base_url:
            base_url = f"{base_url}/v1"
        vllm_endpoint = f"{base_url}/chat/completions"
        target_model = default_model or "meta/llama-3.1-8b-instruct"

        vllm_payload = {
            "model": target_model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": f"Document Title: {document_name}\n\nFull Document Content:\n{truncated_content}"}
            ],
            "temperature": 0.2,
            "max_tokens": max_tokens
        }

        request_headers = {"Content-Type": "application/json"}
        if api_key and api_key.lower() != "none":
            request_headers["Authorization"] = f"Bearer {api_key}"

        try:
            req = urllib.request.Request(vllm_endpoint, data=json.dumps(vllm_payload).encode("utf-8"), headers=request_headers, method="POST")
            with urllib.request.urlopen(req, timeout=300) as response:
                vllm_res = json.loads(response.read().decode("utf-8"))
                summary_text = vllm_res["choices"][0]["message"]["content"]
                if len(full_text_content) > max_context_chars:
                    summary_text += f"\n\n---\n*⚠️ Note: The document was truncated to the first {max_context_chars:,} characters to comply with the model's context window size limit.*"
                return {
                    "status": "success",
                    "summary": summary_text,
                    "latency_seconds": round(time.time() - start_time, 3),
                    "token_metrics": vllm_res.get("usage", {})
                }
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            
            try:
                error_json = json.loads(error_body)
                err_msg = error_json.get("error", {}).get("message", "")
                
                if "maximum context length" in err_msg.lower() or "context length" in err_msg.lower() or "too long" in err_msg.lower():
                    import re
                    max_ctx_match = re.search(r"maximum context length is (\d+)", err_msg)
                    input_tok_match = re.search(r"(?:contains at least|resulted in|prompt contains) (\d+)", err_msg)
                    
                    if max_ctx_match and input_tok_match:
                        max_ctx = int(max_ctx_match.group(1))
                        input_tok = int(input_tok_match.group(1))
                        safe_max_tokens = max_ctx - input_tok - 150
                        
                        if safe_max_tokens >= 256:
                            print(f"🔄 Auto-Recovery: Prompt tokens ({input_tok}) + requested output ({max_tokens}) exceeds max context ({max_ctx}). Retrying with adjusted max_tokens={safe_max_tokens}...")
                            vllm_payload["max_tokens"] = safe_max_tokens
                            
                            try:
                                req_retry = urllib.request.Request(vllm_endpoint, data=json.dumps(vllm_payload).encode("utf-8"), headers=request_headers, method="POST")
                                with urllib.request.urlopen(req_retry, timeout=300) as response_retry:
                                    vllm_res_retry = json.loads(response_retry.read().decode("utf-8"))
                                    summary_text_retry = vllm_res_retry["choices"][0]["message"]["content"]
                                    if len(full_text_content) > max_context_chars:
                                        summary_text_retry += f"\n\n---\n*⚠️ Note: The document was truncated to the first {max_context_chars:,} characters to comply with the model's context window size limit.*"
                                    return {
                                        "status": "success",
                                        "summary": summary_text_retry,
                                        "latency_seconds": round(time.time() - start_time, 3),
                                        "token_metrics": vllm_res_retry.get("usage", {})
                                    }
                            except Exception as retry_err:
                                print(f"⚠️ Retry with adjusted max_tokens failed: {str(retry_err)}. Falling back to context shrinking.")
                    
                    shrunk_chars = int(max_context_chars * 0.6)
                    print(f"🔄 Auto-Recovery: Input context too large or retry failed. Retrying with reduced input limit {shrunk_chars} chars...")
                    return self.generate_summary(
                        document_name=document_name,
                        full_text_content=full_text_content,
                        summary_length=summary_length,
                        max_tokens=max_tokens,
                        max_context_chars=shrunk_chars,
                        llm_overrides=llm_overrides
                    )
            except Exception as recovery_error:
                print(f"⚠️ Auto-recovery attempt failed: {str(recovery_error)}")

            return {"status": "error", "message": f"Summarization Engine Rejection [{e.code}]: {error_body}"}
        except Exception as e:
            return {"status": "error", "message": f"Summarization pipeline failure: {str(e)}"}

    def generate_chat_response(self, target_adapter: str, chat_history: List[Dict[str, str]], temperature: float, llm_overrides: Dict[str, Any] = None) -> Dict[str, Any]:
        start_time = time.time()
        
        from src.database.secure_storage import SecureStorageManager
        system_instruction = SecureStorageManager.get_active_prompt("default")

        overrides = llm_overrides or {}
        deployment_mode = overrides.get("LLM_DEPLOYMENT_MODE", Config.LLM_DEPLOYMENT_MODE)
        api_base_url = overrides.get("LLM_API_BASE_URL", Config.LLM_API_BASE_URL)
        api_key = overrides.get("LLM_API_KEY", Config.LLM_API_KEY)
        default_model = overrides.get("DEFAULT_MODEL_ID", Config.DEFAULT_MODEL_ID)

        provider_type = overrides.get("PROVIDER_TYPE", "Cloud API" if deployment_mode == "CLOUD" else "vLLM")
        base_url = api_base_url.rstrip('/')
        if provider_type in ["Ollama", "OpenAI-Compatible"] and not base_url.endswith("/v1") and "/v1/" not in base_url:
            base_url = f"{base_url}/v1"
        vllm_endpoint = f"{base_url}/chat/completions"
        if provider_type in ["Ollama", "OpenAI-Compatible", "Cloud API"]:
            target_model = default_model
        else:
            live_models = []
            try:
                url = f"{base_url.rstrip('/')}/models"
                if "/v1" not in url and "/v1/" not in url:
                    url_v1 = f"{base_url.rstrip('/')}/v1/models"
                    try:
                        req = urllib.request.Request(url_v1, method="GET")
                        if api_key and api_key.lower() != "none":
                            req.add_header("Authorization", f"Bearer {api_key}")
                        with urllib.request.urlopen(req, timeout=1.5) as res:
                            data = json.loads(res.read().decode("utf-8"))
                            live_models = [m["id"] for m in data.get("data", [])]
                    except Exception:
                        pass
                if not live_models:
                    req = urllib.request.Request(url, method="GET")
                    if api_key and api_key.lower() != "none":
                        req.add_header("Authorization", f"Bearer {api_key}")
                    with urllib.request.urlopen(req, timeout=1.5) as res:
                        data = json.loads(res.read().decode("utf-8"))
                        live_models = [m["id"] for m in data.get("data", [])]
            except Exception:
                pass
            
            if target_adapter in live_models:
                target_model = target_adapter
            else:
                target_model = default_model

        vllm_payload = {
            "model": target_model,
            "messages": [{"role": "system", "content": system_instruction}] + chat_history,
            "temperature": temperature,
            "max_tokens": 1024
        }

        request_headers = {"Content-Type": "application/json"}
        if api_key and api_key.lower() != "none":
            request_headers["Authorization"] = f"Bearer {api_key}"

        try:
            req = urllib.request.Request(vllm_endpoint, data=json.dumps(vllm_payload).encode("utf-8"), headers=request_headers, method="POST")
            with urllib.request.urlopen(req, timeout=120) as response:
                vllm_res = json.loads(response.read().decode("utf-8"))
                return {
                    "status": "success",
                    "answer": vllm_res["choices"][0]["message"]["content"],
                    "latency_seconds": round(time.time() - start_time, 3),
                    "token_metrics": vllm_res.get("usage", {})
                }
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            try:
                parsed_error = json.loads(error_body)
                error_msg = parsed_error.get("error", {}).get("message", error_body)
            except Exception:
                error_msg = error_body
            return {"status": "error", "message": f"Backend Engine Rejection [{e.code}]: {error_msg}"}
        except Exception as e:
            return {"status": "error", "message": f"Modular Inference routing path failure: {str(e)}"}