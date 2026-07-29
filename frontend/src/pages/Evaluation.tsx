// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Trash2, XCircle, AlertTriangle, CheckCircle, Sliders } from 'lucide-react';
import { useAppLogic } from '../useAppLogic';

export const Evaluation = () => {
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
    selectedJudgeModel,
    setSelectedJudgeModel,
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
    handleActivateJudgeModel,
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
    getRerankerLabel
  } = useAppLogic();

  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [selectedJudgeProfile, setSelectedJudgeProfile] = useState<string>('');

  useEffect(() => {
    if (activeProfileName && !selectedJudgeProfile) {
      setSelectedJudgeProfile(activeProfileName);
    }
  }, [activeProfileName]);

  const toggleCompareRun = (runId: string) => {
    if (selectedCompareIds.includes(runId)) {
      setSelectedCompareIds(selectedCompareIds.filter(id => id !== runId));
    } else {
      if (selectedCompareIds.length >= 2) {
        setSelectedCompareIds([selectedCompareIds[1], runId]);
      } else {
        setSelectedCompareIds([...selectedCompareIds, runId]);
      }
    }
  };

  return (
    <div>
      {!currentTenant ? (
        <div className="status-msg-box status-msg-warning">
          ⚠️ No active workspace scope focused. Select one in the left panel.
        </div>
      ) : (
        <div>
                      <h3 className="section-title">📊 RAG Assessment & Evaluation Console</h3>
                      <div className="info-callout">
                        <p className="info-callout-title">Benchmarking Framework: Ragas (LLM-as-a-Judge)</p>
                        This module utilizes the Ragas framework to audit RAG quality metrics. It retrieves context blocks, generates responses, and instructs an LLM-as-a-judge to evaluate faithfulness, answer relevance, and context metrics.
                      </div>

                      {/* Local Ragas Connection & Judge Model Selector Card */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                        gap: '1rem', 
                        marginBottom: '1.5rem', 
                        textAlign: 'left' 
                      }}>
                        <div style={{ 
                          backgroundColor: 'var(--bg-secondary)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '8px', 
                          padding: '1rem', 
                          boxShadow: 'var(--card-shadow)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          justifySpace: 'space-between',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: connectivityReport?.llm?.status === 'error' ? '#ef4444' : '#10b981',
                              boxShadow: connectivityReport?.llm?.status === 'error' ? '0 0 8px #ef4444' : '0 0 8px #10b981'
                            }} />
                            <div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Active Evaluation Judge Status
                              </div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '0.15rem' }}>
                                Active Judge: <span style={{ color: '#818cf8' }}>{config.DEFAULT_MODEL_ID || 'System Default'}</span>
                                {activeProfileName && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginLeft: '0.4rem' }}>({activeProfileName})</span>}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <span>Endpoint:</span>
                                <code 
                                  style={{ cursor: 'pointer', borderBottom: '1px dashed var(--text-secondary)', color: 'var(--text-primary)', fontWeight: 600 }}
                                  onClick={() => setRevealEndpoint(!revealEndpoint)}
                                  title={revealEndpoint ? "Click to mask IP address" : "Click to reveal IP address"}
                                >
                                  {revealEndpoint ? (config.LLM_API_BASE_URL || 'Remote GPU Node') : maskIp(config.LLM_API_BASE_URL || 'Remote GPU Node')}
                                </code>
                                <span>| Mode: <code>{config.PROVIDER_TYPE || config.LLM_DEPLOYMENT_MODE || 'vLLM'}</code></span>
                              </div>
                            </div>
                          </div>

                          {/* Judge Model Selection Dropdown & Activate Button */}
                          <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '320px' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block' }}>
                              ⚖️ Select & Activate LLM-as-Judge Model
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <select
                                className="tenant-select"
                                value={selectedJudgeProfile || activeProfileName || ''}
                                onChange={(e) => {
                                  const pName = e.target.value;
                                  setSelectedJudgeProfile(pName);
                                  const p = profiles && profiles[pName];
                                  if (p && p.DEFAULT_MODEL_ID) {
                                    setSelectedJudgeModel(p.DEFAULT_MODEL_ID);
                                  }
                                }}
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', flex: 1 }}
                              >
                                {profiles && Object.entries(profiles).map(([profileName, prof]: [string, any]) => {
                                  if (!prof || typeof prof !== 'object' || !prof.DEFAULT_MODEL_ID) return null;
                                  return (
                                    <option key={profileName} value={profileName}>
                                      {prof.DEFAULT_MODEL_ID} ({profileName})
                                    </option>
                                  );
                                })}
                              </select>
                              <button
                                className="btn btn-primary"
                                onClick={() => handleActivateJudgeModel(selectedJudgeProfile || activeProfileName)}
                                disabled={isTestingConnectivity}
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                title="Set active Judge Model connection profile and test all infrastructure endpoints"
                              >
                                {isTestingConnectivity ? '⚡ Testing...' : '⚡ Activate & Connect'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fluctuation Info Expander */}
                      <div className="config-expander" style={{ marginBottom: '2rem' }}>
                        <div 
                          className="config-expander-header" 
                          onClick={() => setIsFluctuationExpanded(!isFluctuationExpanded)}
                        >
                          <span>❓ Why do scores fluctuate slightly between runs on the same dataset?</span>
                          {isFluctuationExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                        {isFluctuationExpanded && (
                          <div className="config-expander-content" style={{ padding: '1.25rem', textAlign: 'left', lineHeight: '1.6', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0 0 8px 8px' }}>
                            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 800 }}>
                              🔄 Understanding Score Variance in LLM-Based Evaluation
                            </h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1rem' }}>
                              If you run evaluations multiple times on the same dataset, you may observe slight changes in scores. This is expected behavior due to:
                            </p>
                            <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <li>
                                <strong>Probabilistic Judgments</strong>: Ragas does not use simple keyword matching. It prompts the judge LLM to parse answers and isolate claims. Even with the judge's temperature set to <code>0.0</code>, cloud model hosting endpoints (like Gemini) exhibit small non-deterministic behaviors due to parallel decodings.
                              </li>
                              <li>
                                <strong>Statement Extraction Ratios</strong>: The judge LLM extracts statements from the answer. If the model parses the output into 4 statements in run A, and 5 slightly different statements in run B, the fractional score (e.g., supported statements divided by total statements) will change.
                              </li>
                              <li>
                                <strong>Answer Relevancy Question Generation</strong>: To compute <em>Answer Relevance</em>, the judge LLM generates 3 synthetic questions that might lead to the generated answer, then matches them against the original query using vector embeddings. The question generation step introduces small variations.
                              </li>
                            </ol>
                            <p style={{ fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                              Recommendation: For production evaluation, run 3–5 runs and average the results to establish a baseline.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tenant Workspace Evaluation Registry (Historical Runs) */}
                      <div style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            📜 Tenant Workspace Evaluation Registry (Historical Runs)
                          </h4>
                          {selectedCompareIds.length === 2 && (
                            <button 
                              className="btn btn-primary"
                              onClick={() => setIsCompareModalOpen(true)}
                              style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Sliders size={14} /> Side-by-Side Compare (2 Runs)
                            </button>
                          )}
                        </div>
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflowX: 'auto', overflowY: 'auto', maxHeight: '255px', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', minWidth: '800px' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                                <th style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1, textAlign: 'center' }}>Compare</th>
                                <th style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>Run ID</th>
                                <th style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>Timestamp</th>
                                <th style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>Tenant Matrix Scope</th>
                                <th style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>Config Params</th>
                                <th style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>Faithfulness</th>
                                <th style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>Answer Relevancy</th>
                                <th style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>Context Precision</th>
                                <th style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>Context Recall</th>
                                <th style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>Diagnose Status</th>
                                <th style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1 }}>Download Logs</th>
                                <th style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1, textAlign: 'center' }}>Delete</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(evalRuns || []).map((run) => (
                                <tr key={run.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: selectedCompareIds.includes(String(run.id)) ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}>
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                    <input 
                                      type="checkbox"
                                      checked={selectedCompareIds.includes(String(run.id))}
                                      onChange={() => toggleCompareRun(String(run.id))}
                                      style={{ cursor: 'pointer' }}
                                    />
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{run.id}</td>
                                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{run.timestamp}</td>
                                  <td style={{ padding: '0.75rem 1rem' }}><span className="trace-badge">{(run.tenant_id || '').toUpperCase()}</span></td>
                                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    {run.params ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span>V_K: <strong>{run.params.vector_top_k}</strong></span>
                                        <span>R_K: <strong>{run.params.rerank_top_k}</strong></span>
                                        <span>Thresh: <strong>{run.params.reranker_score_threshold.toFixed(2)}</strong></span>
                                      </div>
                                    ) : (
                                      <span>Defaults</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }} className={getScoreColorClass(run.scores.faithfulness)}>
                                    {run.scores.faithfulness.toFixed(2)}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }} className={getScoreColorClass(run.scores.answer_relevance)}>
                                    {run.scores.answer_relevance.toFixed(2)}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }} className={getScoreColorClass(run.scores.context_precision)}>
                                    {run.scores.context_precision.toFixed(2)}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }} className={getScoreColorClass(run.scores.context_recall || 0)}>
                                    {(run.scores.context_recall || 0).toFixed(2)}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    {getScoreStatusBadge(Math.min(run.scores.faithfulness, run.scores.answer_relevance, run.scores.context_precision, run.scores.context_recall || 0))}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    <button 
                                      onClick={() => downloadLogsCSV(run)}
                                      className="btn-outline"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                    >
                                      📥 CSV
                                    </button>
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                    <button
                                      onClick={() => handleDeleteEvalRun(run.id)}
                                      className="btn-outline"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', height: 'auto', display: 'inline-flex', alignItems: 'center', borderColor: '#ef4444', color: '#ef4444' }}
                                      title="Delete Run"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Side-by-Side Comparison Modal */}
                      {isCompareModalOpen && selectedCompareIds.length === 2 && (() => {
                        const runA = (evalRuns || []).find(r => String(r.id) === selectedCompareIds[0]);
                        const runB = (evalRuns || []).find(r => String(r.id) === selectedCompareIds[1]);
                        if (!runA || !runB) return null;

                        const renderDelta = (valA: number, valB: number) => {
                          const diff = valB - valA;
                          if (Math.abs(diff) < 0.001) return <span style={{ color: 'var(--text-secondary)' }}>No Delta (0.00)</span>;
                          const isPos = diff > 0;
                          const pct = valA > 0 ? ((diff / valA) * 100).toFixed(1) : '0';
                          return (
                            <span style={{ 
                              fontWeight: 700, 
                              color: isPos ? '#10b981' : '#ef4444', 
                              backgroundColor: isPos ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                              fontSize: '0.8rem'
                            }}>
                              {isPos ? `↑ +${diff.toFixed(2)} (+${pct}%)` : `↓ ${diff.toFixed(2)} (${pct}%)`}
                            </span>
                          );
                        };

                        return (
                          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                            <div style={{ width: '90%', maxWidth: '850px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  📊 Side-by-Side Evaluation Metric Comparison
                                </h3>
                                <button className="btn btn-outline" onClick={() => setIsCompareModalOpen(false)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
                                  ✕ Close
                                </button>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                  <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--accent)' }}>Baseline: Run #{runA.id}</h4>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Timestamp: {runA.timestamp}</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Tenant Scope: <strong>{(runA.tenant_id || '').toUpperCase()}</strong></div>
                                </div>
                                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                  <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--accent)' }}>Target: Run #{runB.id}</h4>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Timestamp: {runB.timestamp}</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Tenant Scope: <strong>{(runB.tenant_id || '').toUpperCase()}</strong></div>
                                </div>
                              </div>

                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                <thead>
                                  <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem 1rem' }}>Quality Metric</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Run #{runA.id}</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Run #{runB.id}</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Delta (Run B vs A)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Faithfulness (Grounding)</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>{runA.scores.faithfulness.toFixed(2)}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>{runB.scores.faithfulness.toFixed(2)}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{renderDelta(runA.scores.faithfulness, runB.scores.faithfulness)}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Answer Relevancy</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>{runA.scores.answer_relevance.toFixed(2)}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>{runB.scores.answer_relevance.toFixed(2)}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{renderDelta(runA.scores.answer_relevance, runB.scores.answer_relevance)}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Context Precision</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>{runA.scores.context_precision.toFixed(2)}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>{runB.scores.context_precision.toFixed(2)}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{renderDelta(runA.scores.context_precision, runB.scores.context_precision)}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Context Recall</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>{(runA.scores.context_recall || 0).toFixed(2)}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>{(runB.scores.context_recall || 0).toFixed(2)}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{renderDelta(runA.scores.context_recall || 0, runB.scores.context_recall || 0)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Infrastructure Diagnostics Banner */}
                      <div className="telemetry-card" style={{ marginBottom: '2.5rem', padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>🔍 RAGAS Judge & Infrastructure Diagnostics</h4>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              Verify connectivity to LLM, Embeddings, Reranker, and Qdrant DB before running evaluations.
                            </p>
                          </div>
                          <button 
                            className="btn btn-outline"
                            onClick={handleTestConnectivity}
                            disabled={isTestingConnectivity}
                            style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}
                          >
                            {isTestingConnectivity ? 'Testing Connections...' : '⚡ Run Connectivity Diagnostics'}
                          </button>
                        </div>

                        {connectivityReport && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                            <div className="telemetry-item" style={{ border: connectivityReport.llm.status === 'success' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.01)' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>LLM JUDGE</span>
                              <strong style={{ fontSize: '0.85rem', color: connectivityReport.llm.status === 'success' ? '#34d399' : '#fca5a5' }}>
                                {connectivityReport.llm.status === 'success' ? '🟢 Active' : '🔴 Connection Failed'}
                              </strong>
                              <span style={{ fontSize: '0.7rem', display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={connectivityReport.llm.message}>
                                {connectivityReport.llm.message}
                              </span>
                            </div>

                            <div className="telemetry-item" style={{ border: connectivityReport.embeddings.status === 'success' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.01)' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>EMBEDDINGS ROUTER</span>
                              <strong style={{ fontSize: '0.85rem', color: connectivityReport.embeddings.status === 'success' ? '#34d399' : '#fca5a5' }}>
                                {connectivityReport.embeddings.status === 'success' ? '🟢 Connected' : '🔴 Connection Failed'}
                              </strong>
                              <span style={{ fontSize: '0.7rem', display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={connectivityReport.embeddings.message}>
                                {connectivityReport.embeddings.message}
                              </span>
                            </div>

                            <div className="telemetry-item" style={{ border: connectivityReport.reranker.status === 'success' ? '1px solid rgba(16, 185, 129, 0.25)' : connectivityReport.reranker.status === 'disabled' ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.01)' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>CROSS-ENCODER RERANKER</span>
                              <strong style={{ fontSize: '0.85rem', color: connectivityReport.reranker.status === 'success' ? '#34d399' : connectivityReport.reranker.status === 'disabled' ? '#fbbf24' : '#fca5a5' }}>
                                {connectivityReport.reranker.status === 'success' ? '🟢 Active' : connectivityReport.reranker.status === 'disabled' ? '🟡 Disabled' : '🔴 Connection Failed'}
                              </strong>
                              <span style={{ fontSize: '0.7rem', display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={connectivityReport.reranker.message}>
                                {connectivityReport.reranker.message}
                              </span>
                            </div>

                            <div className="telemetry-item" style={{ border: connectivityReport.qdrant.status === 'success' ? '1px solid rgba(16, 185, 129, 0.25)' : connectivityReport.qdrant.status === 'warning' ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.01)' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>QDRANT DB</span>
                              <strong style={{ fontSize: '0.85rem', color: connectivityReport.qdrant.status === 'success' ? '#34d399' : connectivityReport.qdrant.status === 'warning' ? '#fbbf24' : '#fca5a5' }}>
                                {connectivityReport.qdrant.status === 'success' ? '🟢 Connected' : connectivityReport.qdrant.status === 'warning' ? '🟡 DB Empty/Collection Missing' : '🔴 Connection Failed'}
                              </strong>
                              <span style={{ fontSize: '0.7rem', display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={connectivityReport.qdrant.message}>
                                {connectivityReport.qdrant.message}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="eval-setup-grid">
                        {/* Load Dataset */}
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.25rem' }}>📋 1. Load Test Dataset</h4>
                          
                          <div className="form-group">
                            <label className="form-label">Select Test Set Source</label>
                            <select 
                              className="tenant-select" 
                              value={evalSource}
                              onChange={(e: any) => setEvalSource(e.target.value)}
                            >
                              <option value="generate">Generate Synthetic Test Set (via LLM-as-a-Judge)</option>
                              <option value="upload">Upload Ground-Truth dataset (CSV)</option>
                            </select>
                          </div>

                          {evalSource === 'generate' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Number of QA pairs to synthesize</label>
                                <input 
                                  className="form-input" 
                                  type="number" 
                                  min="1" 
                                  max="10" 
                                  value={evalCount}
                                  onChange={(e) => setEvalCount(parseInt(e.target.value))}
                                />
                              </div>
                              <button 
                                className="btn btn-primary" 
                                onClick={handleGenerateTestSet}
                                disabled={isTestCaseLoading}
                                style={{ alignSelf: 'flex-start', padding: '0.6rem 1.5rem' }}
                              >
                                {isTestCaseLoading ? 'Synthesizing...' : '⚡ Synthesize QA Test Set'}
                              </button>
                              {isTestCaseLoading && synthesisStatus && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, margin: 0, textAlign: 'left' }}>
                                  ⏳ {synthesisStatus}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                              <label className="form-label">Upload Test Ground Truth CSV</label>
                              <input className="form-input" type="file" accept=".csv" />
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                CSV must contain: <code>question</code> and optionally <code>ground_truth</code> fields.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Run Benchmark */}
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.25rem' }}>🚀 2. Run Evaluation</h4>
                          
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            Dataset status: <strong>{testCases.length > 0 ? `Loaded (${testCases.length} cases)` : 'Empty'}</strong>
                          </p>

                          {testCases.length > 0 && (
                            <div className="config-expander" style={{ marginBottom: '1.25rem' }}>
                              <div 
                                className="config-expander-header" 
                                onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                              >
                                <span>🔍 Preview Loaded QA Cases</span>
                                {isPreviewExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </div>
                              {isPreviewExpanded && (
                                <div className="config-expander-content" style={{ maxHeight: '180px', overflowY: 'auto', padding: '0.75rem' }}>
                                  {(testCases || []).map((tc, idx) => (
                                    <div key={idx} style={{ fontSize: '0.8rem', padding: '0.4rem', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                      <strong>Q{idx+1}:</strong> {tc.question}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}



                          <button 
                            className="btn btn-primary btn-block"
                            onClick={handleRunEvaluation}
                            disabled={isEvaluating || testCases.length === 0}
                          >
                            {isEvaluating ? 'Evaluating Quality Scores...' : '🔥 Run Evaluation Pass'}
                          </button>

                          {isEvaluating && evalProgress && (
                            <div className="progress-container" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
                              <div className="progress-label-row">
                                <span>{evalProgress.message}</span>
                                <span>
                                  {evalProgress.phase === 'inference' 
                                    ? Math.round((evalProgress.current / (evalProgress.total || 1)) * 70) 
                                    : 85}%
                                </span>
                              </div>
                              <div className="progress-track">
                                <div className="progress-fill" style={{ 
                                  width: `${evalProgress.phase === 'inference' 
                                    ? Math.round((evalProgress.current / (evalProgress.total || 1)) * 70) 
                                    : 85}%`,
                                  transition: 'width 0.4s ease' 
                                }} />
                              </div>
                            </div>
                          )}

                          {evalResults && !isEvaluating && (
                            <div className="status-msg-box status-msg-success" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
                              🎉 RAG evaluation complete!
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 3: Assessment Dashboard & Visualizations */}
                      {evalResults && (
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2.5rem' }}>
                          <h3 className="section-title">📈 3. Assessment Dashboard & Visualizations</h3>
                          
                          {/* Columns displaying scores */}
                          <div className="eval-dashboard-grid" style={{ marginBottom: '2.5rem' }}>
                            <div className="eval-metric-card">
                              <p className="eval-metric-title">Faithfulness</p>
                              <p className={`eval-metric-value ${getScoreColorClass(evalResults.scores?.faithfulness ?? 0)}`} style={{ marginBottom: '0.5rem' }}>
                                {evalResults.scores?.faithfulness ? evalResults.scores.faithfulness.toFixed(2) : '0.00'}
                              </p>
                              {getScoreStatusBadge(evalResults.scores?.faithfulness ?? 0)}
                            </div>
                            <div className="eval-metric-card">
                              <p className="eval-metric-title">Answer Relevance</p>
                              <p className={`eval-metric-value ${getScoreColorClass(evalResults.scores?.answer_relevance ?? 0)}`} style={{ marginBottom: '0.5rem' }}>
                                {evalResults.scores?.answer_relevance ? evalResults.scores.answer_relevance.toFixed(2) : '0.00'}
                              </p>
                              {getScoreStatusBadge(evalResults.scores?.answer_relevance ?? 0)}
                            </div>
                            <div className="eval-metric-card">
                              <p className="eval-metric-title">Context Precision</p>
                              <p className={`eval-metric-value ${getScoreColorClass(evalResults.scores?.context_precision ?? 0)}`} style={{ marginBottom: '0.5rem' }}>
                                {evalResults.scores?.context_precision ? evalResults.scores.context_precision.toFixed(2) : '0.00'}
                              </p>
                              {getScoreStatusBadge(evalResults.scores?.context_precision ?? 0)}
                            </div>
                            <div className="eval-metric-card">
                              <p className="eval-metric-title">Context Recall</p>
                              <p className={`eval-metric-value ${getScoreColorClass(evalResults.scores?.context_recall ?? 0)}`} style={{ marginBottom: '0.5rem' }}>
                                {evalResults.scores?.context_recall ? evalResults.scores.context_recall.toFixed(2) : '0.00'}
                              </p>
                              {getScoreStatusBadge(evalResults.scores?.context_recall ?? 0)}
                            </div>
                          </div>

                          {/* Chart Grid and Detailed breakdown Table */}
                          <div className="eval-results-grid" style={{ marginBottom: '2.5rem', alignItems: 'stretch' }}>
                            
                            {/* Inline SVG Chart */}
                            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.5rem', boxShadow: 'var(--card-shadow)' }}>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1.25rem' }}>📊 Metric Comparison Chart</h4>
                              <svg width="100%" height="220" viewBox="0 0 500 240" style={{ overflow: 'visible' }}>
                                <line x1="50" y1="30" x2="450" y2="30" stroke="var(--border-color)" strokeDasharray="4" />
                                <text x="35" y="35" fontSize="10" fill="var(--text-secondary)" textAnchor="end">1.0</text>
                                
                                <line x1="50" y1="110" x2="450" y2="110" stroke="var(--border-color)" strokeDasharray="4" />
                                <text x="35" y="115" fontSize="10" fill="var(--text-secondary)" textAnchor="end">0.5</text>
                                
                                <line x1="50" y1="190" x2="450" y2="190" stroke="var(--border-color)" strokeWidth="1" />
                                <text x="35" y="195" fontSize="10" fill="var(--text-secondary)" textAnchor="end">0.0</text>

                                {/* Faithfulness bar */}
                                <rect 
                                  x="80" 
                                  y={190 - (evalResults.scores?.faithfulness || 0) * 160} 
                                  width="50" 
                                  height={(evalResults.scores?.faithfulness || 0) * 160} 
                                  fill="#5b58e7" 
                                  rx="4"
                                />
                                <text x="105" y={185 - (evalResults.scores?.faithfulness || 0) * 160} fontSize="11" fontWeight="bold" fill="var(--text-primary)" textAnchor="middle">
                                  {(evalResults.scores?.faithfulness || 0).toFixed(2)}
                                </text>
                                <text x="105" y="210" fontSize="9" fontWeight="700" fill="var(--text-secondary)" textAnchor="middle">Faithfulness</text>

                                {/* Answer Relevance bar */}
                                <rect 
                                  x="180" 
                                  y={190 - (evalResults.scores?.answer_relevance || 0) * 160} 
                                  width="50" 
                                  height={(evalResults.scores?.answer_relevance || 0) * 160} 
                                  fill="#5b58e7" 
                                  rx="4"
                                />
                                <text x="205" y={185 - (evalResults.scores?.answer_relevance || 0) * 160} fontSize="11" fontWeight="bold" fill="var(--text-primary)" textAnchor="middle">
                                  {(evalResults.scores?.answer_relevance || 0).toFixed(2)}
                                </text>
                                <text x="205" y="210" fontSize="9" fontWeight="700" fill="var(--text-secondary)" textAnchor="middle">Answer Relevance</text>

                                {/* Context Precision bar */}
                                <rect 
                                  x="280" 
                                  y={190 - (evalResults.scores?.context_precision || 0) * 160} 
                                  width="50" 
                                  height={(evalResults.scores?.context_precision || 0) * 160} 
                                  fill="#5b58e7" 
                                  rx="4"
                                />
                                <text x="305" y={185 - (evalResults.scores?.context_precision || 0) * 160} fontSize="11" fontWeight="bold" fill="var(--text-primary)" textAnchor="middle">
                                  {(evalResults.scores?.context_precision || 0).toFixed(2)}
                                </text>
                                <text x="305" y="210" fontSize="9" fontWeight="700" fill="var(--text-secondary)" textAnchor="middle">Context Precision</text>

                                {/* Context Recall bar */}
                                <rect 
                                  x="380" 
                                  y={190 - (evalResults.scores?.context_recall || 0) * 160} 
                                  width="50" 
                                  height={(evalResults.scores?.context_recall || 0) * 160} 
                                  fill="#5b58e7" 
                                  rx="4"
                                />
                                <text x="405" y={185 - (evalResults.scores?.context_recall || 0) * 160} fontSize="11" fontWeight="bold" fill="var(--text-primary)" textAnchor="middle">
                                  {(evalResults.scores?.context_recall || 0).toFixed(2)}
                                </text>
                                <text x="405" y="210" fontSize="9" fontWeight="700" fill="var(--text-secondary)" textAnchor="middle">Context Recall</text>
                              </svg>
                            </div>

                            {/* Evaluation Summary Guidance */}
                            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.5rem', boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>Evaluation Summary Guidance</h4>
                              {(() => {
                                const faith = evalResults.scores?.faithfulness ?? 1.0;
                                const rel = evalResults.scores?.answer_relevance ?? 1.0;
                                const prec = evalResults.scores?.context_precision ?? 1.0;
                                const recall = evalResults.scores?.context_recall ?? 1.0;
                                
                                const failures: string[] = [];
                                const warnings: string[] = [];
                                
                                // Core metrics boundary audits
                                if (faith < 0.70) {
                                  failures.push("Faithfulness");
                                } else if (faith < 0.85) {
                                  warnings.push("Faithfulness");
                                }
                                
                                if (rel < 0.70) {
                                  failures.push("Answer Relevance");
                                } else if (rel < 0.85) {
                                  warnings.push("Answer Relevance");
                                }
                                
                                if (prec < 0.70) {
                                  failures.push("Context Precision");
                                } else if (prec < 0.85) {
                                  warnings.push("Context Precision");
                                }
                                
                                if (recall < 0.70) {
                                  failures.push("Context Recall");
                                } else if (recall < 0.85) {
                                  warnings.push("Context Recall");
                                }

                                let bannerClass = "status-msg-success";
                                let bannerColor = "#10b981";
                                let bannerBg = "rgba(16, 185, 129, 0.08)";
                                let bannerTitle = "Robust Pipeline Performance";
                                let bannerDesc = "Your RAG pipeline exhibits high grounding accuracy, correct contextual coverage, and precise answer alignment.";
                                
                                if (failures.length > 0) {
                                  bannerClass = "status-msg-error";
                                  bannerColor = "#ef4444";
                                  bannerBg = "rgba(239, 68, 68, 0.08)";
                                  bannerTitle = "Action Required: Core Failures Detected";
                                  
                                  const failureDescriptions = (failures || []).map(f => {
                                    if (f === "Faithfulness") {
                                      return "Warning: Low Faithfulness detected. The LLM is generating responses that are not fully grounded in or verified by the retrieved context chunks (hallucinations present). Consider using more specific system prompts.";
                                    }
                                    if (f === "Answer Relevance") {
                                      return "Warning: Low Answer Relevance detected. The generated response does not directly address the user's question, indicating formatting discrepancies or LLM drift.";
                                    }
                                    if (f === "Context Precision") {
                                      return "Warning: Low Context Precision detected. Your LLM is receiving too much noise in its prompt window. Consider increasing query fetch depth or adjusting chunk boundaries.";
                                    }
                                    if (f === "Context Recall") {
                                      return "Warning: Low Context Recall detected. The vector search is failing to retrieve all relevant source documents required to answer the prompt. Try reducing chunk overlaps or checking parsing outputs.";
                                    }
                                    return "";
                                  }).filter(Boolean);
                                  
                                  bannerDesc = failureDescriptions.join(" ");
                                } else if (warnings.length > 0) {
                                  bannerClass = "status-msg-warning";
                                  bannerColor = "#f59e0b";
                                  bannerBg = "rgba(245, 158, 11, 0.08)";
                                  bannerTitle = "Warning: Marginal Performance Identified";
                                  
                                  const warningDescriptions = (warnings || []).map(w => {
                                    if (w === "Faithfulness") {
                                      return "Faithfulness is marginal. There are subtle grounding gaps in LLM output.";
                                    }
                                    if (w === "Answer Relevance") {
                                      return "Answer Relevance is marginal. The model outputs conversational padding or slightly off-topic details.";
                                    }
                                    if (w === "Context Precision") {
                                      return "Context Precision is marginal. Re-ranked candidate order could be optimized to prioritize the most relevant snippets.";
                                    }
                                    if (w === "Context Recall") {
                                      return "Context Recall is marginal. Increase Top-K or chunk partition density to capture more source facts.";
                                    }
                                    return "";
                                  }).filter(Boolean);
                                  
                                  bannerDesc = warningDescriptions.join(" ");
                                }
                                
                                return (
                                  <div className={`status-msg-box ${bannerClass}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', margin: 0, padding: '1rem', backgroundColor: bannerBg, border: `1px solid ${bannerColor}`, borderRadius: '8px' }}>
                                    {failures.length > 0 ? (
                                      <XCircle size={18} style={{ color: bannerColor, flexShrink: 0, marginTop: '0.1rem' }} />
                                    ) : warnings.length > 0 ? (
                                      <AlertTriangle size={18} style={{ color: bannerColor, flexShrink: 0, marginTop: '0.1rem' }} />
                                    ) : (
                                      <CheckCircle size={18} style={{ color: bannerColor, flexShrink: 0, marginTop: '0.1rem' }} />
                                    )}
                                    <div style={{ textAlign: 'left' }}>
                                      <p style={{ fontSize: '0.88rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: bannerColor }}>
                                        {bannerTitle}
                                      </p>
                                      <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                        {bannerDesc}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                          </div>

                          {/* Collapsible Expander for Detailed Performance Table, Logs, and Reference Guide */}
                          <div className="config-expander" style={{ marginTop: '2.5rem' }}>
                            <div 
                              className="config-expander-header" 
                              onClick={() => setIsDetailedMetricsExpanded(!isDetailedMetricsExpanded)}
                            >
                              <span>🔍 View Detailed Row-by-Row Evaluation Metrics & Interpretation Reference Guide</span>
                              {isDetailedMetricsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>
                            {isDetailedMetricsExpanded && (
                              <div className="config-expander-content" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0 0 8px 8px' }}>
                                
                                {/* Row-by-Row performance Breakdown */}
                                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', textAlign: 'left' }}>Detailed Row-by-Row Evaluation Metrics</h4>
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflowX: 'auto', backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)', marginBottom: '1.5rem' }}>
                                  <table style={{ margin: 0, width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ width: '60px', textAlign: 'center', padding: '0.75rem' }}>Index</th>
                                        <th style={{ padding: '0.75rem' }}>user_input</th>
                                        <th style={{ padding: '0.75rem' }}>retrieved_contexts</th>
                                        <th style={{ padding: '0.75rem' }}>response</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {evalResults.raw_dataframe?.map((row: any, rIdx: number) => (
                                        <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                          <td style={{ fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-secondary)', padding: '0.75rem' }}>{rIdx}</td>
                                          <td style={{ fontSize: '0.8rem', maxWidth: '240px', wordBreak: 'break-word', verticalAlign: 'top', padding: '0.75rem' }}>
                                            {row.user_input || row.question}
                                          </td>
                                          <td style={{ fontSize: '0.78rem', maxWidth: '300px', wordBreak: 'break-word', verticalAlign: 'top', color: 'var(--text-secondary)', padding: '0.75rem' }}>
                                            {Array.isArray(row.retrieved_contexts) ? row.retrieved_contexts.join(" \n\n ") : row.retrieved_contexts || row.contexts || "N/A"}
                                          </td>
                                          <td style={{ fontSize: '0.8rem', maxWidth: '280px', wordBreak: 'break-word', verticalAlign: 'top', padding: '0.75rem' }}>
                                            {row.response || row.answer}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Actions utility panel */}
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
                                  <button 
                                    className="btn btn-secondary"
                                    onClick={downloadEvaluationCSV}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                                  >
                                    📥 Download Detailed Evaluation Logs (CSV)
                                  </button>
                                </div>

                                {/* Reference Guide Expander (nested) */}
                                <div className="config-expander">
                                  <div 
                                    className="config-expander-header" 
                                    onClick={() => setIsInterpretExpanded(!isInterpretExpanded)}
                                  >
                                    <span>📚 Reference Guide: How to Interpret RAG Benchmark Scores</span>
                                    {isInterpretExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </div>
                                  {isInterpretExpanded && (
                                    <div className="config-expander-content" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0 0 8px 8px' }}>
                                      <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        🎯 Performance Benchmarks Reference Table
                                      </h4>
                                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', textAlign: 'left' }}>
                                        RAG metric scores are calculated on a scale from 0.00 to 1.00:
                                      </p>
                                      
                                      <div style={{ overflowX: 'auto' }}>
                                        <table style={{ margin: 0, width: '100%', minWidth: '600px' }}>
                                          <thead>
                                            <tr>
                                              <th>Score Range</th>
                                              <th>Performance Tier</th>
                                              <th>Interpretation</th>
                                              <th>Action Required</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr>
                                              <td style={{ fontWeight: 700 }}>0.85 - 1.00</td>
                                              <td style={{ fontWeight: 600, color: '#10b981' }}>🟢 Production-Ready</td>
                                              <td style={{ fontSize: '0.82rem' }}>Exceptionally high quality. LLM is strictly grounded and context matches are accurate.</td>
                                              <td style={{ fontSize: '0.82rem' }}>None. Maintain system parameters.</td>
                                            </tr>
                                            <tr>
                                              <td style={{ fontWeight: 700 }}>0.70 - 0.84</td>
                                              <td style={{ fontWeight: 600, color: '#f59e0b' }}>🟡 Good / Tuneable</td>
                                              <td style={{ fontSize: '0.82rem' }}>Reliable, but exhibits minor gaps in fact coverage or slight irrelevant information.</td>
                                              <td style={{ fontSize: '0.82rem' }}>Fine-tune chunk sizes, system prompts, or parameters.</td>
                                            </tr>
                                            <tr>
                                              <td style={{ fontWeight: 700 }}>0.00 - 0.69</td>
                                              <td style={{ fontWeight: 600, color: '#ef4444' }}>🔴 Action Required</td>
                                              <td style={{ fontSize: '0.82rem' }}>Systemic hallucination or retrieval gaps detected. Context mismatch or answers deviate from ground truth.</td>
                                              <td style={{ fontSize: '0.82rem' }}>Audit ingestion pipeline, optimize semantic parsing, or inspect LLM configuration.</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>

                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  )}
    </div>
  );
};
