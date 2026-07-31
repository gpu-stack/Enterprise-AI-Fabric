import re
import json
import random
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=UserWarning)
from typing import List, Dict, Any
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
from langchain_community.chat_models import ChatOllama
from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_core.messages import AIMessage
from langchain_core.embeddings import Embeddings
from src.processing.semantic_splitter import TEIEmbeddingClient
from src.database.query_engine import MultiTenantQueryEngine
from src.generation.orchestrator import ContextOrchestrator
from src.config import settings
from src.utils.logger import logger as sys_logger
import urllib.parse

class Prometheus2ChatOllama(ChatOllama):
    """Custom ChatOllama subclass that intercepts and converts Prometheus 2 outputs to expected Ragas schemas."""
    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        result = super()._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
        for generation in result.generations:
            text = generation.text.strip()
            
            if "```" in text:
                matches = re.findall(r"```(?:json)?\n(.*?)\n```", text, re.DOTALL)
                if matches:
                    text = matches[0].strip()
                else:
                    text = re.sub(r"^```(?:json)?\n", "", text)
                    text = re.sub(r"\n```$", "", text)
            
            is_valid_json = False
            try:
                json.loads(text)
                is_valid_json = True
            except Exception:
                pass
                
            if not is_valid_json:
                if "{" in text and "}" in text:
                    start_idx = text.find("{")
                    end_idx = text.rfind("}") + 1
                    json_part = text[start_idx:end_idx]
                    try:
                        json.loads(json_part)
                        text = json_part
                        is_valid_json = True
                    except Exception:
                        pass

            if not is_valid_json:
                prompt_content = ""
                for msg in messages:
                    prompt_content += str(msg.content).lower()

                score_match = re.search(r"(?:\[Score\]|Score:)\s*(\d)", text, re.IGNORECASE)
                score_val = 5
                if score_match:
                    score_val = int(score_match.group(1))

                verdict_binary = 1 if score_val >= 4 else 0
                verdict_str = "Yes" if score_val >= 4 else "No"

                if "verdict" in prompt_content:
                    text = json.dumps({"verdict": verdict_binary})
                elif "classification" in prompt_content:
                    text = json.dumps({"classification": verdict_str})
                elif "statements" in prompt_content:
                    sentences = [s.strip() for s in re.split(r'\.|\n', text) if len(s.strip()) > 10]
                    if not sentences:
                        sentences = [text]
                    text = json.dumps({"statements": sentences})
                else:
                    text = json.dumps({"verdict": verdict_binary, "score": score_val})

            generation.text = text
            generation.message = AIMessage(content=text)
        return result


class RagasTEIEmbeddings(Embeddings):
    """Langchain adapter for the custom TEIEmbeddingClient to be compatible with Ragas."""
    def __init__(self, tei_client: TEIEmbeddingClient):
        self.tei_client = tei_client

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.tei_client.embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        return self.tei_client.embed_query(text)


