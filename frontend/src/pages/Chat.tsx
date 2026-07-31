// @ts-nocheck

import React from 'react';
import { Cpu, Send, User } from 'lucide-react';
import { useAppLogic } from '../useAppLogic';
import { parseMarkdownToHtml } from '../utils';

export const Chat = () => {
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
    chatBottomRef,
  } = useAppLogic();

  return (
    <div>
      {!currentTenant ? (
        <div className="status-msg-box status-msg-warning">
          ⚠️ No active workspace scope focused. Select a workspace partition inside the left panel first.
        </div>
      ) : (
        <div>
          <h3 className="section-title">💬 MyGPT - Non RAG - RAG search is disabled in this tab. Ask me anything.</h3>
          <div className="info-callout">
            <p className="info-callout-title">Non-RAG Direct Model Inference</p>
            This playground bypasses Qdrant context lookups and executes direct inference with the LLM API using custom adapter matrices configuration profiles. Useful for testing raw generation alignment and basic prompts.
          </div>

          <div className="chat-container">
            <div className="chat-messages">
              <div className="chat-row chat-row-assistant">
                <div className="chat-row-inner">
                  <div className="avatar-badge avatar-badge-assistant" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)' }}>
                    <Cpu size={16} />
                  </div>
                  <div className="message-content">
                    🤖 Welcome to <strong>MyGPT</strong>. RAG search is disabled in this tab. Ask me anything.
                  </div>
                </div>
              </div>
              
              {(chatHistory[currentTenant] || []).map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`chat-row ${msg.role === 'user' ? 'chat-row-user' : 'chat-row-assistant'}`}
                >
                  <div className="chat-row-inner">
                    <div className={`avatar-badge ${msg.role === 'user' ? 'avatar-badge-user' : 'avatar-badge-assistant'}`} style={msg.role === 'assistant' ? { background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)' } : undefined}>
                      {msg.role === 'user' ? <User size={16} /> : <Cpu size={16} />}
                    </div>
                    <div 
                      className="message-content" 
                      dangerouslySetInnerHTML={{ 
                        __html: msg.role === 'assistant'
                          ? parseMarkdownToHtml(msg.content)
                          : msg.content
                      }}
                    />
                  </div>
                </div>
              ))}
              
              {isChatting && (
                <div className="chat-row chat-row-assistant" style={{ opacity: 0.6 }}>
                  <div className="chat-row-inner">
                    <div className="avatar-badge avatar-badge-assistant" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)' }}>
                      <Cpu size={16} />
                    </div>
                    <div className="message-content">
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div className="chat-input-wrapper">
              <div className="chat-input-capsule">
                <textarea 
                  rows={1}
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                  }}
                  placeholder="Message MyGPT... (Shift + Enter for multi-line)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  disabled={isChatting}
                />
                <button 
                  className="btn btn-primary"
                  onClick={handleSendChat}
                  disabled={isChatting}
                  style={{ padding: '0.5rem 1.2rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}
                >
                  <Send size={14} /> Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
