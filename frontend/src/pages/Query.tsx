// @ts-nocheck

import React from 'react';
import { BarChart2, Cpu, RefreshCw, Send, User } from 'lucide-react';
import { useAppLogic } from '../useAppLogic';
import { parseMarkdownToHtml } from '../utils';

export const Query = () => {
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
    chatBottomRef,
  } = useAppLogic();

  return (
    <div>
      {!currentTenant ? (
        <div className="status-msg-box status-msg-warning">
          ⚠️ No active workspace scope focused. Select a workspace scope in the sidebar partition panel.
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>🔍 Grounded RAG Play space</h3>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-outline"
                onClick={() => setShowTracePanel(!showTracePanel)}
                style={{ fontSize: '0.82rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: showTracePanel ? 'var(--accent)' : undefined, color: showTracePanel ? 'var(--text-primary)' : undefined }}
              >
                <BarChart2 size={14} /> {showTracePanel ? 'Hide Query Trace' : 'Show Query Trace'}
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                style={{ fontSize: '0.82rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                ⚙️ {isPreviewExpanded ? 'Hide Parameters' : 'Parameters'}
              </button>
            </div>
          </div>

          {isPreviewExpanded && (
            <div className="info-callout" style={{ padding: '1.25rem', marginBottom: '1.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>🔧 System Grounding Tuning Parameters</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Model Temperature (0.0 = Precise / 1.0 = Creative)</label>
                  <input 
                    className="form-input" 
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={queryTemp}
                    onChange={(e) => setQueryTemp(parseFloat(e.target.value))}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Top-K Context Node Retrieval Limit</label>
                  <input 
                    className="form-input" 
                    type="number"
                    min="1"
                    max="10"
                    value={queryTopK}
                    onChange={(e) => setQueryTopK(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1.5rem', width: '100%', alignItems: 'stretch' }}>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div className="chat-container">
                <div className="chat-messages">
                  <div className="chat-row chat-row-assistant">
                    <div className="chat-row-inner">
                      <div className="avatar-badge avatar-badge-assistant" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)' }}>
                        <Cpu size={16} />
                      </div>
                      <div className="message-content">
                        🤖 Welcome to the <strong>Grounded RAG Play space</strong>. Ask me any question, and I will search your workspace vector index, perform Cross-Encoder reranking, and synthesize a fully cited response.
                      </div>
                    </div>
                  </div>

                  {(ragChatHistory[currentTenant] || []).map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`chat-row ${msg.role === 'user' ? 'chat-row-user' : 'chat-row-assistant'}`}
                    >
                      <div className="chat-row-inner">
                        <div className={`avatar-badge ${msg.role === 'user' ? 'avatar-badge-user' : 'avatar-badge-assistant'}`} style={msg.role === 'assistant' ? { background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)' } : undefined}>
                          {msg.role === 'user' ? <User size={16} /> : <Cpu size={16} />}
                        </div>
                        <div className="message-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: msg.role === 'assistant' 
                                ? parseMarkdownToHtml(msg.content)
                                : msg.content
                            }} 
                          />
                          {msg.role === 'assistant' && (msg.latency !== undefined || msg.telemetry || (msg.context_nodes && msg.context_nodes.length > 0)) && (
                            <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                              {msg.latency !== undefined && (
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
                                  ⏱️ Latency: <strong>{msg.latency}s</strong> | Prompt tokens: <strong>{msg.tokens?.prompt_tokens || 0}</strong> | Completion tokens: <strong>{msg.tokens?.completion_tokens || 0}</strong>
                                </p>
                              )}
                              {msg.telemetry && (
                                <div style={{ marginTop: '0.5rem', borderTop: '1px dotted var(--border-color)', paddingTop: '0.5rem' }}>
                                  <details style={{ cursor: 'pointer' }}>
                                    <summary style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                      🛠️ System Diagnostics
                                    </summary>
                                    <div style={{ 
                                      display: 'grid', 
                                      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
                                      gap: '0.5rem', 
                                      marginTop: '0.5rem',
                                      padding: '0.5rem',
                                      backgroundColor: 'rgba(0,0,0,0.02)',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-color)'
                                    }}>
                                      <div style={{ fontSize: '0.7rem', color: msg.telemetry.embedding_ms > 300 ? '#f59e0b' : 'var(--text-primary)' }}>
                                        <strong>Embedding Latency:</strong> {msg.telemetry.embedding_ms.toFixed(1)} ms
                                      </div>
                                      <div style={{ fontSize: '0.7rem', color: msg.telemetry.qdrant_ms > 100 ? '#f59e0b' : 'var(--text-primary)' }}>
                                        <strong>DB Lookup:</strong> {msg.telemetry.qdrant_ms.toFixed(1)} ms
                                      </div>
                                      <div style={{ fontSize: '0.7rem', color: msg.telemetry.rerank_ms > 300 ? '#f59e0b' : 'var(--text-primary)' }}>
                                        <strong>Reranker Latency:</strong> {msg.telemetry.rerank_ms.toFixed(1)} ms
                                      </div>
                                      <div style={{ fontSize: '0.7rem', color: msg.telemetry.ttft_ms > 500 ? '#f59e0b' : 'var(--text-primary)' }}>
                                        <strong>vLLM TTFT:</strong> {msg.telemetry.ttft_ms.toFixed(1)} ms
                                      </div>
                                    </div>
                                  </details>
                                </div>
                              )}
                              {msg.context_nodes && msg.context_nodes.length > 0 && (
                                <div style={{ marginTop: '0.5rem', borderTop: '1px dotted var(--border-color)', paddingTop: '0.5rem' }}>
                                  <details style={{ cursor: 'pointer' }}>
                                    <summary style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                      📂 Context Audit
                                    </summary>
                                    {msg.raw_context_block && (
                                      <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                                        <details style={{ cursor: 'pointer' }}>
                                          <summary style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                            📄 View Raw Context Input Block (Sent to vLLM)
                                          </summary>
                                          <pre style={{ 
                                            marginTop: '0.25rem',
                                            padding: '0.5rem',
                                            fontSize: '0.65rem',
                                            backgroundColor: 'var(--bg-secondary, rgba(0,0,0,0.02))',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '4px',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            color: 'var(--text-primary)'
                                          }}>
                                            {msg.raw_context_block}
                                          </pre>
                                        </details>
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                      {(msg.context_nodes || []).map((node: any, nIdx: number) => {
                                        const isSelected = node.selected;
                                        return (
                                          <div 
                                            key={nIdx} 
                                            style={{
                                              padding: '0.6rem 0.8rem',
                                              fontSize: '0.7rem',
                                              backgroundColor: isSelected ? 'var(--bg-card, #ffffff)' : 'rgba(0,0,0,0.02)',
                                              border: '1px solid var(--border-color, #e4e4e7)',
                                              borderRadius: '6px',
                                              opacity: isSelected ? 1.0 : 0.45
                                            }}
                                          >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '0.25rem', textDecoration: isSelected ? 'none' : 'line-through' }}>
                                              <span>📄 {node.source} (Page: {node.page})</span>
                                              <span style={{ color: isSelected ? 'var(--accent, #f39c12)' : 'var(--text-secondary)' }}>
                                                Score: {node.score.toFixed(4)} {isSelected ? ' [ACCEPTED]' : ' [DISCARDED]'}
                                              </span>
                                            </div>
                                            <div style={{ 
                                              fontSize: '0.68rem', 
                                              color: 'var(--text-secondary)',
                                              lineHeight: '1.4',
                                              whiteSpace: 'pre-wrap'
                                            }}>
                                              {node.text}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </details>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isQuerying && (
                    <div className="chat-row chat-row-assistant" style={{ opacity: 0.6 }}>
                      <div className="chat-row-inner">
                        <div className="avatar-badge avatar-badge-assistant" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)' }}>
                          <Cpu size={16} />
                        </div>
                        <div className="message-content">
                          Thinking... Context search and reranker models active...
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <div className="chat-input-wrapper">
                  <div className="chat-input-capsule">
                    <input 
                      type="text"
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      placeholder="Ask a question about the active workspace index..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuerySubmit();
                      }}
                      disabled={isQuerying}
                    />
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleQuerySubmit()}
                      disabled={isQuerying}
                      style={{ padding: '0.4rem 1.2rem', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Send size={14} /> Send
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {showTracePanel && (
              <div className="query-trace-drawer">
                <h4 className="trace-title"><BarChart2 size={16} /> Query Execution Trace</h4>
                {isQuerying ? (
                  <div className="trace-loading-state">
                    <RefreshCw size={18} className="spin-animation" style={{ color: 'var(--accent)' }} />
                    <span>Collecting execution trace logs...</span>
                  </div>
                ) : (() => {
                  const lastMsg = getLatestAssistantMessage();
                  if (!lastMsg) {
                    return (
                      <div className="trace-empty-state">
                        No query executed yet in this tenant partition. Fire a query to begin trace collection.
                      </div>
                    );
                  }
                  
                  const promptTokens = lastMsg.tokens?.prompt_tokens || 0;
                  const completionTokens = lastMsg.tokens?.completion_tokens || 0;
                  const percent = Math.min(100, Math.round((promptTokens / 8192) * 100));
                  
                  const hasTelemetry = !!lastMsg.telemetry;
                  const ttft = hasTelemetry ? Math.round(lastMsg.telemetry.ttft_ms) : Math.round((lastMsg.latency || 0) * 1000 * 0.18) || 160;
                  const velocity = hasTelemetry && lastMsg.telemetry.generation_ms && completionTokens 
                    ? Math.round((completionTokens / (lastMsg.telemetry.generation_ms / 1000.0))) 
                    : (lastMsg.latency && completionTokens ? Math.round(completionTokens / (lastMsg.latency * 0.85)) : 0);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div>
                        <h5 className="trace-section-title">🔍 Retrieval Analytics</h5>
                        {lastMsg.citations && lastMsg.citations.length > 0 ? (
                          (lastMsg.citations || []).map((c: any, cIdx: number) => (
                            <div className="trace-chunk-card" key={cIdx}>
                              <div className="trace-chunk-title">📄 {c.source}</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Page: {c.page}</div>
                              <div className="trace-badge-row">
                                <span className="trace-badge trace-badge-accent">Score: {c.score.toFixed(4)}</span>
                                <span className="trace-badge">Rank: #{cIdx + 1}</span>
                                <span className="trace-badge">{currentTenant.toUpperCase()}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No retrieved contexts used.</div>
                        )}
                      </div>

                      <div>
                        <h5 className="trace-section-title">📊 Context Budget Meter</h5>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          <span>Retrieved Text payload</span>
                          <span>{promptTokens} / 8192 tokens ({percent}%)</span>
                        </div>
                        <div className="budget-meter-container">
                          <div className="budget-meter-bar" style={{ width: `${percent}%` }} />
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.8 }}>Allocated context buffer window limit</span>
                      </div>

                      <div>
                        <h5 className="trace-section-title">⏱️ Inference Timing</h5>
                        <div className="trace-metric-row">
                          <span className="trace-metric-label">Time to First Token</span>
                          <span className="trace-metric-value">{ttft} ms</span>
                        </div>
                        <div className="trace-metric-row">
                          <span className="trace-metric-label">Generation Velocity</span>
                          <span className="trace-metric-value">{velocity} tokens/s</span>
                        </div>
                        <div className="trace-metric-row" style={{ borderBottom: hasTelemetry ? '1px solid var(--border-color)' : 'none' }}>
                          <span className="trace-metric-label">Tokens Budget Distribution</span>
                          <span className="trace-badge trace-badge-accent" style={{ fontSize: '0.7rem' }}>
                            Input: {promptTokens} | Output: {completionTokens}
                          </span>
                        </div>
                        
                        {hasTelemetry && (
                          <div style={{ marginTop: '1.25rem' }}>
                            <h5 className="trace-section-title" style={{ marginBottom: '0.75rem' }}>⛓️ Pipeline Step Latencies</h5>
                            <div className="trace-metric-row">
                              <span className="trace-metric-label">Pre-processing</span>
                              <span className="trace-metric-value">{lastMsg.telemetry.pre_processing_ms.toFixed(1)} ms</span>
                            </div>
                            <div className="trace-metric-row">
                              <span className="trace-metric-label">Embedding Gen (TEI CPU)</span>
                              <span className="trace-metric-value">{lastMsg.telemetry.embedding_ms.toFixed(1)} ms</span>
                            </div>
                            <div className="trace-metric-row">
                              <span className="trace-metric-label">Vector search (Qdrant)</span>
                              <span className="trace-metric-value">{lastMsg.telemetry.qdrant_ms.toFixed(1)} ms</span>
                            </div>
                            <div className="trace-metric-row">
                              <span className="trace-metric-label">Reranking (TEI GPU)</span>
                              <span className="trace-metric-value">{lastMsg.telemetry.rerank_ms.toFixed(1)} ms</span>
                            </div>
                            <div className="trace-metric-row" style={{ borderBottom: 'none' }}>
                              <span className="trace-metric-label">vLLM Generation</span>
                              <span className="trace-metric-value">{lastMsg.telemetry.generation_ms.toFixed(1)} ms</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
