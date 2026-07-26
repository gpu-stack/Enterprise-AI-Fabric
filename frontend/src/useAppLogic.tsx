// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { useStore } from './store';
import type { QueryResponse, ChatMessage, EvalRun, IngestResult, EvalTestCase } from './types';
import { parseMarkdownToHtml } from './utils';

/**
 * Safe JSON parser for fetch responses.
 * Handles: empty bodies (204 No Content), HTML error pages, and network-level failures.
 * Returns a fallback object instead of throwing "Unexpected end of JSON input".
 */
const safeJson = async (res: Response): Promise<any> => {
  const text = await res.text();
  if (!text || text.trim() === '') return {};
  try {
    return JSON.parse(text);
  } catch {
    // Server returned non-JSON (e.g. HTML 502 gateway page)
    console.warn('API returned non-JSON response:', text.slice(0, 200));
    return { detail: `Server error (${res.status}): ${text.slice(0, 120)}` };
  }
};


export const useAppLogic = () => {
  const store = useStore();
  const { 
    theme, setTheme, currentTenant, setCurrentTenant, health, setHealth, 
    tenants, setTenants, activeProfileName, setActiveProfileName,
    ragChatHistory, setRagChatHistory, evalRuns, setEvalRuns,
    ingestionHistory, setIngestionHistory,
    lastIngestResults, setLastIngestResults,
    lastIngestMetrics, setLastIngestMetrics
  } = store;

const [activeTab, setActiveTab] = useState<string>('query');
  // const [tenants, setTenants]<Tenant[]>([]);
  // const [currentTenant, setCurrentTenant]<string>('');
  
  // Health & Config Telemetry
  // const [health, setHealth]<HealthStatus | null>(null);
  const [config, setConfig] = useState({
    LLM_DEPLOYMENT_MODE: 'CLOUD',
    LLM_API_BASE_URL: '',
    LLM_API_KEY: '',
    MASKED_API_KEY: '',
    DEFAULT_MODEL_ID: '',
    QDRANT_URL: '',
    EMBEDDING_SERVER_URL: '',
    RERANKER_SERVER_URL: '',
    VECTOR_TOP_K: 20,
    RERANK_TOP_K: 3,
    RERANKER_SCORE_THRESHOLD: 0.40
  });

  // Global Ingestion UI States
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileConfigs, setFileConfigs] = useState<Record<string, { family_key: string; version: string; replace_target: string }>>({});
  const [ingestSummary, setIngestSummary] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const getStepStatus = (stepIndex: number) => {
    if (ingestProgress >= 1.0) return 'completed';
    
    let currentStep = 1;
    if (ingestProgress <= 0.3) {
      currentStep = 1;
    } else if (ingestProgress > 0.3 && ingestProgress <= 0.6) {
      currentStep = 2;
    } else if (ingestProgress > 0.6 && ingestProgress <= 0.8) {
      currentStep = 3;
    } else {
      currentStep = 4;
    }

    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'active';
    return 'pending';
  };

  // Grounded Query Sandbox States
  const [queryText, setQueryText] = useState<string>('');
  const [queryTemp, setQueryTemp] = useState<number>(0.0);
  const [queryTopK, setQueryTopK] = useState<number>(3);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [showTracePanel, setShowTracePanel] = useState<boolean>(true);

  // Infrastructure & Engine Settings States
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  // const [activeProfileName, setActiveProfileName]<string>('');
  
  // Onboarding Form States
  const [onboardAlias, setOnboardAlias] = useState<string>('');
  const [onboardProviderType, setOnboardProviderType] = useState<string>('vLLM');
  const [onboardEndpointUrl, setOnboardEndpointUrl] = useState<string>('http://localhost:8000/v1');
  const [onboardModelId, setOnboardModelId] = useState<string>('');
  const [onboardApiKey, setOnboardApiKey] = useState<string>('none');
  const [downstreamQdrantUrl, setDownstreamQdrantUrl] = useState<string>('');
  const [downstreamEmbeddingUrl, setDownstreamEmbeddingUrl] = useState<string>('');
  const [downstreamRerankerUrl, setDownstreamRerankerUrl] = useState<string>('');
  const [downstreamVectorTopK, setDownstreamVectorTopK] = useState<number>(20);
  const [downstreamRerankTopK, setDownstreamRerankTopK] = useState<number>(5);
  const [downstreamScoreThreshold, setDownstreamScoreThreshold] = useState<number>(0.40);

  useEffect(() => {
    if (onboardProviderType === 'Ollama') {
      setOnboardEndpointUrl('http://localhost:11434');
    } else if (onboardProviderType === 'vLLM' || onboardProviderType === 'OpenAI-Compatible') {
      setOnboardEndpointUrl('http://localhost:8000/v1');
    } else if (onboardProviderType === 'Cloud API') {
      setOnboardEndpointUrl('https://api.openai.com/v1');
    }
  }, [onboardProviderType]);

  // SandyGPT Direct Chat States
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [chatInput, setChatInput] = useState<string>('');
  const chatTemp = 0.7;
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Summarization Console States
  const [sumFile, setSumFile] = useState<File | null>(null);
  const [sumLength, setSumLength] = useState<string>('Standard Medium');
  const [sumMaxTokens, setSumMaxTokens] = useState<number>(3000);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summaryResult, setSummaryResult] = useState<any>(null);

  // Evaluation & Assessment States
  const [evalSource, setEvalSource] = useState<'generate' | 'upload'>('generate');
  const [evalCount, setEvalCount] = useState<number>(3);

  const [testCases, setTestCases] = useState<EvalTestCase[]>([]);
  const [isTestCaseLoading, setIsTestCaseLoading] = useState<boolean>(false);
  const [isTestingConnectivity, setIsTestingConnectivity] = useState<boolean>(false);
  const [connectivityReport, setConnectivityReport] = useState<any>(null);
  const [revealEndpoint, setRevealEndpoint] = useState<boolean>(false);
  const [synthesisStatus, setSynthesisStatus] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [evalResults, setEvalResults] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalProgress, setEvalProgress] = useState<{ phase: string; current: number; total: number; message: string } | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState<boolean>(false);
  const [isFluctuationExpanded, setIsFluctuationExpanded] = useState<boolean>(false);
  const [isInterpretExpanded, setIsInterpretExpanded] = useState<boolean>(false);
  const [isDetailedMetricsExpanded, setIsDetailedMetricsExpanded] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Tenant Provisioning Administration
  const [newTenantId, setNewTenantId] = useState<string>('');
  const [newTenantAdapter, setNewTenantAdapter] = useState<string>('');
  const [adminStatusMsg, setAdminStatusMsg] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch initial telemetry on component mount
  useEffect(() => {
    fetchHealth();
    fetchTenants();
    fetchConfig();
    fetchProfiles();
    fetchAvailableModels();
    fetchEvalRuns();
    const now = new Date();
    setLastRefreshed(now.toLocaleTimeString());
  }, []);

  // Scroll chat window dynamically
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, ragChatHistory, currentTenant]);



  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await safeJson(res);
      setHealth(data);
    } catch (e) {
      console.error('Error fetching system health', e);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/tenants');
      const data = await safeJson(res);
      // Guard: API must return an array
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      if (list.length > 0 && !currentTenant) {
        setCurrentTenant(list[0].tenant_id);
      }
    } catch (e) {
      console.error('Error fetching tenant list', e);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await safeJson(res);
      // Guard: only apply if we got a real config object back
      if (data && typeof data === 'object' && data.LLM_DEPLOYMENT_MODE) {
        setConfig(data);
      }
    } catch (e) {
      console.error('Error fetching connection configuration', e);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const res = await fetch('/api/vllm/models');
      const data = await safeJson(res);
      if (data && Array.isArray(data.models)) {
        setAvailableModels(data.models);
      }
    } catch (e) {
      console.error('Error fetching available LLM models:', e);
    }
  };

  // Auto-default newTenantAdapter selection when availableModels are loaded
  useEffect(() => {
    if (availableModels.length > 0 && !newTenantAdapter) {
      setNewTenantAdapter(availableModels[0]);
    }
  }, [availableModels, newTenantAdapter]);

  const handleHardRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchHealth(),
        fetchTenants(),
        fetchConfig(),
        fetchAvailableModels()
      ]);
      const now = new Date();
      setLastRefreshed(now.toLocaleTimeString());
    } catch (e) {
      console.error('Error during hard refresh', e);
    } finally {
      setIsRefreshing(false);
    }
  };



  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/config/profiles');
      const data = await safeJson(res);
      if (data && data.profiles) {
        setProfiles(data.profiles);
        setActiveProfileName(data.active_profile);
        if (data.global_downstream) {
          setDownstreamQdrantUrl(data.global_downstream.QDRANT_URL || '');
          setDownstreamEmbeddingUrl(data.global_downstream.EMBEDDING_SERVER_URL || '');
          setDownstreamRerankerUrl(data.global_downstream.RERANKER_SERVER_URL || '');
          setDownstreamVectorTopK(data.global_downstream.VECTOR_TOP_K ?? 20);
          setDownstreamRerankTopK(data.global_downstream.RERANK_TOP_K ?? 5);
          setDownstreamScoreThreshold(data.global_downstream.RERANKER_SCORE_THRESHOLD ?? 0.40);
        }
      }
    } catch (e) {
      console.error('Error fetching profiles:', e);
    }
  };

  const fetchEvalRuns = async () => {
    try {
      const res = await fetch('/api/evaluations/runs');
      const data = await safeJson(res);
      if (Array.isArray(data)) {
        setEvalRuns(data);
      }
    } catch (e) {
      console.error('Error fetching evaluation runs:', e);
    }
  };

  const handleDeleteEvalRun = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this evaluation run?')) return;
    try {
      const res = await fetch(`/api/evaluations/runs/${encodeURIComponent(runId)}`, {
        method: 'DELETE'
      });
      const data = await safeJson(res);
      if (Array.isArray(data)) {
        setEvalRuns(data);
      }
    } catch (e) {
      console.error('Failed to delete evaluation run:', e);
    }
  };

  const handleActivateProfile = async (alias: string) => {
    try {
      const res = await fetch('/api/config/profiles/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias })
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || `Profile '${alias}' activated.`);
        fetchProfiles();
        fetchConfig();
        fetchAvailableModels();
      } else {
        alert(data.detail || 'Failed to activate profile.');
      }
    } catch (e: any) {
      alert(`Activate profile failed: ${e.message}`);
    }
  };

  const handleOnboardProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardAlias.trim()) {
      alert('Friendly Connection Name (Alias) is required.');
      return;
    }
    try {
      const res = await fetch('/api/config/profiles/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alias: onboardAlias.trim(),
          provider_type: onboardProviderType,
          endpoint_url: onboardEndpointUrl,
          api_key: onboardApiKey,
          model_id: onboardModelId
        })
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || 'Profile onboarded successfully.');
        setOnboardAlias('');
        setOnboardModelId('');
        setOnboardApiKey('none');
        fetchProfiles();
        fetchAvailableModels();
      } else {
        alert(data.detail || data.message || `Failed to onboard profile (HTTP ${res.status}).`);
      }
    } catch (e: any) {
      alert(`Onboard profile failed: ${e.message}`);
    }
  };

  const handleSaveDownstreamSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/config/runtime-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          QDRANT_URL: downstreamQdrantUrl,
          EMBEDDING_SERVER_URL: downstreamEmbeddingUrl,
          RERANKER_SERVER_URL: downstreamRerankerUrl,
          VECTOR_TOP_K: downstreamVectorTopK,
          RERANK_TOP_K: downstreamRerankTopK,
          RERANKER_SCORE_THRESHOLD: downstreamScoreThreshold
        })
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || 'Downstream settings saved & applied.');
        fetchProfiles();
        fetchHealth();
        fetchConfig();
      } else {
        alert(data.detail || 'Failed to save settings.');
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  const handleDeleteProfile = async (alias: string) => {
    if (!confirm(`Are you sure you want to delete profile '${alias}'?`)) return;
    try {
      const res = await fetch(`/api/config/profiles/${encodeURIComponent(alias)}`, {
        method: 'DELETE'
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || 'Profile deleted.');
        fetchProfiles();
        fetchConfig();
        fetchAvailableModels();
      } else {
        alert(data.detail || 'Failed to delete profile.');
      }
    } catch (e: any) {
      alert(`Delete profile failed: ${e.message}`);
    }
  };

  const handleRegisterTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminStatusMsg(null);
    if (!newTenantId.trim() || !newTenantAdapter.trim()) {
      setAdminStatusMsg({ message: 'All registration parameters are required.', type: 'error' });
      return;
    }
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: newTenantId.trim(),
          adapter_weight_matrix: newTenantAdapter.trim()
        })
      });
      const data = await safeJson(res);
      if (res.ok) {
        setAdminStatusMsg({ message: data.message || 'Tenant registered successfully.', type: 'success' });
        setNewTenantId('');
        setNewTenantAdapter('');
        fetchTenants();
        fetchHealth();
      } else {
        setAdminStatusMsg({ message: data.detail || 'Registration failed.', type: 'error' });
      }
    } catch (e: any) {
      setAdminStatusMsg({ message: e.message, type: 'error' });
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm(`Are you absolutely sure you want to deprovision tenant workspace [${tenantId.toUpperCase()}]? This will wipe all associated vector indices and lineage data.`)) {
      return;
    }
    setAdminStatusMsg(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, { method: 'DELETE' });
      const data = await safeJson(res);
      if (res.ok) {
        setAdminStatusMsg({ message: data.message || 'Tenant deprovisioned successfully.', type: 'success' });
        if (currentTenant === tenantId) {
          setCurrentTenant('');
        }
        fetchTenants();
        fetchHealth();
      } else {
        setAdminStatusMsg({ message: data.detail || 'Deprovisioning failed.', type: 'error' });
      }
    } catch (e: any) {
      setAdminStatusMsg({ message: e.message, type: 'error' });
    }
  };

  const handleResetCollection = async () => {
    if (!confirm("⚠️ DANGER: Are you absolutely sure you want to reset the vector database? This will completely wipe ALL indexed documents and knowledge data for ALL tenants!")) {
      return;
    }
    setAdminStatusMsg(null);
    try {
      const res = await fetch('/api/system/reset-collection', { method: 'DELETE' });
      const data = await safeJson(res);
      if (res.ok) {
        setAdminStatusMsg({ message: data.message || 'Collection reset successfully.', type: 'success' });
        fetchHealth();
      } else {
        setAdminStatusMsg({ message: data.detail || 'Reset failed.', type: 'error' });
      }
    } catch (e: any) {
      setAdminStatusMsg({ message: e.message, type: 'error' });
    }
  };

  // Multi-File Ingest Handler
  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setUploadedFiles(filesArr);
      setIngestSummary(null);

      // Seed default configs for each file
      const newConfigs: typeof fileConfigs = {};
      filesArr.forEach(file => {
        const suggestedFamily = file.name.split('.')[0].split('_v')[0].split('202')[0].replace(/_$/, '').toLowerCase();
        newConfigs[file.name] = {
          family_key: suggestedFamily,
          version: '1.0',
          replace_target: 'New Document'
        };
      });
      setFileConfigs(newConfigs);
    }
  };

  const handleIngestSubmit = async () => {
    if (uploadedFiles.length === 0) return;
    const startTime = Date.now();
    setIngestStartTime(startTime);
    setIsIngesting(true);
    setIngestProgress(0);
    setIngestStatusText('Initializing batch connection...');
    setIngestSummary(null);
    setLastIngestResults(null);

    const formData = new FormData();
    uploadedFiles.forEach(file => {
      formData.append('files', file);
    });

    const backendConfigs: Record<string, any> = {};
    Object.keys(fileConfigs).forEach(fname => {
      const fc = fileConfigs[fname];
      backendConfigs[fname] = {
        family_key: fc.family_key,
        version: fc.version,
        replace_target: fc.replace_target === 'New Document' ? null : fc.replace_target
      };
    });
    formData.append('configs', JSON.stringify(backendConfigs));

    try {
      setIngestStatusText('Submitting files to background queue...');
      setIngestProgress(0.1);

      const res = await fetch(`/api/tenants/${currentTenant}/ingest`, {
        method: 'POST',
        body: formData
      });
      const data = await safeJson(res);

      if (res.ok && data.results) {
        setActiveJobs(data.results);
      } else {
        setIngestSummary({ message: data.error || 'Ingestion failed.', type: 'error' });
        setIsIngesting(false);
      }
    } catch (err: any) {
      setIngestSummary({ message: err.message || 'Ingestion error.', type: 'error' });
      setIsIngesting(false);
    }
  };

  // Grounded RAG Query handler (Conversational style)
  const handleQuerySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryText.trim()) return;
    
    const userMsg = { role: 'user' as const, content: queryText.trim() };
    const history = ragChatHistory[currentTenant] || [];
    const updatedHistory = [...history, userMsg];
    
    setRagChatHistory(prev => ({
      ...prev,
      [currentTenant]: updatedHistory
    }));
    const textToSubmit = queryText.trim();
    setQueryText('');
    setIsQuerying(true);

    const assistantMsgPlaceholder: {
      role: 'assistant';
      content: string;
      citations?: any[];
      latency?: number;
      tokens?: any;
      telemetry?: any;
      raw_context_block?: string;
      context_nodes?: any[];
    } = { 
      role: 'assistant', 
      content: '',
      citations: [],
      latency: undefined,
      tokens: undefined,
      telemetry: undefined,
      raw_context_block: undefined,
      context_nodes: undefined
    };

    setRagChatHistory(prev => ({
      ...prev,
      [currentTenant]: [...updatedHistory, assistantMsgPlaceholder]
    }));

    try {
      const res = await fetch(`/api/tenants/${currentTenant}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_query: textToSubmit,
          temperature: queryTemp,
          top_k: queryTopK
        })
      });

      if (!res.ok) {
        throw new Error(`Inference engine failed with HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream reader available on response.");
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data:")) {
            const dataContent = cleanLine.substring(5).trim();
            if (!dataContent) continue;
            try {
              const chunk = JSON.parse(dataContent) as QueryResponse & { type: string; content?: string };
              if (chunk.type === "token") {
                assistantMsgPlaceholder.content += chunk.content;
                setRagChatHistory(prev => ({
                  ...prev,
                  [currentTenant]: [...updatedHistory, { ...assistantMsgPlaceholder }]
                }));
              } else if (chunk.type === "final") {
                assistantMsgPlaceholder.content = chunk.answer || assistantMsgPlaceholder.content;
                assistantMsgPlaceholder.citations = chunk.citations || [];
                assistantMsgPlaceholder.latency = chunk.latency_seconds;
                assistantMsgPlaceholder.tokens = chunk.token_metrics;
                assistantMsgPlaceholder.telemetry = chunk.telemetry;
                assistantMsgPlaceholder.raw_context_block = chunk.raw_context_block;
                assistantMsgPlaceholder.context_nodes = chunk.context_nodes;

                setRagChatHistory(prev => ({
                  ...prev,
                  [currentTenant]: [...updatedHistory, { ...assistantMsgPlaceholder }]
                }));
              } else if (chunk.type === "error") {
                throw new Error(chunk.message || "Endpoint returned execution fault.");
              }
            } catch (jsonErr) {
              // Ignore partial or unparsable JSON lines
            }
          }
        }
      }
    } catch (e: any) {
      const errMsg = {
        role: 'assistant' as const,
        content: `❌ Error: ${e.message || 'Inference engine failed to execute query.'}`
      };
      setRagChatHistory(prev => ({
        ...prev,
        [currentTenant]: [...updatedHistory, errMsg]
      }));
    } finally {
      setIsQuerying(false);
    }
  };

  // SandyGPT Direct Conversational Chat Handler
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const history = chatHistory[currentTenant] || [];
    const updatedHistory = [...history, userMsg];
    
    setChatHistory(prev => ({
      ...prev,
      [currentTenant]: updatedHistory
    }));
    setChatInput('');
    setIsChatting(true);

    try {
      const res = await fetch(`/api/tenants/${currentTenant}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_history: updatedHistory,
          temperature: chatTemp
        })
      });
      const data = await safeJson(res);
      if (res.ok && data.status === 'success') {
        const assistantMsg: ChatMessage = { role: 'assistant', content: data.answer };
        setChatHistory(prev => ({
          ...prev,
          [currentTenant]: [...updatedHistory, assistantMsg]
        }));
      } else {
        const errorMsg: ChatMessage = { role: 'assistant', content: `❌ Error: ${data.message || 'Failed to fetch model response.'}` };
        setChatHistory(prev => ({
          ...prev,
          [currentTenant]: [...updatedHistory, errorMsg]
        }));
      }
    } catch (e: any) {
      const errBubble: ChatMessage = { role: 'assistant', content: `❌ Network connection error: ${e.message}` };
      setChatHistory(prev => ({
        ...prev,
        [currentTenant]: [...updatedHistory, errBubble]
      }));
    } finally {
      setIsChatting(false);
    }
  };

  // Document Summarization handler
  const handleSummarizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sumFile) return;
    setIsSummarizing(true);
    setSummaryResult(null);

    const formData = new FormData();
    formData.append('file', sumFile);
    formData.append('summary_length', sumLength);
    formData.append('max_tokens', String(sumMaxTokens));
    formData.append('max_context_chars', '300000');

    try {
      const res = await fetch(`/api/tenants/${currentTenant}/summarize`, {
        method: 'POST',
        body: formData
      });
      const data = await safeJson(res);
      setSummaryResult(data);
    } catch (e: any) {
      setSummaryResult({ status: 'error', message: `Pipeline execution failed: ${e.message}` });
    } finally {
      setIsSummarizing(false);
    }
  };

  // Test connection connectivity before start eval
  const handleTestConnectivity = async () => {
    setIsTestingConnectivity(true);
    setConnectivityReport(null);
    try {
      const res = await fetch('/api/evaluations/test-connectivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const report = await safeJson(res);
        setConnectivityReport(report);
      } else {
        alert('Failed to connect to backend diagnostics service.');
      }
    } catch (e: any) {
      alert(`Diagnostics query failed: ${e.message}`);
    } finally {
      setIsTestingConnectivity(false);
    }
  };

  // Evaluation synthetic data set gen
  const handleGenerateTestSet = async () => {
    setIsTestCaseLoading(true);
    setEvalResults(null);
    setSynthesisStatus('Initializing test set generation...');
    console.log('[START] handleGenerateTestSet: initiating generation flow');

    try {
      const res = await fetch(`/api/tenants/${currentTenant}/evaluations/generate-test-set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: evalCount })
      });

      if (!res.ok) {
        throw new Error('Failed to start test set generation.');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;
          const jsonStr = cleanLine.replace(/^data:\s*/, '');
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'status') {
              console.log(`[STATUS] ${parsed.message}`);
              setSynthesisStatus(parsed.message);
            } else if (parsed.type === 'result') {
              console.log('[END] handleGenerateTestSet: results received', parsed);
              if (parsed.status === 'success') {
                setTestCases(parsed.test_set);
                alert(`Successfully generated ${parsed.test_set.length} test cases!`);
              } else {
                alert(parsed.message || 'Generation failed.');
              }
            }
          } catch (err) {
            console.error('Failed to parse SSE line:', err);
          }
        }
      }
    } catch (e: any) {
      console.error('[ERROR] Error generating test set:', e);
      alert(`Error generating test set: ${e.message}`);
    } finally {
      setIsTestCaseLoading(false);
      setSynthesisStatus('');
      console.log('[END] handleGenerateTestSet: synthesis execution closed');
    }
  };

  const getScoreStatusBadge = (score: number) => {
    if (score >= 0.85) {
      return <span className="eval-status-badge passed">PASSED</span>;
    } else if (score >= 0.70) {
      return <span className="eval-status-badge marginal">MARGINAL</span>;
    } else {
      return <span className="eval-status-badge failed">FAILED</span>;
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 0.85) return 'score-green';
    if (score >= 0.70) return 'score-amber';
    return 'score-red';
  };

  const maskIp = (url: string) => {
    if (!url) return '';
    return url.replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, '***.***.***.***');
  };

  const determineProductionStatus = (scores: any): "PASSED" | "FAILED" | "MARGINAL" => {
    const faithfulness = scores.faithfulness ?? 0.0;
    const relevancy = scores.answer_relevance ?? scores.answer_relevancy ?? 0.0;
    const precision = scores.context_precision ?? 0.0;
    const recall = scores.context_recall ?? 0.0;

    // 1. CRITICAL CRASH GATE
    if (faithfulness < 0.80 || relevancy < 0.80) {
      return "FAILED";
    }

    // 2. OPTIMAL PRODUCTION PASS GATE
    if (faithfulness >= 0.80 && relevancy >= 0.80 && recall >= 0.80) {
      if (precision >= 0.70) {
        return "PASSED";
      }
      return "PASSED";
    }

    // 3. FALLBACK TUNING GATE
    return "MARGINAL";
  };

  // Execute actual evaluation metrics
  const handleRunEvaluation = async () => {
    if (testCases.length === 0) return;
    setIsEvaluating(true);
    setEvalResults(null);
    setEvalProgress({ phase: 'inference', current: 0, total: testCases.length, message: 'Initiating evaluation run...' });

    try {
      const res = await fetch(`/api/tenants/${currentTenant}/evaluations/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_set: testCases
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to start evaluation run.');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;
          const jsonStr = cleanLine.replace(/^data:\s*/, '');
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'status') {
              setEvalProgress({
                phase: parsed.phase,
                current: parsed.current,
                total: parsed.total,
                message: parsed.message
              });
            } else if (parsed.type === 'result') {
              const data = parsed.data;
              if (data.status === 'success') {
                setEvalResults(data);
                
                // Append new run to history registry
                const newRunId = `RUN-${Math.floor(Math.random() * 200 + 400)}`;
                const now = new Date();
                const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                
                const fScore = data.scores?.faithfulness ?? 0.0;
                const arScore = data.scores?.answer_relevance ?? 0.0;
                const cpScore = data.scores?.context_precision ?? 0.0;
                
                const newRun: EvalRun = {
                  id: newRunId,
                  timestamp: timeStr,
                  tenant_id: currentTenant,
                  source: evalSource === 'generate' ? 'Synthetic Set' : 'Uploaded CSV',
                  test_case_count: testCases.length,
                  scores: {
                    faithfulness: fScore,
                    answer_relevance: arScore,
                    context_precision: cpScore,
                    context_recall: data.scores?.context_recall ?? 0.0
                  },
                  status: determineProductionStatus({
                    faithfulness: fScore,
                    answer_relevance: arScore,
                    context_precision: cpScore,
                    context_recall: data.scores?.context_recall ?? 0.0
                  }),
                  logs: data.raw_dataframe,
                  params: {
                    vector_top_k: data.vector_top_k ?? config.VECTOR_TOP_K,
                    rerank_top_k: data.rerank_top_k ?? config.RERANK_TOP_K,
                    reranker_score_threshold: data.reranker_score_threshold ?? config.RERANKER_SCORE_THRESHOLD
                  }
                };
                fetch('/api/evaluations/runs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newRun)
                })
                  .then(r => r.json())
                  .then(runs => {
                    if (Array.isArray(runs)) {
                      setEvalRuns(runs);
                    }
                  })
                  .catch(err => console.error('Failed to save evaluation run:', err));
              } else {
                alert(data.message || 'Evaluation run failed.');
              }
            }
          } catch (err) {
            console.error('Failed to parse SSE line:', err);
          }
        }
      }
    } catch (e: any) {
      alert(`Error during evaluation: ${e.message}`);
    } finally {
      setIsEvaluating(false);
      setEvalProgress(null);
    }
  };

  const downloadEvaluationCSV = () => {
    if (!evalResults || !evalResults.raw_dataframe) return;
    const df = evalResults.raw_dataframe;
    const headers = ["user_input", "retrieved_contexts", "response", "reference", "faithfulness", "answer_relevance", "context_precision", "context_recall"];
    const csvRows = [headers.join(",")];
    df.forEach((row: any) => {
      const q = `"${(row.user_input || row.question || "").toString().replace(/"/g, '""')}"`;
      const c = `"${(Array.isArray(row.retrieved_contexts) ? row.retrieved_contexts.join(" | ") : row.retrieved_contexts || row.contexts || "").toString().replace(/"/g, '""')}"`;
      const ans = `"${(row.response || row.answer || "").toString().replace(/"/g, '""')}"`;
      const ref = `"${(row.reference || row.ground_truth || "").toString().replace(/"/g, '""')}"`;
      const f = row.faithfulness ?? 0.0;
      const r = row.answer_relevancy ?? row.answer_relevance ?? 0.0;
      const p = row.context_precision ?? 0.0;
      const rec = row.context_recall ?? 0.0;
      csvRows.push([q, c, ans, ref, f, r, p, rec].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rag_evaluation_${currentTenant || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const downloadLogsCSV = (run: EvalRun) => {
    const df = run.logs || [
      { user_input: "Sample query 1", retrieved_contexts: "Sample context details", response: "Sample answer generated", reference: "Ground truth statement", faithfulness: run.scores.faithfulness, answer_relevance: run.scores.answer_relevance, context_precision: run.scores.context_precision, context_recall: run.scores.context_recall }
    ];
    const headers = ["user_input", "retrieved_contexts", "response", "reference", "faithfulness", "answer_relevance", "context_precision", "context_recall"];
    const csvRows = [headers.join(",")];
    df.forEach((row: any) => {
      const q = `"${(row.user_input || row.question || "").toString().replace(/"/g, '""')}"`;
      const c = `"${(Array.isArray(row.retrieved_contexts) ? row.retrieved_contexts.join(" | ") : row.retrieved_contexts || row.contexts || "").toString().replace(/"/g, '""')}"`;
      const ans = `"${(row.response || row.answer || "").toString().replace(/"/g, '""')}"`;
      const ref = `"${(row.reference || row.ground_truth || "").toString().replace(/"/g, '""')}"`;
      const f = row.faithfulness ?? 0.0;
      const r = row.answer_relevancy ?? row.answer_relevance ?? 0.0;
      const p = row.context_precision ?? 0.0;
      const rec = row.context_recall ?? 0.0;
      csvRows.push([q, c, ans, ref, f, r, p, rec].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `eval_logs_${run.id}_${run.tenant_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActiveAdapterLabel = () => {
    const active = tenants.find(t => t.tenant_id === currentTenant);
    if (!active) return 'Bypassed';
    return active.adapter_weight_matrix || 'Bypassed';
  };

  // Retrieve the latest assistant query metrics
  const getLatestAssistantMessage = () => {
    const history = ragChatHistory[currentTenant] || [];
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant') {
        return history[i];
      }
    }
    return null;
  };

  // Render Green/Red Status Texts
  const isQdrantOnline = health?.nodes?.qdrant?.status === 'ONLINE';
  const isTeiOnline = health?.nodes?.tei_embedder?.status === 'ONLINE';
  const isRerankerOnline = health?.nodes?.reranker?.status === 'ONLINE';
  const isLlmOnline = health?.nodes?.llm_api?.status === 'ONLINE';

  const getEmbeddingLabel = () => {
    if (!isTeiOnline) return 'OFFLINE';
    if (config.EMBEDDING_SERVER_URL) {
      try {
        const url = new URL(config.EMBEDDING_SERVER_URL);
        return url.port ? `:${url.port}` : 'ONLINE';
      } catch (e) {
        return 'ONLINE';
      }
    }
    return ':8090';
  };

  const getRerankerLabel = () => {
    if (!isRerankerOnline) return 'OFFLINE';
    if (config.RERANKER_SERVER_URL) {
      try {
        const url = new URL(config.RERANKER_SERVER_URL);
        return url.port ? `:${url.port}` : 'ONLINE';
      } catch (e) {
        return 'ONLINE';
      }
    }
    return ':8081';
  };

  

  return {
    theme,
    setTheme,
    currentTenant,
    setCurrentTenant,
    health,
    setHealth,
    tenants,
    setTenants,
    activeProfileName,
    setActiveProfileName,
    activeTab, setActiveTab,
    config, setConfig,
    uploadedFiles, setUploadedFiles,
    fileConfigs, setFileConfigs,
    isIngesting, setIsIngesting,
    ingestProgress, setIngestProgress,
    ingestStatusText, setIngestStatusText,
    ingestSummary, setIngestSummary,
    lastIngestResults, setLastIngestResults,
    lastIngestMetrics, setLastIngestMetrics,
    ingestionHistory, setIngestionHistory,
    queryText, setQueryText,
    queryTemp, setQueryTemp,
    queryTopK, setQueryTopK,
    isQuerying, setIsQuerying,
    ragChatHistory, setRagChatHistory,
    showTracePanel, setShowTracePanel,
    evalRuns, setEvalRuns,
    profiles, setProfiles,
    onboardAlias, setOnboardAlias,
    onboardProviderType, setOnboardProviderType,
    onboardEndpointUrl, setOnboardEndpointUrl,
    onboardModelId, setOnboardModelId,
    onboardApiKey, setOnboardApiKey,
    downstreamQdrantUrl, setDownstreamQdrantUrl,
    downstreamEmbeddingUrl, setDownstreamEmbeddingUrl,
    downstreamRerankerUrl, setDownstreamRerankerUrl,
    downstreamVectorTopK, setDownstreamVectorTopK,
    downstreamRerankTopK, setDownstreamRerankTopK,
    downstreamScoreThreshold, setDownstreamScoreThreshold,
    chatHistory, setChatHistory,
    chatInput, setChatInput,
    isChatting, setIsChatting,
    sumFile, setSumFile,
    sumLength, setSumLength,
    sumMaxTokens, setSumMaxTokens,
    isSummarizing, setIsSummarizing,
    summaryResult, setSummaryResult,
    evalSource, setEvalSource,
    evalCount, setEvalCount,
    testCases, setTestCases,
    isTestCaseLoading, setIsTestCaseLoading,
    isTestingConnectivity, setIsTestingConnectivity,
    connectivityReport, setConnectivityReport,
    revealEndpoint, setRevealEndpoint,
    synthesisStatus, setSynthesisStatus,
    availableModels, setAvailableModels,
    evalResults, setEvalResults,
    isEvaluating, setIsEvaluating,
    evalProgress, setEvalProgress,
    isPreviewExpanded, setIsPreviewExpanded,
    isFluctuationExpanded, setIsFluctuationExpanded,
    isInterpretExpanded, setIsInterpretExpanded,
    isDetailedMetricsExpanded, setIsDetailedMetricsExpanded,
    lastRefreshed, setLastRefreshed,
    isRefreshing, setIsRefreshing,
    newTenantId, setNewTenantId,
    newTenantAdapter, setNewTenantAdapter,
    adminStatusMsg, setAdminStatusMsg,
    getStepStatus,
    fetchHealth,
    fetchTenants,
    fetchConfig,
    fetchAvailableModels,
    handleHardRefresh,
    fetchProfiles,
    fetchEvalRuns,
    handleDeleteEvalRun,
    handleActivateProfile,
    handleOnboardProfile,
    handleSaveDownstreamSettings,
    handleDeleteProfile,
    handleRegisterTenant,
    handleDeleteTenant,
    handleResetCollection,
    handleFileDrop,
    handleIngestSubmit,
    handleQuerySubmit,
    handleSendChat,
    handleSummarizeSubmit,
    handleTestConnectivity,
    handleGenerateTestSet,
    getScoreStatusBadge,
    getScoreColorClass,
    maskIp,
    determineProductionStatus,
    handleRunEvaluation,
    downloadEvaluationCSV,
    downloadLogsCSV,
    getActiveAdapterLabel,
    getLatestAssistantMessage,
    getEmbeddingLabel,
    getRerankerLabel,
    // Refs
    chatBottomRef,
    // Health telemetry booleans
    isQdrantOnline,
    isTeiOnline,
    isRerankerOnline,
    isLlmOnline,
  };
};
