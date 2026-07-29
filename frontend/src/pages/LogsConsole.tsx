// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Shield, RefreshCw, Download, Trash2, Filter, Database,
  Search, Sliders, AlertCircle, CheckCircle, X, Play, Pause, Save, Bug, BarChart2, Zap, ChevronUp, ChevronDown
} from 'lucide-react';
import { useAppLogic } from '../useAppLogic';

export const LogsConsole = () => {
  const { health, maskIp } = useAppLogic();

  // Convert UTC backend timestamps to Local Browser Timezone
  const formatLocalTime = (log: any) => {
    try {
      const ts = log.timestamp;
      if (ts) {
        const isoStr = ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
        const d = new Date(isoStr);
        if (!isNaN(d.getTime())) {
          const h = String(d.getHours()).padStart(2, '0');
          const m = String(d.getMinutes()).padStart(2, '0');
          const s = String(d.getSeconds()).padStart(2, '0');
          const ms = String(d.getMilliseconds()).padStart(3, '0');
          return `${h}:${m}:${s}.${ms}`;
        }
      }
    } catch (e) {}
    return log.display_time || log.timestamp || '';
  };

  // Log Console States
  const [logs, setLogs] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [retentionRules, setRetentionRules] = useState<any>({
    log_retention_days: 30,
    max_file_size_mb: 10,
    max_backup_files: 5,
    audit_retention_days: 365,
    max_eval_runs_limit: 100
  });

  const [activeSubTab, setActiveSubTab] = useState<'console' | 'audit' | 'retention' | 'metrics'>('console');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedComponent, setSelectedComponent] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAutoScroll, setIsAutoScroll] = useState<boolean>(true);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [logSortOrder, setLogSortOrder] = useState<'asc' | 'desc'>('asc'); // Default to Chronological Terminal Stream (Newest at Bottom)
  const [selectedTraceback, setSelectedTraceback] = useState<any>(null);
  const [isSavingRetention, setIsSavingRetention] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [telemetryMetrics, setTelemetryMetrics] = useState<any>({});
  const [aggregateMetrics, setAggregateMetrics] = useState<any>(null);
  const [metricsTimeWindow, setMetricsTimeWindow] = useState<string>('24h');
  const [metricsTenantId, setMetricsTenantId] = useState<string>('ALL');

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal window to bottom when new logs arrive in Chronological mode
  useEffect(() => {
    if (isAutoScroll && terminalContainerRef.current && logSortOrder === 'asc') {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs, isAutoScroll, logSortOrder]);

  // Fetch System Logs
  const fetchLogs = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (selectedLevel !== 'ALL') queryParams.append('level', selectedLevel);
      if (selectedComponent !== 'ALL') queryParams.append('component', selectedComponent);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
      queryParams.append('limit', '500');

      const res = await fetch(`/api/admin/logs?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      }
    } catch (e) {
      console.error('Error fetching system logs:', e);
    }
  };

  // Fetch Audit Trail Events
  const fetchAuditEvents = async () => {
    try {
      const res = await fetch('/api/admin/audit');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.audit_events)) {
          setAuditEvents(data.audit_events);
        }
      }
    } catch (e) {
      console.error('Error fetching audit vault events:', e);
    }
  };

  // Fetch Log Retention Policy Rules
  const fetchRetentionRules = async () => {
    try {
      const res = await fetch('/api/admin/logs/retention');
      if (res.ok) {
        const data = await res.json();
        if (data && data.retention) {
          setRetentionRules(data.retention);
        }
      }
    } catch (e) {
      console.error('Error fetching log retention rules:', e);
    }
  };

  // Fetch Telemetry Metrics
  const fetchTelemetryMetrics = async () => {
    try {
      const res = await fetch('/api/admin/telemetry/metrics');
      if (res.ok) {
        const data = await res.json();
        if (data && data.metrics) {
          setTelemetryMetrics(data.metrics);
        }
      }
    } catch (e) {
      console.error('Error fetching telemetry metrics:', e);
    }
  };

  // Fetch Aggregate Latency SLA Metrics
  const fetchAggregateMetrics = async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('time_window', metricsTimeWindow);
      if (metricsTenantId !== 'ALL') queryParams.append('tenant_id', metricsTenantId);

      const res = await fetch(`/api/admin/metrics/aggregate?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          setAggregateMetrics(data.data);
        }
      }
    } catch (e) {
      console.error('Error fetching aggregate metrics:', e);
    }
  };

  // Export Audit CSV
  const handleExportAuditCSV = () => {
    window.open('/api/admin/audit/export?format=csv', '_blank');
  };

  // Polling stream effect
  useEffect(() => {
    fetchLogs();
    fetchAuditEvents();
    fetchRetentionRules();
    fetchTelemetryMetrics();
    fetchAggregateMetrics();

    const interval = setInterval(() => {
      if (isLiveStreaming) {
        if (activeSubTab === 'console') fetchLogs();
        fetchTelemetryMetrics();
        if (activeSubTab === 'metrics') fetchAggregateMetrics();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveStreaming, activeSubTab, selectedLevel, selectedComponent, searchQuery, metricsTimeWindow, metricsTenantId]);

  // Auto-scroll terminal window
  useEffect(() => {
    if (isAutoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isAutoScroll]);

  // Save Dynamic Retention Rules
  const handleSaveRetention = async () => {
    setIsSavingRetention(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/logs/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(retentionRules)
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ message: 'Retention policy rules updated and applied successfully.', type: 'success' });
        fetchRetentionRules();
        fetchAuditEvents();
      } else {
        setStatusMsg({ message: data.detail || 'Failed to update retention policy.', type: 'error' });
      }
    } catch (e: any) {
      setStatusMsg({ message: `Error updating retention rules: ${e.message}`, type: 'error' });
    } finally {
      setIsSavingRetention(false);
    }
  };

  // Trigger Manual Log Purge
  const handlePurgeLogs = async () => {
    if (!window.confirm('Are you sure you want to execute an immediate manual log purge for expired files?')) return;
    setIsPurging(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/logs/purge?purge_metrics=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ message: data.message || 'Log purge completed successfully.', type: 'success' });
        fetchLogs();
        fetchAuditEvents();
        fetchAggregateMetrics();
      } else {
        setStatusMsg({ message: data.detail || 'Failed to execute log purge.', type: 'error' });
      }
    } catch (e: any) {
      setStatusMsg({ message: `Purge fault: ${e.message}`, type: 'error' });
    } finally {
      setIsPurging(false);
    }
  };

  // Export Log File
  const handleExportLogs = () => {
    window.open('/api/admin/logs/export', '_blank');
  };

  // Get Log Level Color Badge
  const [isTerminalMinimized, setIsTerminalMinimized] = useState<boolean>(false);

  const getLogLevelStyle = (level: string) => {
    switch ((level || '').toUpperCase()) {
      case 'ERROR':
      case 'FATAL':
        return { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444' };
      case 'WARN':
      case 'WARNING':
        return { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' };
      case 'SUCCESS':
        return { color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981' };
      case 'INFO':
      default:
        return { color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6' };
    }
  };

  const getActionTypeBadge = (action: string) => {
    if (action.includes('UPDATE') || action.includes('EDIT')) return <span className="score-badge status-prod">PROMPT UPDATE</span>;
    if (action.includes('REVERT') || action.includes('ROLLBACK')) return <span className="score-badge status-staging">REVERT</span>;
    if (action.includes('DELETE') || action.includes('PURGE')) return <span className="score-badge status-fail">DELETE</span>;
    if (action.includes('ACTIVATE')) return <span className="score-badge status-prod">MODEL ACTIVATE</span>;
    return <span className="score-badge status-staging">{action}</span>;
  };

  return (
    <div style={{ textAlign: 'left' }}>
      {/* Sub-header Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity style={{ color: 'var(--accent-color)' }} size={24} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              ⚡ Live Observability & Performance Analytics
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
              Real-time log streaming, correlation-ID tracing, p50/p95 latency SLA metrics, and security audit lineage.
            </p>
          </div>
        </div>

        {/* Sub-Tab Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn ${activeSubTab === 'console' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('console')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Activity size={14} /> System Logs Console
          </button>
          <button
            className={`btn ${activeSubTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('audit')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Shield size={14} /> Audit Lineage Vault
          </button>
          <button
            className={`btn ${activeSubTab === 'metrics' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('metrics')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <BarChart2 size={14} /> Latency SLA Analytics
          </button>
          <button
            className={`btn ${activeSubTab === 'retention' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('retention')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Sliders size={14} /> Retention Rules
          </button>
        </div>
      </div>

      {/* SECTION 1: Single-Pane System Architecture Real-Time Microservice Health */}
      <div style={{
        marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: '12px',
        border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity size={18} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>⚡ Real-Time Microservice Infrastructure Health</span>
            <span style={{
              padding: '0.15rem 0.55rem', borderRadius: '16px', fontSize: '0.72rem', fontWeight: 800,
              backgroundColor: health?.overall_status === 'HEALTHY' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: health?.overall_status === 'HEALTHY' ? '#10b981' : '#ef4444'
            }}>
              {health?.overall_status || 'HEALTHY'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
              ⏱️ Poll Frequency: Every 10s
            </span>
            <span>
              Active Profile: <strong>{health?.active_profile || 'nim-vllm'}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem' }}>
          {Object.values(health?.components || {}).map((comp: any, idx: number) => {
            const isOk = comp.status === 'HEALTHY';
            const isDisabled = comp.status === 'DISABLED';
            const badgeColor = isOk ? '#10b981' : (isDisabled ? '#6b7280' : '#ef4444');

            return (
              <div key={idx} style={{
                padding: '0.55rem 0.75rem', borderRadius: '8px',
                border: `1px solid ${badgeColor}33`, backgroundColor: `${badgeColor}0d`,
                display: 'flex', flexDirection: 'column', gap: '0.2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {comp.name}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: badgeColor }}>
                    {comp.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{comp.latency_ms ? `${comp.latency_ms}ms` : '-'}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>{comp.url?.replace('http://', '')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 1.5: Detailed Qdrant Vector DB Telemetry & Collection Topology */}
      {health?.components?.qdrant && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.3)', backgroundColor: 'rgba(99, 102, 241, 0.05)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Database size={18} color="#6366f1" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                🔍 Qdrant Vector Database Topology & Partition Metrics
              </span>
              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.55rem', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800 }}>
                STATUS: {health.components.qdrant.index_status || 'GREEN'}
              </span>
            </div>
            <span style={{ fontSize: '0.73rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
              Target Collection: <strong style={{ color: 'var(--accent)' }}>{health.components.qdrant.collection_name || 'tenant_knowledge_base'}</strong>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Vector Points</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6366f1', marginTop: '0.2rem' }}>
                {(health.components.qdrant.points_count || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Stored Vector Payloads</div>
            </div>

            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Vector Dimension</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
                {health.components.qdrant.vector_dimension || 1024}d
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                Metric: {health.components.qdrant.distance_metric || 'Cosine'}
              </div>
            </div>

            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Collections Count</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.2rem' }}>
                {health.components.qdrant.collections_count || 1}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Active Qdrant Spaces</div>
            </div>

            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Index Architecture</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ec4899', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                HNSW Payload Index
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Multi-Tenant Partitioned</div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: 24-Hour Operational SLA & Latency Percentiles */}
      <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
        📈 24-Hour Operational SLA & Latency Percentiles (Historical Metrics)
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem'
      }}>
        {[
          { key: 'API', label: '🌐 API Gateway (24h SLA)', p95Text: `p95 E2E: ${aggregateMetrics?.component_p95?.api_e2e_ms || 0}ms` },
          { key: 'VECTOR_DB', label: '🔍 Vector Index (24h SLA)', p95Text: `p95 Retrieval: ${aggregateMetrics?.component_p95?.qdrant_retrieval_ms || 0}ms` },
          { key: 'RERANKER', label: '⚡ Rerank Engine (24h SLA)', p95Text: `p95 Rerank: ${aggregateMetrics?.component_p95?.reranker_ms || 0}ms` },
          { key: 'ORCHESTRATOR', label: '🤖 LLM Inference (24h SLA)', p95Text: `p95 Gen: ${aggregateMetrics?.component_p95?.llm_gen_sec || 0}s | TTFT: ${aggregateMetrics?.component_p95?.llm_ttft_ms || 0}ms` },
          { key: 'EVALUATOR', label: '📊 Ragas Suite (24h SLA)', p95Text: `p95 Eval: ${aggregateMetrics?.component_p95?.eval_sec || 0}s` }
        ].map((c) => {
          const m = telemetryMetrics[c.key] || { total_events: 0, error_events: 0, success_rate_pct: 100.0, status: 'HEALTHY' };
          const isOk = m.status === 'HEALTHY';
          return (
            <div key={c.key} style={{
              backgroundColor: 'var(--bg-secondary)',
              border: `1px solid ${isOk ? 'var(--border-color)' : '#ef4444'}`,
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {c.label}
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.35rem',
                  borderRadius: '3px',
                  backgroundColor: isOk ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: isOk ? '#34d399' : '#f87171',
                  border: `1px solid ${isOk ? '#10b981' : '#ef4444'}`
                }}>
                  {m.status}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>{m.total_events} <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>24h total</span></span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isOk ? '#34d399' : '#f87171' }}>
                  {m.success_rate_pct}% Success
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.2rem', marginTop: '0.1rem' }}>
                <span style={{ color: '#818cf8', fontWeight: 600 }}>{c.p95Text}</span>
                <span><strong style={{ color: 'var(--accent-color)' }}>{m.eps || 0} eps</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {statusMsg && (
        <div className={`status-msg-box ${statusMsg.type === 'success' ? 'status-msg-success' : 'status-msg-error'}`} style={{ marginBottom: '1.25rem' }}>
          {statusMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {statusMsg.message}
        </div>
      )}

      {/* --- TAB 1: UNIFIED LIVE OBSERVABILITY & SLA CONSOLE --- */}
      {activeSubTab === 'console' && (
        <div>
          {/* Time Window & Tenant Partition Filter Bar */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} style={{ color: 'var(--accent-color)' }} />
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                Enterprise Performance SLA Analytics
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                ({aggregateMetrics?.sample_count || 0} Request Samples Captured)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Time Window:</span>
                <select
                  className="tenant-select"
                  value={metricsTimeWindow}
                  onChange={(e) => setMetricsTimeWindow(e.target.value)}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                >
                  <option value="1h">Last 1 Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Partition:</span>
                <select
                  className="tenant-select"
                  value={metricsTenantId}
                  onChange={(e) => setMetricsTenantId(e.target.value)}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                >
                  <option value="ALL">ALL Workspaces</option>
                  <option value="hr_support_v2">hr_support_v2</option>
                </select>
              </div>

              <button className="btn btn-secondary" onClick={fetchAggregateMetrics} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          {/* Global SLA Percentile Strip (p50, p90, p95, p99) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            {[
              { label: 'p50 E2E Latency', value: aggregateMetrics?.e2e?.p50 || 0, desc: 'Median User Experience' },
              { label: 'p90 E2E Latency', value: aggregateMetrics?.e2e?.p90 || 0, desc: '90th Percentile Bound' },
              { label: 'p95 E2E Latency', value: aggregateMetrics?.e2e?.p95 || 0, desc: '95th Percentile SLA' },
              { label: 'p99 E2E Latency', value: aggregateMetrics?.e2e?.p99 || 0, desc: 'Tail Latency SLA' }
            ].map((p, idx) => {
              const valMs = p.value;
              let pillBg = 'rgba(16, 185, 129, 0.15)';
              let pillColor = '#34d399';
              let pillBorder = '#10b981';
              let statusText = 'EXCELLENT';

              if (valMs >= 4000) {
                pillBg = 'rgba(239, 68, 68, 0.15)';
                pillColor = '#f87171';
                pillBorder = '#ef4444';
                statusText = 'HIGH LATENCY';
              } else if (valMs >= 1500) {
                pillBg = 'rgba(245, 158, 11, 0.15)';
                pillColor = '#fbbf24';
                pillBorder = '#f59e0b';
                statusText = 'MODERATE';
              }

              return (
                <div key={idx} style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{p.label}</span>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.35rem',
                      borderRadius: '3px',
                      backgroundColor: pillBg,
                      color: pillColor,
                      border: `1px solid ${pillBorder}`
                    }}>
                      {statusText}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {valMs >= 1000 ? `${(valMs / 1000).toFixed(2)}s` : `${valMs}ms`}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{p.desc}</span>
                </div>
              );
            })}
          </div>

          {/* Side-by-side Grid: Pipeline Waterfall & Inference Efficiency */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Pipeline Stage Waterfall */}
            <div className="card" style={{ padding: '1.1rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: 0, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={15} style={{ color: 'var(--accent-color)' }} />
                Pipeline Latency Stage Breakdown (p95 Distribution)
              </h4>

              {[
                { stage: '1. Pre-processing & Context Rules', key: 'pre_processing_ms', color: '#818cf8' },
                { stage: '2. Embedding Generation (TEI)', key: 'embedding_ms', color: '#60a5fa' },
                { stage: '3. Vector Search (Qdrant)', key: 'qdrant_ms', color: '#34d399' },
                { stage: '4. Cross-Encoder Reranking', key: 'rerank_ms', color: '#fbbf24' },
                { stage: '5. LLM Token Generation (vLLM)', key: 'generation_ms', color: '#f87171' }
              ].map((st, i) => {
                const val = aggregateMetrics?.stages_p95?.[st.key] || 0;
                const maxVal = Math.max(aggregateMetrics?.e2e?.p95 || 1, 10);
                const pct = Math.min(Math.round((val / maxVal) * 100), 100);

                return (
                  <div key={i} style={{ marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{st.stage}</span>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: st.color }}>
                        {val >= 1000 ? `${(val / 1000).toFixed(2)}s` : `${val}ms`} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: '7px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div style={{ height: '100%', width: `${Math.max(pct, 2)}%`, backgroundColor: st.color, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Efficiency Summary Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card" style={{ padding: '1.1rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', flex: 1 }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: 0, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                  ⚡ Time to First Token (TTFT SLA)
                </h4>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#818cf8', marginBottom: '0.2rem' }}>
                  {aggregateMetrics?.efficiency?.avg_ttft_ms || 0}ms <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Avg TTFT</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  p95 TTFT SLA Bound: <strong style={{ color: 'var(--text-primary)' }}>{aggregateMetrics?.efficiency?.p95_ttft_ms || 0}ms</strong>
                </span>
              </div>

              <div className="card" style={{ padding: '1.1rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', flex: 1 }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: 0, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                  🚀 Generation Velocity (Throughput)
                </h4>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', marginBottom: '0.2rem' }}>
                  {aggregateMetrics?.efficiency?.avg_tokens_per_sec || 0} <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>tokens/sec Avg</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  p95 Velocity SLA: <strong style={{ color: 'var(--text-primary)' }}>{aggregateMetrics?.efficiency?.p95_tokens_per_sec || 0} tokens/sec</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Controls Bar for Terminal Stream */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Severity:</span>
                <select
                  className="tenant-select"
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                >
                  <option value="ALL">ALL Severities</option>
                  <option value="INFO">INFO</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Component:</span>
                <select
                  className="tenant-select"
                  value={selectedComponent}
                  onChange={(e) => setSelectedComponent(e.target.value)}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                >
                  <option value="ALL">ALL Components</option>
                  <option value="API">API Gateway</option>
                  <option value="INGEST">Ingestion Pipeline</option>
                  <option value="VECTOR_DB">Qdrant Vector DB</option>
                  <option value="RERANKER">Reranker Engine</option>
                  <option value="ORCHESTRATOR">LLM Orchestrator</option>
                  <option value="EVALUATOR">Ragas Evaluator</option>
                  <option value="SECURITY_AUDIT">Security Audit</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, minWidth: '180px' }}>
                <Search size={14} style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Filter logs or correlation ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.78rem',
                    color: 'var(--text-primary)',
                    width: '100%'
                  }}
                />
              </div>
            </div>

            {/* Action Toggles & Minimize Terminal Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setLogSortOrder(logSortOrder === 'asc' ? 'desc' : 'asc')}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title={logSortOrder === 'asc' ? 'Switch to Newest at Top' : 'Switch to Standard Terminal (Newest at Bottom)'}
              >
                {logSortOrder === 'asc' ? '⬇️ Newest at Bottom' : '⬆️ Newest at Top'}
              </button>

              <button
                className={`btn ${isAutoScroll ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsAutoScroll(!isAutoScroll)}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title={isAutoScroll ? 'Pause automatic scroll to bottom' : 'Enable automatic scroll to bottom'}
              >
                {isAutoScroll ? '📜 Auto-Scroll: ON' : '⏸️ Auto-Scroll: OFF'}
              </button>

              <button
                className={`btn ${isLiveStreaming ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title={isLiveStreaming ? 'Pause live log stream' : 'Resume live log stream'}
              >
                {isLiveStreaming ? <Pause size={12} /> : <Play size={12} />}
                {isLiveStreaming ? 'Live Stream' : 'Paused'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={handleExportLogs}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title="Export raw diagnostic log file bundle"
              >
                <Download size={12} /> Export Logs
              </button>

              <button
                className="btn btn-secondary"
                onClick={fetchLogs}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                title="Refresh log window"
              >
                <RefreshCw size={12} />
              </button>

              {/* Minimize / Expand Terminal Button */}
              <button
                className="btn btn-secondary"
                onClick={() => setIsTerminalMinimized(!isTerminalMinimized)}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: isTerminalMinimized ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-primary)',
                  borderColor: isTerminalMinimized ? '#6366f1' : 'var(--border-color)',
                  color: isTerminalMinimized ? '#818cf8' : 'var(--text-primary)'
                }}
                title={isTerminalMinimized ? 'Expand live log terminal window' : 'Minimize live log terminal window'}
              >
                {isTerminalMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                {isTerminalMinimized ? 'Expand Terminal' : 'Minimize Terminal'}
              </button>
            </div>
          </div>

          {/* Terminal Log Console Display Window */}
          {isTerminalMinimized ? (
            <div style={{
              backgroundColor: '#0d1117',
              border: '1px dashed #30363d',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem'
            }}>
              <span>💻 Live Terminal Stream Minimized ({logs.length} log events cached in memory)</span>
              <button
                onClick={() => setIsTerminalMinimized(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-color)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                Expand Stream ↗
              </button>
            </div>
          ) : (
            <div 
              ref={terminalContainerRef}
              style={{
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px',
                fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
                fontSize: '0.78rem',
                padding: '1rem',
                height: '460px',
                overflowY: 'auto',
                color: '#c9d1d9',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
                textAlign: 'left'
              }}
            >
            {logs.length === 0 ? (
              <div style={{ color: '#8b949e', textAlign: 'center', padding: '3rem 1rem' }}>
                <Activity size={28} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                <div>No log entries match the current filter parameters.</div>
              </div>
            ) : (
              (logSortOrder === 'asc' ? [...logs].reverse() : logs).map((log) => {
                const style = getLogLevelStyle(log.level);
                return (
                  <div 
                    key={log.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '0.6rem', 
                      marginBottom: '0.35rem', 
                      lineHeight: '1.45',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      paddingBottom: '0.25rem'
                    }}
                  >
                    <span style={{ color: '#8b949e', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                      {formatLocalTime(log)}
                    </span>

                    <span style={{
                      backgroundColor: style.bg,
                      color: style.color,
                      border: `1px solid ${style.border}`,
                      borderRadius: '3px',
                      padding: '0.05rem 0.35rem',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>
                      {log.level}
                    </span>

                    <span style={{ color: '#818cf8', fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                      [{log.component}]
                    </span>

                    <span style={{ color: '#6e7681', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                      ({log.correlation_id})
                    </span>

                    <span style={{ color: '#e6edf3', flex: 1, wordBreak: 'break-word' }}>
                      {log.message}
                    </span>

                    {log.traceback && (
                      <button
                        onClick={() => setSelectedTraceback(log)}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          border: '1px solid #ef4444',
                          borderRadius: '3px',
                          padding: '0.1rem 0.4rem',
                          fontSize: '0.65rem',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        🐛 View Traceback
                      </button>
                    )}
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        )}
      </div>
      )}

      {/* --- TAB 2: SECURITY & OPERATIONAL AUDIT VAULT --- */}
      {activeSubTab === 'audit' && (
        <div>
          <div className="info-callout" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p className="info-callout-title">🛡️ Security & Administrative Audit Trail</p>
              Immutable lineage recording administrative operations, system prompt revisions, model profile activations, tenant provisionings, and collection wipes.
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleExportAuditCSV}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={14} /> Export Audit Report (CSV)
            </button>
          </div>

          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>Action Event</th>
                  <th>Description</th>
                  <th>Scope</th>
                  <th>Actor</th>
                  <th>Operation Details</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No administrative audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditEvents.map((ev) => (
                    <tr key={ev.id}>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {ev.display_time}
                      </td>
                      <td>{getActionTypeBadge(ev.action_type)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ev.title}</td>
                      <td>
                        <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--bg-primary)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          {ev.tenant_id}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ev.actor}</td>
                      <td>
                        <pre style={{
                          margin: 0,
                          fontSize: '0.68rem',
                          fontFamily: 'monospace',
                          backgroundColor: 'var(--bg-primary)',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '4px',
                          maxHeight: '80px',
                          overflowY: 'auto',
                          border: '1px solid var(--border-color)'
                        }}>
                          {JSON.stringify(ev.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: DYNAMIC RETENTION SETTINGS --- */}
      {activeSubTab === 'retention' && (
        <div style={{ maxWidth: '800px' }}>
          <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} style={{ color: 'var(--accent-color)' }} />
              Dynamic Log & Audit Retention Settings
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Configure automatic rotation, file size thresholds, and retention windows without requiring server restarts.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {/* System Log Retention Window */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                  📅 System Log Retention Window (Days)
                </label>
                <select
                  className="tenant-select"
                  value={retentionRules.log_retention_days}
                  onChange={(e) => setRetentionRules({ ...retentionRules, log_retention_days: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '0.45rem' }}
                >
                  <option value={7}>7 Days (High Storage Saver)</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days (Standard Recommended)</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days (Enterprise Deep Audit)</option>
                </select>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                  Rotated file segments older than this limit are purged automatically.
                </span>
              </div>

              {/* Max Single Log File Size */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                  💾 Max Single Log File Size (MB)
                </label>
                <select
                  className="tenant-select"
                  value={retentionRules.max_file_size_mb}
                  onChange={(e) => setRetentionRules({ ...retentionRules, max_file_size_mb: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '0.45rem' }}
                >
                  <option value={5}>5 MB per file segment</option>
                  <option value={10}>10 MB per file segment (Default)</option>
                  <option value={20}>20 MB per file segment</option>
                  <option value={50}>50 MB per file segment</option>
                </select>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                  Triggers file rotation (`system.log` -&gt; `system.log.1`) when reached.
                </span>
              </div>

              {/* Max Rotated Backup Files */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                  📂 Max Rotated Backup Segments
                </label>
                <select
                  className="tenant-select"
                  value={retentionRules.max_backup_files}
                  onChange={(e) => setRetentionRules({ ...retentionRules, max_backup_files: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '0.45rem' }}
                >
                  <option value={3}>3 Backup Segments (~30 MB max)</option>
                  <option value={5}>5 Backup Segments (~50 MB max)</option>
                  <option value={10}>10 Backup Segments (~100 MB max)</option>
                </select>
              </div>

              {/* Audit Vault Retention Window */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                  🛡️ Audit Vault Retention Window (Days)
                </label>
                <select
                  className="tenant-select"
                  value={retentionRules.audit_retention_days}
                  onChange={(e) => setRetentionRules({ ...retentionRules, audit_retention_days: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '0.45rem' }}
                >
                  <option value={90}>90 Days</option>
                  <option value={180}>180 Days</option>
                  <option value={365}>365 Days (1 Year Compliance Standard)</option>
                </select>
              </div>
            </div>

            {/* Retention Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleSaveRetention}
                disabled={isSavingRetention}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Save size={14} /> {isSavingRetention ? 'Saving Rules...' : 'Save & Apply Retention Rules'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={handlePurgeLogs}
                disabled={isPurging}
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Trash2 size={14} /> {isPurging ? 'Purging...' : '🧹 Execute Immediate Log Purge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STACK TRACEBACK INSPECTOR MODAL */}
      {selectedTraceback && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
            textAlign: 'left'
          }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #30363d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#161b22',
              borderTopLeftRadius: '10px',
              borderTopRightRadius: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bug style={{ color: '#ef4444' }} size={18} />
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f87171' }}>
                  Python Exception Traceback Inspector
                </span>
                <span style={{ fontSize: '0.72rem', color: '#8b949e' }}>
                  ({selectedTraceback.correlation_id})
                </span>
              </div>
              <button
                onClick={() => setSelectedTraceback(null)}
                style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: '1rem', color: '#e6edf3', fontSize: '0.85rem', fontWeight: 600 }}>
                Error Message: <span style={{ color: '#f87171' }}>{selectedTraceback.message}</span>
              </div>

              <pre style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '0.75rem',
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '6px',
                padding: '1rem',
                color: '#fca5a5',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.5'
              }}>
                {selectedTraceback.traceback || 'No detailed Python traceback recorded for this log entry.'}
              </pre>
            </div>

            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #30363d', textAlign: 'right', backgroundColor: '#161b22' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedTraceback(null)} style={{ fontSize: '0.8rem' }}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
