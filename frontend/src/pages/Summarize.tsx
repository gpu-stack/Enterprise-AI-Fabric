// @ts-nocheck

import React from 'react';
import { useAppLogic } from '../useAppLogic';

export const Summarize = () => {
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
    getRerankerLabel
  } = useAppLogic();

  return (
    <div className="summarizer-layout">
      {/* Left Column: Form */}
      <div>
        <h3 className="section-title">📝 Document Summarization Console</h3>
        <div className="info-callout">
          <p className="info-callout-title">Automated Document Summarizer</p>
          Upload files (PDF, Word, Excel sheets) to construct structured executive briefs. Summaries are built by analyzing layouts and visual elements to condense content accurately.
        </div>

        <form onSubmit={handleSummarizeSubmit}>
          <div className="form-group">
            <label className="form-label">Upload Analysis Target</label>
            <input 
              className="form-input"
              type="file"
              accept=".pdf,.docx,.xlsx,.xls"
              onChange={(e) => {
                if (e.target.files) setSumFile(e.target.files[0]);
              }}
            />
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Summary Depth Level</label>
              <select 
                className="tenant-select"
                value={sumLength}
                onChange={(e) => setSumLength(e.target.value)}
              >
                <option value="Brief & Concise">Brief & Concise</option>
                <option value="Standard Medium">Standard Medium</option>
                <option value="Deep & Highly Detailed">Deep & Highly Detailed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max Token Length</label>
              <input 
                className="form-input"
                type="number"
                min="256"
                max="8192"
                value={sumMaxTokens}
                onChange={(e) => setSumMaxTokens(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <button 
            className="btn btn-primary btn-block"
            type="submit"
            disabled={isSummarizing || !sumFile}
            style={{ marginTop: '0.5rem' }}
          >
            {isSummarizing ? '🧠 Generating summary...' : '⚡ Generate Summary'}
          </button>
        </form>
      </div>

      {/* Right Column: Output */}
      <div>
        {isSummarizing && (
          <div className="status-msg-box status-msg-warning">
            🧠 Reading layout formats and writing summary structures...
          </div>
        )}

        {summaryResult ? (
          <div style={{ marginTop: 0 }}>
            {summaryResult.status === 'success' ? (
              <>
                <h3 className="section-title">📋 Executive Summary Output</h3>
                <div className="answer-card" style={{ textAlign: 'left' }}>
                  <div dangerouslySetInnerHTML={{ __html: summaryResult.summary?.replace(/\n/g, '<br/>') }} />
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Total latency: <strong>{summaryResult.latency_seconds} seconds</strong>
                </p>
              </>
            ) : (
              <div className="status-msg-box status-msg-error">
                {summaryResult.message}
              </div>
            )}
          </div>
        ) : (
          !isSummarizing && (
            <div className="status-msg-box status-msg-warning" style={{ margin: 0 }}>
              No summary generated yet. Select a file on the left and run analysis.
            </div>
          )
        )}
      </div>
    </div>
  );
};
