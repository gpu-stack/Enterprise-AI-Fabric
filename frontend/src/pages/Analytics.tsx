// @ts-nocheck

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { Activity, Clock, Database, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAppLogic } from '../useAppLogic';

export const Analytics = () => {
  const {
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
    activeTab,
    setActiveTab,
    config,
    setConfig,
    uploadedFiles,
    setUploadedFiles,
    fileConfigs,
    setFileConfigs,
    isIngesting,
    setIsIngesting,
    activeJobs,
    setActiveJobs,
    ingestProgress,
    setIngestProgress,
    ingestStatusText,
    setIngestStatusText,
    ingestSummary,
    setIngestSummary,
    lastIngestResults,
    setLastIngestResults,
    queryText,
    setQueryText,
    queryTemp,
    setQueryTemp,
    queryTopK,
    setQueryTopK,
    isQuerying,
    setIsQuerying,
    ragChatHistory,
    setRagChatHistory,
    showTracePanel,
    setShowTracePanel,
    evalRuns,
    setEvalRuns,
    profiles,
    setProfiles,
    onboardAlias,
    setOnboardAlias,
    onboardProviderType,
    setOnboardProviderType,
    onboardEndpointUrl,
    setOnboardEndpointUrl,
    onboardModelId,
    setOnboardModelId,
    onboardApiKey,
    setOnboardApiKey,
    downstreamQdrantUrl,
    setDownstreamQdrantUrl,
    downstreamEmbeddingUrl,
    setDownstreamEmbeddingUrl,
    downstreamRerankerUrl,
    setDownstreamRerankerUrl,
    downstreamVectorTopK,
    setDownstreamVectorTopK,
    downstreamRerankTopK,
    setDownstreamRerankTopK,
    downstreamScoreThreshold,
    setDownstreamScoreThreshold,
    chatHistory,
    setChatHistory,
    chatInput,
    setChatInput,
    isChatting,
    setIsChatting,
    sumFile,
    setSumFile,
    sumLength,
    setSumLength,
    sumMaxTokens,
    setSumMaxTokens,
    isSummarizing,
    setIsSummarizing,
    summaryResult,
    setSummaryResult,
    evalSource,
    setEvalSource,
    evalCount,
    setEvalCount,
    testCases,
    setTestCases,
    isTestCaseLoading,
    setIsTestCaseLoading,
    isTestingConnectivity,
    setIsTestingConnectivity,
    connectivityReport,
    setConnectivityReport,
    revealEndpoint,
    setRevealEndpoint,
    synthesisStatus,
    setSynthesisStatus,
    availableModels,
    setAvailableModels,
    evalResults,
    setEvalResults,
    isEvaluating,
    setIsEvaluating,
    evalProgress,
    setEvalProgress,
    isPreviewExpanded,
    setIsPreviewExpanded,
    isFluctuationExpanded,
    setIsFluctuationExpanded,
    isInterpretExpanded,
    setIsInterpretExpanded,
    isDetailedMetricsExpanded,
    setIsDetailedMetricsExpanded,
    lastRefreshed,
    setLastRefreshed,
    isRefreshing,
    setIsRefreshing,
    newTenantId,
    setNewTenantId,
    newTenantAdapter,
    setNewTenantAdapter,
    adminStatusMsg,
    setAdminStatusMsg,
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
    ingestionHistory
  } = useAppLogic();
  const [metricData, setMetricData] = useState<any[]>([]);

  // Calculations
  const qPoints = health?.components?.qdrant?.points_count ?? health?.nodes?.qdrant?.points_count ?? 0;
  const totalVectors = (typeof qPoints === 'number' ? qPoints : 0).toLocaleString();
  
  // Calculate Avg Latency
  let totalLatency = 0;
  let latencyCount = 0;
  
  Object.values(ragChatHistory).forEach((tenantHistory) => {
    (tenantHistory || []).forEach(msg => {
      if (msg.role === 'assistant' && msg.latency !== undefined) {
        totalLatency += msg.latency;
        latencyCount++;
      }
    });
  });
  
  const avgLatency = latencyCount > 0 
    ? `${(totalLatency / latencyCount * 1000).toFixed(0)}ms (${(totalLatency / latencyCount).toFixed(1)}s)` 
    : 'No data';

  // Filter evaluation runs for currentTenant if active
  const activeTenantRuns = (evalRuns || []).filter(r => 
    !currentTenant || !r.tenant_id || r.tenant_id.toLowerCase() === currentTenant.toLowerCase()
  );

  // Calculate Global Accuracy across 4 core RAGAS metrics
  let globalAccuracy = 'No data';
  if (activeTenantRuns.length > 0) {
    const totalScore = activeTenantRuns.reduce((acc, run) => {
      const f = run.scores?.faithfulness ?? 0;
      const r = run.scores?.answer_relevance ?? run.scores?.answer_relevancy ?? 0;
      const p = run.scores?.context_precision ?? 0;
      const rec = run.scores?.context_recall ?? 0;
      return acc + ((f + r + p + rec) / 4);
    }, 0);
    globalAccuracy = `${((totalScore / activeTenantRuns.length) * 100).toFixed(1)}%`;
  }

  useEffect(() => {
    if (activeTenantRuns.length > 0) {
      const chartRuns = [...activeTenantRuns].reverse().slice(-7);
      const data = chartRuns.map(run => {
        const timeLabel = run.timestamp ? (run.timestamp.includes(' ') ? run.timestamp.split(' ')[1] : run.timestamp.slice(-5)) : '';
        return {
          name: `#${run.id} ${timeLabel}`.trim(),
          Faithfulness: Math.round((run.scores?.faithfulness ?? 0) * 100),
          Relevance: Math.round((run.scores?.answer_relevance ?? run.scores?.answer_relevancy ?? 0) * 100),
          Precision: Math.round((run.scores?.context_precision ?? 0) * 100),
          Recall: Math.round((run.scores?.context_recall ?? 0) * 100)
        };
      });
      setMetricData(data);
    } else {
      setMetricData([]);
    }
  }, [evalRuns, currentTenant]);

  return (
    <div className="analytics-dashboard" style={{ padding: '1rem', width: '100%' }}>
      <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Activity size={24} color="var(--accent)" /> System Telemetry & Analytics Dashboard
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Real-time insights across {tenants?.length || 0} active workspaces. Scope: <strong>[{currentTenant || 'Global'}]</strong>
      </p>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            <Database size={18} /> Total Embedded Vectors
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalVectors}</div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.5rem' }}>Live from Qdrant</div>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            <Clock size={18} /> Global Avg. Query Latency
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{avgLatency}</div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.5rem' }}>Based on recent queries</div>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            <CheckCircle size={18} /> Global RAG Accuracy
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{globalAccuracy}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Based on 4 Ragas metrics ({activeTenantRuns.length} runs)</div>
        </div>
      </div>

      <div className="analytics-chart-grid">
        {/* RAGAS Quality Trend Line Chart */}
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>RAGAS Quality Trends (Last {metricData.length} Runs)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="Faithfulness" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Relevance" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Precision" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Recall" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Area Chart */}
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Ingestion Throughput (Vectors / min)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={ingestionHistory && ingestionHistory.length > 0 ? ingestionHistory : [{ name: 'Baseline', Vectors: 0 }]} 
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} domain={[0, 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} 
                  itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Vectors" 
                  stroke="#8b5cf6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorUv)" 
                  dot={{ r: 5, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