class RAGEvaluator:
    def __init__(self, llm_overrides: Dict[str, Any] = None):
        self.overrides = llm_overrides or {}
        self.deployment_mode = self.overrides.get("LLM_DEPLOYMENT_MODE", settings.LLM_DEPLOYMENT_MODE)
        api_base = self.overrides.get("LLM_API_BASE_URL", settings.LLM_API_BASE_URL)
        provider_type = self.overrides.get("PROVIDER_TYPE", "Cloud API" if self.deployment_mode == "CLOUD" else "vLLM")
        base_url = api_base.rstrip('/')
        if provider_type in ["Ollama", "OpenAI-Compatible"] and not base_url.endswith("/v1") and "/v1/" not in base_url:
            base_url = f"{base_url}/v1"
        self.api_base_url = base_url
        self.api_key = self.overrides.get("LLM_API_KEY", settings.LLM_API_KEY)
        self.default_model = self.overrides.get("DEFAULT_MODEL_ID", settings.DEFAULT_MODEL_ID)

        model_name = self.default_model
        if "generativelanguage.googleapis.com" in self.api_base_url and not model_name.startswith("models/"):
            model_name = f"models/{model_name}"

        eval_api_key = self.api_key if (self.api_key and self.api_key.lower() != "none") else "dummy_key"

        if "openai.azure.com" in self.api_base_url or "azure" in provider_type.lower():
            parsed_url = urllib.parse.urlparse(self.api_base_url)
            azure_endpoint = f"{parsed_url.scheme}://{parsed_url.netloc}"
            
            deployment_name = self.default_model or "gpt-4"
            if "/deployments/" in parsed_url.path:
                parts = parsed_url.path.split("/deployments/")
                if len(parts) > 1 and parts[1].split("/")[0]:
                    deployment_name = parts[1].split("/")[0]

            api_version = "2024-02-15-preview"
            if "api-version=" in self.api_base_url:
                qs = urllib.parse.parse_qs(parsed_url.query)
                if "api-version" in qs and qs["api-version"][0]:
                    api_version = qs["api-version"][0]

            self.eval_llm = AzureChatOpenAI(
                azure_endpoint=azure_endpoint,
                azure_deployment=deployment_name,
                api_version=api_version,
                api_key=eval_api_key,
                temperature=0.0,
                request_timeout=120.0,
                max_retries=3
            )
        else:
            self.eval_llm = ChatOpenAI(
                model=model_name,
                openai_api_key=eval_api_key,
                openai_api_base=self.api_base_url,
                temperature=0.0,
                request_timeout=120.0,
                max_retries=3,
                n=1
            )

        embedding_url = self.overrides.get("EMBEDDING_SERVER_URL") or getattr(settings, "EMBEDDING_SERVER_URL", settings.EMBEDDING_API_URL)
        tei_client = TEIEmbeddingClient(embedding_url)
        self.eval_embeddings = RagasTEIEmbeddings(tei_client)

        self.query_engine = MultiTenantQueryEngine()
        self.orchestrator = ContextOrchestrator()

    def run_rag_inference(self, tenant_id: str, test_cases: List[Dict[str, str]], top_k: int = 3) -> List[Dict[str, Any]]:
        """Runs the RAG pipeline over a set of input test cases to generate contexts and answers."""
        completed_dataset = []
        for case in test_cases:
            question = case.get("question", "").strip()
            ground_truth = case.get("ground_truth", "").strip()
            
            if not question:
                continue

            # 1. Retrieve isolated context chunks from Qdrant
            retrieved_nodes, _, _ = self.query_engine.retrieve_context(
                query_str=question,
                tenant_id=tenant_id,
                limit=top_k
            )
            contexts = [node.get("text", "") for node in retrieved_nodes if node.get("text", "")]
            
            if not contexts:
                contexts = ["NO VERIFIED CONTEXT DETECTED."]

            # Fetch active adapter weight matrix for routing
            from src.database.secure_storage import SecureStorageManager
            registry = SecureStorageManager.load_tenant_registry()
            active_adapter = registry.get(tenant_id, "tech_support")

            # 2. Generate answer from LLM under active settings overrides
            res = self.orchestrator.generate_answer(
                tenant_id=tenant_id,
                target_adapter=active_adapter,
                user_query=question,
                temperature=0.0,
                top_k=top_k,
                llm_overrides=self.overrides
            )
            
            # FIX: Check if orchestrator returned successfully. If it failed, log the error message directly into the evaluation block.
            if res.get("status") == "error":
                generated_answer = f"CRITICAL PIPELINE FAULT: {res.get('message', 'Unknown Error Encountered')}"
            else:
                generated_answer = res.get("answer", "The requested information is not available in the provided documents.")
            
            completed_dataset.append({
                "question": question,
                "contexts": contexts,
                "answer": generated_answer,
                "ground_truth": ground_truth
            })
            
        return completed_dataset

    def evaluate_dataset(self, rag_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Executes evaluation via Ragas metrics on pre-compiled generation data."""
        if not rag_data:
            return {"status": "error", "message": "No test cases provided for evaluation."}

        try:
            sys_logger.info(f"Executing Ragas benchmark on {len(rag_data)} test cases via Judge Model '{self.default_model}'", component="EVALUATOR")
            formatted_data = {
                "question": [item["question"] for item in rag_data],
                "contexts": [item["contexts"] for item in rag_data],
                "answer": [item["answer"] for item in rag_data],
                "ground_truth": [item["ground_truth"] for item in rag_data]
            }

            dataset = Dataset.from_dict(formatted_data)
            from ragas.run_config import RunConfig
            run_config = RunConfig(
                timeout=300,
                max_workers=1 # Forces flat worker load bounds to maintain local VRAM queues safely
            )
            metrics_list = [faithfulness, answer_relevancy, context_precision, context_recall]
            for m in metrics_list:
                if hasattr(m, 'strictness'):
                    m.strictness = 1
                if hasattr(m, 'n'):
                    m.n = 1
            
            evaluation_result = evaluate(
                dataset=dataset,
                metrics=metrics_list,
                llm=self.eval_llm,
                embeddings=self.eval_embeddings,
                run_config=run_config
            )
            
            df_results = evaluation_result.to_pandas()
            df_results_cleaned = df_results.fillna(0.0)

            scores = {
                "faithfulness": float(df_results["faithfulness"].mean()) if "faithfulness" in df_results.columns else 0.0,
                "answer_relevance": float(df_results["answer_relevancy"].mean()) if "answer_relevancy" in df_results.columns else 0.0,
                "context_precision": float(df_results["context_precision"].mean()) if "context_precision" in df_results.columns else 0.0,
                "context_recall": float(df_results["context_recall"].mean()) if "context_recall" in df_results.columns else 0.0
            }
            
            for key in scores:
                import math
                if math.isnan(scores[key]):
                    scores[key] = 0.0

            sys_logger.success(
                f"Ragas evaluation completed: Faithfulness={scores['faithfulness']:.2f}, Relevance={scores['answer_relevance']:.2f}, Precision={scores['context_precision']:.2f}, Recall={scores['context_recall']:.2f}",
                component="EVALUATOR",
                details={"scores": scores}
            )

            return {
                "status": "success",
                "scores": scores,
                "raw_dataframe": df_results_cleaned.to_dict(orient="records")
            }
            
        except Exception as e:
            sys_logger.error(f"Ragas evaluation engine fault: {str(e)}", component="EVALUATOR", exception=e)
            return {"status": "error", "message": f"Ragas evaluation engine fault: {str(e)}"}

    def generate_synthetic_test_set(self, tenant_id: str, count: int = 5) -> List[Dict[str, str]]:
        """Retrieves raw chunks from the tenant's isolated vector store and synthesizes QA test cases using the LLM."""
        chunks = []
        try:
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            points, _ = self.query_engine.qdrant.scroll(
                collection_name=settings.COLLECTION_NAME,
                scroll_filter=Filter(
                    must=[FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id))]
                ),
                limit=100,
                with_payload=True,
                with_vectors=False
            )
            valid_chunks = []
            for pt in points:
                payload = pt.payload or {}
                txt = payload.get("document_text", "") or payload.get("parent_text", "")
                if txt and len(txt) > 200:
                    valid_chunks.append(txt)
            if valid_chunks:
                chunks = random.sample(valid_chunks, min(len(valid_chunks), count))
            sys_logger.info(f"Qdrant scroll retrieved {len(chunks)} candidate blocks for synthetic test generation", component="EVALUATOR")
        except Exception as e:
            sys_logger.warning(f"Failed to scroll points from Qdrant: {str(e)}", component="EVALUATOR")
            
        if not chunks:
            return []

        import requests
        from src.generation.orchestrator import orchestrator
        from src.database.secure_storage import SecureStorageManager
        api_base = self.api_base_url
        api_key = self.api_key
        default_model = self.default_model
        deployment_mode = self.deployment_mode
        provider_type = self.overrides.get("PROVIDER_TYPE", "Cloud API" if deployment_mode == "CLOUD" else "vLLM")

        vllm_endpoint, headers = orchestrator._build_llm_endpoint_and_headers(api_base, api_key, provider_type)

        test_cases = []
        total_rows = len(chunks)
        print(f"[START] generate_synthetic_test_set loop - processing {total_rows} rows")
        
        for idx, chunk in enumerate(chunks):
            print(f"[START] Processing row {idx + 1} of {total_rows}")
            prompt = (
                "You are an expert test dataset generator.\n"
                "Given the context block below, generate a high-quality, professional question and a complete, factual ground truth answer based STRICTLY on this context.\n\n"
                "Format your response as a valid JSON object with EXACTLY these keys (do not output any other text or Markdown wrapping):\n"
                "{\n"
                '  "question": "your generated question here",\n'
                '  "ground_truth": "your generated ground truth answer here"\n'
                "}\n\n"
                f"--- CONTEXT BLOCK ---\n{chunk}\n---------------------"
            )
            
            try:
                print(f"  [START] Calling remote GPU (A40) to synthesize QA row {idx + 1}")
                
                registry = SecureStorageManager.load_tenant_registry()
                active_adapter = registry.get(tenant_id, "tech_support")
                
                if provider_type in ["Ollama", "OpenAI-Compatible", "Cloud API"]:
                    target_model = default_model
                else:
                    target_model = active_adapter

                vllm_payload = {
                    "model": target_model,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1024
                }
                
                res_sync = requests.post(vllm_endpoint, json=vllm_payload, headers=headers, timeout=15.0)
                res_sync.raise_for_status()
                res_data = res_sync.json()
                res_text = res_data["choices"][0]["message"]["content"].strip()
                
                print(f"  [END] Calling remote GPU (A40) to synthesize QA row {idx + 1}")
                
                if res_text.startswith("```"):
                    res_text = re.sub(r"^```(?:json)?\n", "", res_text)
                    res_text = re.sub(r"\n```$", "", res_text)
                    
                parsed = json.loads(res_text)
                if parsed.get("question") and parsed.get("ground_truth"):
                    test_cases.append({
                        "question": parsed["question"].strip(),
                        "ground_truth": parsed["ground_truth"].strip()
                    })
            except Exception as ex:
                print(f"  [ERROR] Failed to generate question from chunk: {str(ex)}")
            
            print(f"[END] Processing row {idx + 1} of {total_rows}")
            
        print(f"[END] generate_synthetic_test_set loop - completed with {len(test_cases)} cases")
        return test_cases