export interface Tenant {
  tenant_id: string;
  adapter_weight_matrix: string;
}

export interface NodeStatus {
  status: string;
  collection_status?: string;
  points_count?: number;
  model?: string;
  enabled?: boolean;
}

export interface HealthStatus {
  status: string;
  nodes: {
    qdrant: NodeStatus;
    tei_embedder: NodeStatus;
    reranker: NodeStatus;
    llm_api: NodeStatus;
  };
}

export interface IngestResult {
  filename: string;
  status: string;
  ingest_status?: string;
  deprecation_count?: number;
  message?: string;
  family_key?: string;
}

export interface Citation {
  source: string;
  page: string | number;
  score: number;
  quality_badge?: string;
  badge_label?: string;
  badge_class?: string;
}

export interface QueryResponse {
  status: string;
  answer?: string;
  citations?: Citation[];
  latency_seconds?: number;
  token_metrics?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  message?: string;
  telemetry?: any;
  raw_context_block?: string;
  context_nodes?: Array<{
    source: string;
    page: string | number;
    score: number;
    quality_badge?: string;
    badge_label?: string;
    badge_class?: string;
    text: string;
    selected: boolean;
  }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface EvalTestCase {
  question: string;
  ground_truth?: string;
}

export interface EvalRun {
  id: string;
  timestamp: string;
  tenant_id: string;
  source: string;
  test_case_count: number;
  scores: {
    faithfulness: number;
    answer_relevance: number;
    context_precision: number;
    context_recall: number;
  };
  status: 'PASSED' | 'FAILED' | 'MARGINAL';
  logs?: any[];
  params?: {
    vector_top_k: number;
    rerank_top_k: number;
    reranker_score_threshold: number;
  };
}
