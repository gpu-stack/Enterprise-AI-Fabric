// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Shield, Sliders, Cpu, AlertTriangle, XCircle, CheckCircle, Trash2, Server, RefreshCw } from "lucide-react";
import { useAppLogic } from "../useAppLogic";

export const Settings = () => {
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
    isQdrantOnline,
    isTeiOnline,
    isRerankerOnline,
    isLlmOnline,
  } = useAppLogic();

  const [activeSettingsTab, setActiveSettingsTab] = useState('workspaces');

  const [promptTenant, setPromptTenant] = useState<string>(currentTenant || 'hr_support_v2');
  const [activePromptText, setActivePromptText] = useState<string>('');
  const [promptNote, setPromptNote] = useState<string>('');
  const [promptRecord, setPromptRecord] = useState<any>(null);
  const [isPromptLoading, setIsPromptLoading] = useState<boolean>(false);
  const [promptMsg, setPromptMsg] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');

  const fetchTenantPrompt = async (tenantId: string) => {
    if (!tenantId) return;
    setIsPromptLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/prompt`);
      const data = await res.json();
      setPromptRecord(data);
      setActivePromptText(data.current_prompt || '');
    } catch (e) {
      console.error("Failed to fetch tenant prompt", e);
    } finally {
      setIsPromptLoading(false);
    }
  };

  useEffect(() => {
    if (promptTenant) {
      fetchTenantPrompt(promptTenant);
    }
  }, [promptTenant]);

  const handleSavePrompt = async () => {
    if (!promptTenant || !activePromptText.trim()) return;
    setPromptMsg(null);
    try {
      const res = await fetch(`/api/tenants/${promptTenant}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_prompt: activePromptText, note: promptNote })
      });
      const data = await res.json();
      if (res.ok) {
        setPromptRecord(data);
        setActivePromptText(data.current_prompt || '');
        setPromptNote('');
        setPromptMsg({ message: `Successfully deployed new prompt version (${data.version || 'v2.0'}) for tenant '${promptTenant}'.`, type: 'success' });
      } else {
        setPromptMsg({ message: data.detail || 'Failed to update prompt.', type: 'error' });
      }
    } catch (e: any) {
      setPromptMsg({ message: e.message || 'Error saving prompt.', type: 'error' });
    }
  };

  const handleRollbackPrompt = async (version: string, updatedAt?: string) => {
    if (!confirm(`Are you sure you want to rollback tenant '${promptTenant}' system prompt to version ${version}?`)) return;
    setPromptMsg(null);
    try {
      const res = await fetch(`/api/tenants/${promptTenant}/prompt/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, updated_at: updatedAt })
      });
      const data = await res.json();
      if (res.ok) {
        setPromptRecord(data);
        setActivePromptText(data.current_prompt || '');
        setPromptMsg({ message: `Successfully rolled back system prompt to version ${version}.`, type: 'success' });
      } else {
        setPromptMsg({ message: data.detail || 'Rollback failed.', type: 'error' });
      }
    } catch (e: any) {
      setPromptMsg({ message: e.message || 'Error rolling back prompt.', type: 'error' });
    }
  };

  const handleDeletePromptHistory = async (version: string, updatedAt?: string) => {
    if (!confirm(`Are you sure you want to delete history entry for version ${version}?`)) return;
    setPromptMsg(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('version', version);
      if (updatedAt) queryParams.append('updated_at', updatedAt);

      const res = await fetch(`/api/tenants/${promptTenant}/prompt/history?${queryParams.toString()}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setPromptRecord(data);
        setPromptMsg({ message: `Successfully deleted history entry for version ${version}.`, type: 'success' });
      } else {
        setPromptMsg({ message: data.detail || 'Delete failed.', type: 'error' });
      }
    } catch (e: any) {
      setPromptMsg({ message: e.message || 'Error deleting history entry.', type: 'error' });
    }
  };

  const handleSaveHistoryNote = async (version: string, updatedAt?: string) => {
    setPromptMsg(null);
    try {
      const res = await fetch(`/api/tenants/${promptTenant}/prompt/history/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, updated_at: updatedAt, note: editingNoteText })
      });
      const data = await res.json();
      if (res.ok) {
        setPromptRecord(data);
        setEditingNoteKey(null);
        setEditingNoteText('');
        setPromptMsg({ message: `Successfully updated comment for version ${version}.`, type: 'success' });
      } else {
        setPromptMsg({ message: data.detail || 'Note update failed.', type: 'error' });
      }
    } catch (e: any) {
      setPromptMsg({ message: e.message || 'Error updating note.', type: 'error' });
    }
  };

  const [integrityData, setIntegrityData] = useState<any>(null);
  const [isTestingIntegrity, setIsTestingIntegrity] = useState<boolean>(false);

  const runIntegrityCheck = async () => {
    setIsTestingIntegrity(true);
    try {
      const res = await fetch('/api/system/integrity');
      const data = await res.json();
      setIntegrityData(data);
    } catch (e: any) {
      console.error("Integrity check failed:", e);
    } finally {
      setIsTestingIntegrity(false);
    }
  };

  const tabStyle = (tabName) => ({
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    borderBottom: activeSettingsTab === tabName ? '2px solid var(--accent)' : '2px solid transparent',
    color: activeSettingsTab === tabName ? 'var(--accent)' : 'var(--text-secondary)',
    fontWeight: activeSettingsTab === tabName ? '600' : '500',
    background: 'none',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
  });

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sliders size={28} color="var(--accent)" />
          <h2 style={{ margin: 0 }}>System Settings</h2>
        </div>

        <button
          className="btn btn-primary"
          onClick={runIntegrityCheck}
          disabled={isTestingIntegrity}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
        >
          <RefreshCw size={16} className={isTestingIntegrity ? 'spin' : ''} />
          {isTestingIntegrity ? 'Testing All Endpoints...' : '⚡ Run System Integrity Check'}
        </button>
      </div>

      {/* System Integrity & Connectivity Diagnostic Panel */}
      {integrityData && (
        <div style={{
          marginBottom: '2rem', padding: '1.25rem', borderRadius: '12px',
          border: `1px solid ${integrityData.overall_status === 'HEALTHY' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          backgroundColor: integrityData.overall_status === 'HEALTHY' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} color={integrityData.overall_status === 'HEALTHY' ? '#10b981' : '#ef4444'} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                System Architecture Integrity Report
              </h3>
              <span style={{
                padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800,
                backgroundColor: integrityData.overall_status === 'HEALTHY' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: integrityData.overall_status === 'HEALTHY' ? '#10b981' : '#ef4444'
              }}>
                {integrityData.overall_status}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Active Profile: <strong>{integrityData.active_profile}</strong> | Tested: {new Date(integrityData.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {Object.values(integrityData.components || {}).map((comp: any, idx: number) => {
              const isOk = comp.status === 'HEALTHY';
              const isDisabled = comp.status === 'DISABLED';
              const badgeColor = isOk ? '#10b981' : (isDisabled ? '#6b7280' : '#ef4444');
              const bgColor = isOk ? 'rgba(16, 185, 129, 0.08)' : (isDisabled ? 'rgba(107, 114, 128, 0.08)' : 'rgba(239, 68, 68, 0.08)');

              return (
                <div key={idx} style={{
                  padding: '0.85rem', borderRadius: '8px', border: `1px solid ${badgeColor}33`,
                  backgroundColor: bgColor, display: 'flex', flexDirection: 'column', gap: '0.35rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{comp.name}</span>
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800,
                      backgroundColor: `${badgeColor}22`, color: badgeColor
                    }}>
                      {comp.status} ({comp.latency_ms}ms)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {comp.url}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {comp.message}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <button style={tabStyle('workspaces')} onClick={() => setActiveSettingsTab('workspaces')}>
          Workspaces
        </button>
        <button style={tabStyle('infrastructure')} onClick={() => setActiveSettingsTab('infrastructure')}>
          Infrastructure
        </button>
        <button style={tabStyle('telemetry')} onClick={() => setActiveSettingsTab('telemetry')}>
          Telemetry
        </button>
        <button style={tabStyle('danger')} onClick={() => setActiveSettingsTab('danger')}>
          Danger Zone
        </button>
      </div>

      {activeSettingsTab === 'workspaces' && (
        <div>
          <h2 style={{ marginBottom: "1rem" }}>Workspace Administration</h2>
      <div>
                  <h3 className="section-title">🔧 Tenant Space Administration</h3>
                  <div className="info-callout">
                    <p className="info-callout-title">Workspace Provisioning</p>
                    Onboard new workspaces, allocate vector indices schema mapping, and assign model weights/LoRA configurations.
                  </div>

                  <div className="settings-two-col-grid">
                    {/* Form */}
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.25rem' }}>🔑 Onboard Partition</h4>
                      
                      {adminStatusMsg && (
                        <div className={`status-msg-box status-msg-${adminStatusMsg.type}`}>
                          {adminStatusMsg.message}
                        </div>
                      )}

                      <form onSubmit={handleRegisterTenant}>
                        <div className="form-group">
                          <label className="form-label">Tenant ID (lowercase, alphanumeric)</label>
                          <input 
                            className="form-input" 
                            type="text" 
                            value={newTenantId}
                            onChange={(e) => setNewTenantId(e.target.value)}
                            placeholder="e.g. hr_support_v2"
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                          <label className="form-label">LoRA Weight Matrix ID</label>
                          {config.LLM_DEPLOYMENT_MODE === 'LOCAL' && availableModels.length > 0 ? (
                            <select 
                              className="tenant-select" 
                              value={newTenantAdapter}
                              onChange={(e) => setNewTenantAdapter(e.target.value)}
                            >
                              {(availableModels || []).map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          ) : (
                            <input 
                              className="form-input" 
                              type="text" 
                              value={newTenantAdapter}
                              onChange={(e) => setNewTenantAdapter(e.target.value)}
                              placeholder="e.g. tech_support"
                            />
                          )}
                        </div>
                        <button className="btn btn-primary btn-block" type="submit">
                          <Cpu size={14} /> Register & Provision Partition
                        </button>
                      </form>
                    </div>

                    {/* Table */}
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.25rem' }}>🏢 Onboarded Partition Schema Lineages</h4>
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                        <table style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th>Tenant ID</th>
                              <th>Lora Weight ID</th>
                              <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(tenants || []).map(t => (
                              <tr key={t.tenant_id}>
                                <td style={{ fontWeight: 600 }}>{t.tenant_id}</td>
                                <td><code>{t.adapter_weight_matrix}</code></td>
                                <td style={{ textAlign: 'center' }}>
                                  <button 
                                    className="btn btn-danger"
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                    onClick={() => handleDeleteTenant(t.tenant_id)}
                                  >
                                    <Trash2 size={12} /> Deprovision
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TENANT SYSTEM PROMPT REGISTRY & VERSION LINEAGE */}
                  <div style={{ marginTop: '2.5rem', backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📝 Tenant System Prompt & Behavior Registry
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                      Configure custom system prompt instructions governing domain tone, output format rules, and grounding constraints for each workspace scope.
                    </p>

                    {promptMsg && (
                      <div className={`status-msg-box status-msg-${promptMsg.type}`} style={{ marginBottom: '1.25rem' }}>
                        {promptMsg.message}
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label">Select Target Workspace Scope</label>
                      <select 
                        className="tenant-select" 
                        value={promptTenant} 
                        onChange={(e) => setPromptTenant(e.target.value)}
                        style={{ maxWidth: '320px' }}
                      >
                        {(tenants || []).map((t: any) => {
                          const tid = typeof t === 'string' ? t : t.tenant_id || t.id;
                          return <option key={tid} value={tid}>{tid.toUpperCase()}</option>;
                        })}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <label className="form-label" style={{ margin: 0 }}>Active System Prompt Instructions</label>
                        <span className="trace-badge trace-badge-accent">Active Version: {promptRecord?.version || 'v1.0'}</span>
                      </div>
                      <textarea 
                        className="form-input" 
                        rows={12} 
                        value={activePromptText}
                        onChange={(e) => setActivePromptText(e.target.value)}
                        placeholder="Enter system prompt instructions for this workspace scope..."
                        style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.4' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label">Revision Note / Comment (Optional)</label>
                      <input 
                        type="text"
                        className="form-input" 
                        value={promptNote}
                        onChange={(e) => setPromptNote(e.target.value)}
                        placeholder="e.g. Optimized for HR compliance rules, tested with Ragas"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <button 
                      className="btn btn-primary" 
                      onClick={handleSavePrompt}
                      disabled={isPromptLoading || !activePromptText.trim()}
                      style={{ padding: '0.6rem 1.5rem', marginBottom: '2rem' }}
                    >
                      {isPromptLoading ? 'Deploying...' : '💾 Save & Deploy New Prompt Version'}
                    </button>

                    {/* Prompt Lineage History Table */}
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                      📜 System Prompt Revision History & Lineage
                    </h4>
                    
                    {promptRecord?.history && promptRecord.history.length > 0 ? (
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflowX: 'auto', backgroundColor: 'var(--bg-primary)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.03)' }}>
                              <th style={{ padding: '0.65rem 1rem' }}>Version</th>
                              <th style={{ padding: '0.65rem 1rem' }}>Updated Timestamp</th>
                              <th style={{ padding: '0.65rem 1rem' }}>System Prompt Snippet</th>
                              <th style={{ padding: '0.65rem 1rem' }}>Note / Comment</th>
                              <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {promptRecord.history.map((h: any, idx: number) => {
                              const rowKey = `${h.version}_${h.updated_at || idx}`;
                              const isEditing = editingNoteKey === rowKey;
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <td style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>{h.version}</td>
                                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                    {h.updated_at ? new Date(h.updated_at).toLocaleString() : 'N/A'}
                                  </td>
                                  <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '260px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={h.prompt}>
                                    {h.prompt}
                                  </td>
                                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                    {isEditing ? (
                                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        <input 
                                          type="text" 
                                          className="form-input"
                                          value={editingNoteText}
                                          onChange={(e) => setEditingNoteText(e.target.value)}
                                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                                        />
                                        <button 
                                          className="btn btn-primary" 
                                          onClick={() => handleSaveHistoryNote(h.version, h.updated_at)}
                                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                        >
                                          Save
                                        </button>
                                        <button 
                                          className="btn btn-outline" 
                                          onClick={() => setEditingNoteKey(null)}
                                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span>{h.note || 'Archived version'}</span>
                                        <button 
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.75rem', padding: 0 }}
                                          title="Edit Comment"
                                          onClick={() => {
                                            setEditingNoteKey(rowKey);
                                            setEditingNoteText(h.note || '');
                                          }}
                                        >
                                          ✏️
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                      <button 
                                        className="btn btn-outline"
                                        onClick={() => handleRollbackPrompt(h.version, h.updated_at)}
                                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                      >
                                        ↺ Revert
                                      </button>
                                      <button 
                                        className="btn btn-danger"
                                        onClick={() => handleDeletePromptHistory(h.version, h.updated_at)}
                                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                        title="Delete this history entry"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', italic: true }}>
                        No prior prompt revisions archived for this workspace. Saving a new prompt will log its revision lineage here.
                      </div>
                    )}
                  </div>
                </div>
          </div>
      )}

      {activeSettingsTab === 'infrastructure' && (
      <div>
      <h2 style={{ marginTop: "1rem", marginBottom: "0.5rem" }}>Infrastructure & Engines Settings</h2>
      <div>
                  <div className="info-callout">
                    <p className="info-callout-title">Orchestrate LLM Providers & Core Connections</p>
                    Manage provider environments (vLLM, Ollama, OpenAI/Cloud) and toggle the global active execution connection profile.
                  </div>

                  <div className="settings-two-col-grid settings-two-col-grid--reversed">
                    
                    {/* LEFT PANEL: ACTIVE CONNECTIONS DASHBOARD */}
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📡 Active Connections Dashboard
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {Object.entries(profiles || {}).map(([alias, prof]: [string, any]) => {
                          const isActive = alias === activeProfileName;
                          return (
                            <div 
                              key={alias} 
                              className="metric-card" 
                              style={{ 
                                padding: '1.5rem', 
                                border: isActive ? '2px solid var(--accent)' : '1px solid var(--border-color)', 
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                opacity: isActive ? 1 : 0.85,
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '12px',
                                boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.1)' : 'var(--card-shadow)'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{alias}</span>
                                  {isActive && (
                                    <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--accent)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.05em' }}>
                                      ACTIVE TARGET
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  {!isActive && (
                                    <button 
                                      type="button" 
                                      className="btn btn-outline"
                                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                                      onClick={() => handleActivateProfile(alias)}
                                    >
                                      Set Active
                                    </button>
                                  )}
                                  <button 
                                    type="button" 
                                    className="btn btn-danger"
                                    style={{ padding: '0.35rem 0.5rem', minWidth: 'auto' }}
                                    onClick={() => handleDeleteProfile(alias)}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                              <div className="settings-half-grid" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                <div>Provider Type: <strong style={{ color: 'var(--text-primary)' }}>{prof.PROVIDER_TYPE || 'vLLM'}</strong></div>
                                <div>Deployment Mode: <strong style={{ color: 'var(--text-primary)' }}>{prof.LLM_DEPLOYMENT_MODE}</strong></div>
                                <div style={{ gridColumn: 'span 2', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  Endpoint: <code 
                                    style={{ cursor: 'pointer', borderBottom: '1px dashed var(--text-secondary)', color: 'var(--text-primary)' }}
                                    onClick={() => setRevealEndpoint(!revealEndpoint)}
                                    title={revealEndpoint ? "Click to mask IP address" : "Click to reveal IP address"}
                                  >
                                    {revealEndpoint ? prof.LLM_API_BASE_URL : maskIp(prof.LLM_API_BASE_URL)}
                                  </code>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                  Target Model: <code style={{ color: 'var(--text-primary)' }}>{prof.DEFAULT_MODEL_ID}</code>
                                </div>
                              </div>

                              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                <span>V_K: <strong>{prof.VECTOR_TOP_K || 20}</strong></span>
                                <span>R_K: <strong>{prof.RERANK_TOP_K || 3}</strong></span>
                                <span>Thresh: <strong>{prof.RERANKER_SCORE_THRESHOLD !== undefined ? prof.RERANKER_SCORE_THRESHOLD : 0.40}</strong></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Downstream Settings Form Card */}
                      <div className="metric-card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)', marginTop: '2rem', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          ⚙️ Global Downstream & Retrieval Parameters
                        </h4>
                        <div className="info-callout" style={{ marginBottom: '1rem' }}>
                          These parameters are saved and applied to the currently active profile: <strong>{activeProfileName}</strong>.
                        </div>
                        <form onSubmit={handleSaveDownstreamSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          
                          <div className="settings-half-grid">
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.72rem' }}>Qdrant DB Endpoint</label>
                              <input 
                                className="form-input" 
                                type="text" 
                                placeholder="e.g. http://localhost:6333"
                                value={downstreamQdrantUrl}
                                onChange={(e) => setDownstreamQdrantUrl(e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.72rem' }}>Embedding Server Endpoint</label>
                              <input 
                                className="form-input" 
                                type="text" 
                                placeholder="e.g. http://localhost:8090"
                                value={downstreamEmbeddingUrl}
                                onChange={(e) => setDownstreamEmbeddingUrl(e.target.value)}
                              />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                              <label className="form-label" style={{ fontSize: '0.72rem' }}>Reranker Service Endpoint</label>
                              <input 
                                className="form-input" 
                                type="text" 
                                placeholder="e.g. http://localhost:8081"
                                value={downstreamRerankerUrl}
                                onChange={(e) => setDownstreamRerankerUrl(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="settings-third-grid">
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.72rem' }}>Vector Top K</label>
                              <input 
                                className="form-input" 
                                type="number" 
                                value={downstreamVectorTopK}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setDownstreamVectorTopK(isNaN(val) ? 0 : val);
                                }}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.72rem' }}>Rerank Top K</label>
                              <input 
                                className="form-input" 
                                type="number" 
                                value={downstreamRerankTopK}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setDownstreamRerankTopK(isNaN(val) ? 0 : val);
                                }}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.72rem' }}>Rerank Threshold</label>
                              <input 
                                className="form-input" 
                                type="number" 
                                step="0.05"
                                value={downstreamScoreThreshold}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setDownstreamScoreThreshold(isNaN(val) ? 0.0 : val);
                                }}
                              />
                            </div>
                          </div>

                          <button className="btn btn-primary btn-block" type="submit" style={{ marginTop: '0.5rem' }}>
                            💾 Save & Apply Downstream Settings
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* RIGHT PANEL: CUSTOM ENGINE/MODEL ONBOARDING */}
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ⚙️ Onboard New Engine/Model
                      </h4>

                      <form onSubmit={handleOnboardProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Friendly Connection Name (Alias)</label>
                          <input 
                            className="form-input" 
                            type="text" 
                            placeholder="e.g. On-Prem vLLM (A40)"
                            value={onboardAlias}
                            onChange={(e) => setOnboardAlias(e.target.value)}
                            required
                          />
                        </div>

                        <div className="settings-provider-grid">
                          <div className="form-group">
                            <label className="form-label">Provider Type</label>
                            <select 
                              className="tenant-select" 
                              value={onboardProviderType}
                              onChange={(e) => setOnboardProviderType(e.target.value)}
                            >
                              <option value="vLLM">vLLM Engine</option>
                              <option value="Ollama">Ollama Local Engine</option>
                              <option value="Cloud API">Cloud API (OpenAI/Anthropic)</option>
                              <option value="OpenAI-Compatible">OpenAI-Compatible Gateway</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Model Selection Template</label>
                            <select 
                              className="tenant-select" 
                              onChange={(e) => setOnboardModelId(e.target.value)}
                              value={onboardModelId}
                            >
                              <option value="">-- Choose or Enter Custom Below --</option>
                              <option value="llama3.2:latest">llama3.2:latest (Ollama)</option>
                              <option value="ggozad/prometheus2">prometheus2 (Ragas Judge)</option>
                              <option value="gpt-4o">gpt-4o (OpenAI Cloud)</option>
                              <option value="gpt-3.5-turbo">gpt-3.5-turbo (OpenAI Cloud)</option>
                              <option value="meta-llama/Meta-Llama-3-8B-Instruct">meta-llama/Meta-Llama-3-8B-Instruct (vLLM)</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Connection Endpoint URL / IP</label>
                          <input 
                            className="form-input" 
                            type="text" 
                            placeholder="e.g. http://10.0.0.15:11434"
                            value={onboardEndpointUrl}
                            onChange={(e) => setOnboardEndpointUrl(e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Model Identifier String</label>
                          <input 
                            className="form-input" 
                            type="text" 
                            placeholder="e.g. meta-llama/Meta-Llama-3-8B-Instruct"
                            value={onboardModelId}
                            onChange={(e) => setOnboardModelId(e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">API Key / Token</label>
                          <input 
                            className="form-input" 
                            type="password" 
                            value={onboardApiKey}
                            onChange={(e) => setOnboardApiKey(e.target.value)}
                            placeholder="none"
                          />
                        </div>



                        <button className="btn btn-primary btn-block" type="submit" style={{ marginTop: '0.5rem' }}>
                          🚀 Onboard Connection & Model
                        </button>
                      </form>
                    </div>

                  </div>
              </div>
      </div>
      )}

      {activeSettingsTab === 'telemetry' && (
      <div>
      {/* ── SYSTEM TELEMETRY ─────────────────────────────────────── */}
      <h2 style={{ marginTop: '1rem', marginBottom: '1rem' }}>System Telemetry</h2>
      <div>
        <h3 className="section-title">📡 Live Infrastructure Status</h3>
        <div className="info-callout">
          <p className="info-callout-title">Real-time Connectivity Health</p>
          Live status of vector DB, embedding server, reranker, and LLM backend. Health is re-fetched every 15&nbsp;s.
        </div>

        <div className="settings-two-col-grid" style={{ marginTop: '1.25rem' }}>
          {/* Qdrant */}
          <div className="metric-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, backgroundColor: isQdrantOnline ? '#10b981' : '#ef4444', boxShadow: isQdrantOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Qdrant Vector DB</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Status: <strong style={{ color: isQdrantOnline ? '#10b981' : '#ef4444' }}>{isQdrantOnline ? 'ONLINE' : 'OFFLINE'}</strong>
                {(health?.components?.qdrant?.points_count !== undefined || health?.nodes?.qdrant?.points_count !== undefined) && (
                  <span style={{ marginLeft: '0.75rem' }}>Vectors: <strong>{(health?.components?.qdrant?.points_count ?? health?.nodes?.qdrant?.points_count ?? 0).toLocaleString()}</strong></span>
                )}
              </div>
            </div>
          </div>

          {/* TEI Embedder */}
          <div className="metric-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, backgroundColor: isTeiOnline ? '#10b981' : '#ef4444', boxShadow: isTeiOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Embedding Server (TEI)</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Status: <strong style={{ color: isTeiOnline ? '#10b981' : '#ef4444' }}>{getEmbeddingLabel()}</strong>
                {health?.nodes?.tei_embedder?.model && (
                  <span style={{ marginLeft: '0.75rem' }}>Model: <code>{health.nodes.tei_embedder.model}</code></span>
                )}
              </div>
            </div>
          </div>

          {/* Reranker */}
          <div className="metric-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, backgroundColor: isRerankerOnline ? '#10b981' : '#ef4444', boxShadow: isRerankerOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Reranker Server (TEI)</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Status: <strong style={{ color: isRerankerOnline ? '#10b981' : '#ef4444' }}>{getRerankerLabel()}</strong>
                {health?.nodes?.reranker?.model && (
                  <span style={{ marginLeft: '0.75rem' }}>Model: <code>{health.nodes.reranker.model}</code></span>
                )}
              </div>
            </div>
          </div>

          {/* LLM API */}
          <div className="metric-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, backgroundColor: isLlmOnline ? '#10b981' : '#ef4444', boxShadow: isLlmOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>LLM Inference Engine</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Status: <strong style={{ color: isLlmOnline ? '#10b981' : '#ef4444' }}>{isLlmOnline ? 'ONLINE' : 'OFFLINE'}</strong>
                <span style={{ marginLeft: '0.75rem' }}>Mode: <code>{config?.LLM_DEPLOYMENT_MODE || 'UNKNOWN'}</code></span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '1rem', gap: '1rem' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Last refreshed: <strong>{lastRefreshed}</strong>
            </span>
          )}
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={handleHardRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-animation' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>
      </div>
      </div>
      )}

      {activeSettingsTab === 'danger' && (
      <div>
      {/* ── DANGER ZONE: DB RESET ────────────────────────────────── */}
      <h2 style={{ marginTop: '1rem', marginBottom: '1rem', color: '#ef4444' }}>⚠️ Danger Zone</h2>
      <div>
        <h3 className="section-title">🗑️ Vector Collection Reset</h3>
        <div>
          <div
            className="metric-card"
            style={{
              padding: '1.5rem',
              border: '1px solid rgba(239,68,68,0.35)',
              backgroundColor: 'rgba(239,68,68,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <AlertTriangle size={28} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem' }}>
                  Purge All Vector Embeddings
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  This permanently deletes the entire Qdrant collection for the selected tenant scope, removing all
                  ingested document embeddings. This action <strong>cannot be undone</strong>. The tenant registry
                  entry will remain; only the vector data is purged.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Active scope: <code style={{ color: '#ef4444' }}>{currentTenant || 'none selected'}</code>
              </div>
              <button
                type="button"
                className="btn btn-danger"
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.25rem' }}
                onClick={handleResetCollection}
                disabled={!currentTenant}
              >
                <Trash2 size={14} /> Reset Vector DB for &quot;{currentTenant || 'select scope'}&quot;
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
};
