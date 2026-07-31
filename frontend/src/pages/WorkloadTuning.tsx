// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, Zap, Cpu, Database, Layers, CheckCircle2, 
  HelpCircle, RefreshCw, Save, Activity, ShieldCheck, HardDrive, 
  Clock, Info, AlertTriangle, Sparkles, Server, Sliders, Settings2
} from 'lucide-react';

export const WorkloadTuning = () => {
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [activePreset, setActivePreset] = useState<string>('custom');

  // Stack Parameters State
  const [params, setParams] = useState({
    // 🧠 LLM & Inference Engine
    LLM_DEPLOYMENT_MODE: 'CLOUD',
    DEFAULT_MODEL_ID: 'gemini-3.5-flash',
    LLM_API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    LLM_API_KEY: 'none',
    DEFAULT_MAX_TOKENS: 2048,
    DEFAULT_TEMPERATURE: 0.0,
    DEFAULT_REPETITION_PENALTY: 1.05,

    // ⚡ Qdrant & Vector DB Engine
    QDRANT_URL: 'http://localhost:6333',
    COLLECTION_NAME: 'tenant_knowledge_base',
    VECTOR_DIMENSION: 1024,
    VECTOR_TOP_K: 20,
    SPARSE_MODEL_ID: 'Qdrant/bm25',

    // 🎯 Cross-Encoder Reranker & Filtering Engine
    RERANK_ENABLED: true,
    RERANKER_SERVER_URL: 'http://localhost:8081',
    RERANK_TOP_K: 5,
    RERANKER_SCORE_THRESHOLD: 0.40,
    RERANK_TIMEOUT: 60,

    // 📄 Semantic Chunking & Data Parsing
    CHUNK_MAX_SIZE: 1200,
    CHUNK_OVERLAP: 200,
    NOISE_THRESHOLD_GATE: 60,
    CLIENT_BATCH_LIMIT: 32,

    // 🚀 Execution & Timeouts
    EMBEDDING_SERVER_URL: 'http://localhost:8090',
    TEI_TIMEOUT: 60
  });

  // Fetch active settings on launch/mount
  const loadActiveSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setParams(prev => ({
          ...prev,
          LLM_DEPLOYMENT_MODE: data.LLM_DEPLOYMENT_MODE || prev.LLM_DEPLOYMENT_MODE,
          DEFAULT_MODEL_ID: data.DEFAULT_MODEL_ID || prev.DEFAULT_MODEL_ID,
          LLM_API_BASE_URL: data.LLM_API_BASE_URL || prev.LLM_API_BASE_URL,
          LLM_API_KEY: data.LLM_API_KEY || prev.LLM_API_KEY,
          DEFAULT_MAX_TOKENS: data.DEFAULT_MAX_TOKENS ?? prev.DEFAULT_MAX_TOKENS,
          DEFAULT_TEMPERATURE: data.DEFAULT_TEMPERATURE ?? prev.DEFAULT_TEMPERATURE,
          DEFAULT_REPETITION_PENALTY: data.DEFAULT_REPETITION_PENALTY ?? prev.DEFAULT_REPETITION_PENALTY,
          QDRANT_URL: data.QDRANT_URL || prev.QDRANT_URL,
          EMBEDDING_SERVER_URL: data.EMBEDDING_SERVER_URL || prev.EMBEDDING_SERVER_URL,
          RERANKER_SERVER_URL: data.RERANKER_SERVER_URL || prev.RERANKER_SERVER_URL,
          VECTOR_TOP_K: data.VECTOR_TOP_K ?? prev.VECTOR_TOP_K,
          RERANK_TOP_K: data.RERANK_TOP_K ?? prev.RERANK_TOP_K,
          RERANKER_SCORE_THRESHOLD: data.RERANKER_SCORE_THRESHOLD ?? prev.RERANKER_SCORE_THRESHOLD,
          RERANK_ENABLED: data.RERANK_ENABLED ?? prev.RERANK_ENABLED,
          CHUNK_MAX_SIZE: data.CHUNK_MAX_SIZE ?? prev.CHUNK_MAX_SIZE,
          CHUNK_OVERLAP: data.CHUNK_OVERLAP ?? prev.CHUNK_OVERLAP,
          NOISE_THRESHOLD_GATE: data.NOISE_THRESHOLD_GATE ?? prev.NOISE_THRESHOLD_GATE,
          CLIENT_BATCH_LIMIT: data.CLIENT_BATCH_LIMIT ?? prev.CLIENT_BATCH_LIMIT,
          TEI_TIMEOUT: data.TEI_TIMEOUT ?? prev.TEI_TIMEOUT,
          RERANK_TIMEOUT: data.RERANK_TIMEOUT ?? prev.RERANK_TIMEOUT,
          VECTOR_DIMENSION: data.VECTOR_DIMENSION ?? prev.VECTOR_DIMENSION
        }));
      }
    } catch (err) {
      console.error("Failed to load active settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveSettings();
  }, []);

  const handleChange = (key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
    setActivePreset('custom');
  };

  // Presets Auto-Configuration
  const applyPreset = (presetName: string) => {
    setActivePreset(presetName);
    if (presetName === 'high_gpu') {
      setParams(prev => ({
        ...prev,
        VECTOR_TOP_K: 50,
        RERANK_TOP_K: 10,
        RERANKER_SCORE_THRESHOLD: 0.35,
        CHUNK_MAX_SIZE: 1500,
        CHUNK_OVERLAP: 250,
        CLIENT_BATCH_LIMIT: 64,
        NOISE_THRESHOLD_GATE: 60,
        DEFAULT_MAX_TOKENS: 1024,
        DEFAULT_TEMPERATURE: 0.0,
        DEFAULT_REPETITION_PENALTY: 1.05,
        TEI_TIMEOUT: 120,
        RERANK_TIMEOUT: 120,
        RERANK_ENABLED: true
      }));
    } else if (presetName === 'standard_cloud') {
      setParams(prev => ({
        ...prev,
        VECTOR_TOP_K: 20,
        RERANK_TOP_K: 5,
        RERANKER_SCORE_THRESHOLD: 0.40,
        CHUNK_MAX_SIZE: 1200,
        CHUNK_OVERLAP: 200,
        CLIENT_BATCH_LIMIT: 32,
        NOISE_THRESHOLD_GATE: 60,
        DEFAULT_MAX_TOKENS: 512,
        DEFAULT_TEMPERATURE: 0.0,
        DEFAULT_REPETITION_PENALTY: 1.05,
        TEI_TIMEOUT: 60,
        RERANK_TIMEOUT: 60,
        RERANK_ENABLED: true
      }));
    } else if (presetName === 'lightweight_cpu') {
      setParams(prev => ({
        ...prev,
        VECTOR_TOP_K: 10,
        RERANK_TOP_K: 3,
        RERANKER_SCORE_THRESHOLD: 0.45,
        CHUNK_MAX_SIZE: 800,
        CHUNK_OVERLAP: 150,
        CLIENT_BATCH_LIMIT: 16,
        NOISE_THRESHOLD_GATE: 50,
        DEFAULT_MAX_TOKENS: 256,
        DEFAULT_TEMPERATURE: 0.0,
        DEFAULT_REPETITION_PENALTY: 1.05,
        TEI_TIMEOUT: 30,
        RERANK_TIMEOUT: 30,
        RERANK_ENABLED: true
      }));
    } else if (presetName === 'custom') {
      // Retain current custom tuning
    }
  };

  // Save & Apply Settings
  const handleSaveAndActivate = async () => {
    setLoading(true);
    setSaveStatus({ type: null, message: '' });
    try {
      const res = await fetch('/api/config/runtime-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSaveStatus({
          type: 'success',
          message: '⚡ Workload profile saved & activated in system memory!'
        });
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 5000);
      } else {
        setSaveStatus({
          type: 'error',
          message: data.message || 'Failed to activate runtime settings.'
        });
      }
    } catch (err) {
      setSaveStatus({
        type: 'error',
        message: `Network error: ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
      
      {/* High-Contrast Cloud Header Banner */}
      <div style={{ 
        marginBottom: '1.5rem', 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e1b4b 100%)',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '1.75rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        color: '#ffffff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <SlidersHorizontal size={26} color="#38bdf8" />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Runtime Workload & Stack Tuning Engine
              </h2>
              <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', backgroundColor: '#059669', color: '#ffffff' }}>
                <Activity size={12} style={{ marginRight: '4px' }} /> LIVE RECONFIGURABLE
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, maxWidth: '850px', lineHeight: '1.5' }}>
              Dynamically calibrate LLM context windows, generation tokens, vector retrieval depth, semantic chunking boundaries, and batch sizes to unleash full GPU/Infra performance before launching heavy workloads.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn"
              onClick={loadActiveSettings} 
              disabled={loading}
              style={{ fontSize: '0.85rem', color: '#f8fafc', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid #475569' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Reload Defaults
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveAndActivate} 
              disabled={loading}
              style={{ 
                fontSize: '0.88rem', 
                fontWeight: 700, 
                padding: '0.65rem 1.35rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(59,130,246,0.5)'
              }}
            >
              <Save size={16} /> Save & Activate Live Profile
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {saveStatus.message && (
          <div style={{
            marginTop: '1.2rem',
            padding: '0.85rem 1.2rem',
            borderRadius: '10px',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: saveStatus.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${saveStatus.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: saveStatus.type === 'success' ? '#6ee7b7' : '#fca5a5'
          }}>
            {saveStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {saveStatus.message}
          </div>
        )}
      </div>

      {/* Preset & Custom Profiles Selection Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', borderRadius: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <Sparkles size={18} color="#f59e0b" />
          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>Infrastructure Workload Profiles</h4>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>(Select a hardware preset or create a custom profile)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          
          {/* Preset 1 */}
          <div 
            onClick={() => applyPreset('high_gpu')}
            style={{
              padding: '1rem',
              borderRadius: '12px',
              border: activePreset === 'high_gpu' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
              background: activePreset === 'high_gpu' ? 'rgba(59,130,246,0.12)' : 'var(--bg-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>🚀 High-Perf GPU Stack</span>
              <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>A100 / H100</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Deep retrieval & large context. Top-K: 50 | Rerank: 10 | Max Tokens: 1024 | Batch: 64
            </p>
          </div>

          {/* Preset 2 */}
          <div 
            onClick={() => applyPreset('standard_cloud')}
            style={{
              padding: '1rem',
              borderRadius: '12px',
              border: activePreset === 'standard_cloud' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
              background: activePreset === 'standard_cloud' ? 'rgba(59,130,246,0.12)' : 'var(--bg-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>⚡ Standard Cloud</span>
              <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>Balanced</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Optimal precision/latency balance. Top-K: 20 | Rerank: 5 | Max Tokens: 512 | Batch: 32
            </p>
          </div>

          {/* Preset 3 */}
          <div 
            onClick={() => applyPreset('lightweight_cpu')}
            style={{
              padding: '1rem',
              borderRadius: '12px',
              border: activePreset === 'lightweight_cpu' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
              background: activePreset === 'lightweight_cpu' ? 'rgba(59,130,246,0.12)' : 'var(--bg-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>🔋 Lightweight Edge</span>
              <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>CPU Only</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Low memory & fast SLA. Top-K: 10 | Rerank: 3 | Max Tokens: 256 | Batch: 16
            </p>
          </div>

          {/* Preset 4: Custom Profile */}
          <div 
            onClick={() => applyPreset('custom')}
            style={{
              padding: '1rem',
              borderRadius: '12px',
              border: activePreset === 'custom' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
              background: activePreset === 'custom' ? 'rgba(168,85,247,0.12)' : 'var(--bg-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>⚙️ Custom Workload</span>
              <span className="badge" style={{ fontSize: '0.68rem', backgroundColor: '#9333ea', color: '#fff' }}>Manual Tuning</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Fully customized parameters tuned manually for your exact model & infrastructure requirements.
            </p>
          </div>

        </div>
      </div>

      {/* PARAMETER STACKS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(580px, 1fr))', gap: '1.5rem' }}>

        {/* STACK 1: LLM & Generation Engine */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
            <Cpu size={20} color="#a855f7" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>1. LLM & Generation Engine</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Deployment Mode */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>LLM Deployment Mode</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>LLM_DEPLOYMENT_MODE</span>
              </label>
              <select 
                className="form-control"
                value={params.LLM_DEPLOYMENT_MODE}
                onChange={(e) => handleChange('LLM_DEPLOYMENT_MODE', e.target.value)}
              >
                <option value="CLOUD">CLOUD API (OpenAI / Gemini / Azure REST)</option>
                <option value="ON_PREM">ON_PREM / LOCAL (vLLM / Ollama Cluster)</option>
              </select>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Defines whether inference requests route through Cloud APIs or local GPU vLLM instances.</em>
              </div>
            </div>

            {/* Model ID */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>Default Model Identifier</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>DEFAULT_MODEL_ID</span>
              </label>
              <input 
                type="text" 
                className="form-control"
                value={params.DEFAULT_MODEL_ID}
                onChange={(e) => handleChange('DEFAULT_MODEL_ID', e.target.value)}
                placeholder="e.g. gemini-3.5-flash, gpt-4o, meta-llama/Llama-3-70b-instruct"
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Target model string passed to the completion endpoint for text generation & synthesis.</em>
              </div>
            </div>

            {/* LLM Generation Max Tokens */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Max Response Generation Tokens (<code style={{ color: 'var(--accent)' }}>DEFAULT_MAX_TOKENS</code>)
                </label>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)' }}>{params.DEFAULT_MAX_TOKENS} tokens</span>
              </div>
              <input 
                type="range" 
                min="64" 
                max="4096" 
                step="64"
                value={params.DEFAULT_MAX_TOKENS}
                onChange={(e) => handleChange('DEFAULT_MAX_TOKENS', parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Maximum completion tokens generated by the LLM per answer. Controls latency and response length.</em>
              </div>
            </div>

            {/* LLM Generation Temperature */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  LLM Sampling Temperature (<code style={{ color: 'var(--accent)' }}>DEFAULT_TEMPERATURE</code>)
                </label>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)' }}>{params.DEFAULT_TEMPERATURE}</span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="1.0" 
                step="0.05"
                value={params.DEFAULT_TEMPERATURE}
                onChange={(e) => handleChange('DEFAULT_TEMPERATURE', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Sampling temperature (0.0 = strict factual determinism, 1.0 = creative generation).</em>
              </div>
            </div>

            {/* LLM Repetition Penalty */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  vLLM Repetition Penalty (<code style={{ color: 'var(--accent)' }}>DEFAULT_REPETITION_PENALTY</code>)
                </label>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)' }}>{params.DEFAULT_REPETITION_PENALTY}</span>
              </div>
              <input 
                type="range" 
                min="1.0" 
                max="2.0" 
                step="0.05"
                value={params.DEFAULT_REPETITION_PENALTY}
                onChange={(e) => handleChange('DEFAULT_REPETITION_PENALTY', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Repetition penalty applied during local vLLM generation to prevent token looping.</em>
              </div>
            </div>

            {/* API Base URL */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>LLM REST API Base URL</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>LLM_API_BASE_URL</span>
              </label>
              <input 
                type="text" 
                className="form-control"
                value={params.LLM_API_BASE_URL}
                onChange={(e) => handleChange('LLM_API_BASE_URL', e.target.value)}
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Base URL for OpenAI-compatible REST endpoints or vLLM server nodes.</em>
              </div>
            </div>

          </div>
        </div>

        {/* STACK 2: Qdrant & Vector DB Engine */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
            <Database size={20} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>2. Qdrant & Vector Retrieval Engine</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Vector Top K */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Vector Candidate Fetch Limit (<code style={{ color: 'var(--accent)' }}>VECTOR_TOP_K</code>)
                </label>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)' }}>{params.VECTOR_TOP_K} candidates</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="100" 
                step="5"
                value={params.VECTOR_TOP_K}
                onChange={(e) => handleChange('VECTOR_TOP_K', parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Number of raw vector candidate blocks retrieved from Qdrant via Dense + Sparse (BM25) RRF hybrid search. Higher values increase search recall on large models.</em>
              </div>
            </div>

            {/* Vector Dimension */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>Dense Vector Dimension</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>VECTOR_DIMENSION</span>
              </label>
              <input 
                type="number" 
                className="form-control"
                value={params.VECTOR_DIMENSION}
                onChange={(e) => handleChange('VECTOR_DIMENSION', parseInt(e.target.value))}
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Embedding vector dimension size (e.g. 1024 for BGE-large-en, 768 for BGE-base, 1536 for OpenAI text-embedding-3-small).</em>
              </div>
            </div>

            {/* Qdrant URL */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>Qdrant Cluster Endpoint</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>QDRANT_URL</span>
              </label>
              <input 
                type="text" 
                className="form-control"
                value={params.QDRANT_URL}
                onChange={(e) => handleChange('QDRANT_URL', e.target.value)}
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>HTTP REST URL of your local or remote Qdrant Vector DB cluster node.</em>
              </div>
            </div>

          </div>
        </div>

        {/* STACK 3: Cross-Encoder Reranker & Filtering Engine */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
            <Layers size={20} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>3. Reranker & Relevance Filter</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Rerank Enabled Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Enable Cross-Encoder Reranking</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Re-scores hybrid vector candidates using BGE Cross-Encoder before context assembly</div>
              </div>
              <input 
                type="checkbox"
                checked={params.RERANK_ENABLED}
                onChange={(e) => handleChange('RERANK_ENABLED', e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            {/* Rerank Top K */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Final Prompt Context Blocks (<code style={{ color: 'var(--accent)' }}>RERANK_TOP_K</code>)
                </label>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)' }}>{params.RERANK_TOP_K} blocks</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="15" 
                step="1"
                value={params.RERANK_TOP_K}
                onChange={(e) => handleChange('RERANK_TOP_K', parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Number of top-ranked context blocks injected into the LLM prompt. Increase for large-context models.</em>
              </div>
            </div>

            {/* Score Threshold */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Minimum Relevance Score Cutoff (<code style={{ color: 'var(--accent)' }}>RERANKER_SCORE_THRESHOLD</code>)
                </label>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)' }}>{params.RERANKER_SCORE_THRESHOLD}</span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="0.95" 
                step="0.05"
                value={params.RERANKER_SCORE_THRESHOLD}
                onChange={(e) => handleChange('RERANKER_SCORE_THRESHOLD', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Any context candidate scoring below this threshold is dropped as noise before reaching the LLM.</em>
              </div>
            </div>

          </div>
        </div>

        {/* STACK 4: Semantic Chunking & Data Ingestion */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
            <HardDrive size={20} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>4. Semantic Chunking & Parsing</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Chunk Max Size */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>Maximum Chunk Character Limit</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CHUNK_MAX_SIZE</span>
              </label>
              <input 
                type="number" 
                className="form-control"
                value={params.CHUNK_MAX_SIZE}
                onChange={(e) => handleChange('CHUNK_MAX_SIZE', parseInt(e.target.value))}
                step="100"
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Target character boundary for semantic splitting. Increase for long document policies; decrease for granular QA search.</em>
              </div>
            </div>

            {/* Chunk Overlap */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>Sliding Chunk Overlap</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CHUNK_OVERLAP</span>
              </label>
              <input 
                type="number" 
                className="form-control"
                value={params.CHUNK_OVERLAP}
                onChange={(e) => handleChange('CHUNK_OVERLAP', parseInt(e.target.value))}
                step="25"
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Overlapping character count between consecutive chunks to preserve sentence continuity.</em>
              </div>
            </div>

            {/* Client Batch Limit */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>Embedding Batch Processing Size</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CLIENT_BATCH_LIMIT</span>
              </label>
              <input 
                type="number" 
                className="form-control"
                value={params.CLIENT_BATCH_LIMIT}
                onChange={(e) => handleChange('CLIENT_BATCH_LIMIT', parseInt(e.target.value))}
                step="8"
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                💡 <em>Batch size of text items dispatched simultaneously to the TEI embedding server. Increase on heavy GPU setups.</em>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Bottom Save Action Bar */}
      <div className="card" style={{ 
        marginTop: '1.5rem', 
        padding: '1.25rem', 
        borderRadius: '14px',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <Info size={16} color="var(--accent)" />
          Changes take effect immediately across all workspace retrieval & inference pipelines upon activation.
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleSaveAndActivate} 
          disabled={loading}
          style={{ 
            fontSize: '0.92rem', 
            fontWeight: 800, 
            padding: '0.75rem 2rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            boxShadow: '0 4px 16px rgba(59,130,246,0.4)'
          }}
        >
          <Save size={18} /> Apply & Activate Workload Profile
        </button>
      </div>

    </div>
  );
};
