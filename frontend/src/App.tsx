// @ts-nocheck

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { 
  Shield, UploadCloud, Cpu, Server, Sun, Moon, 
  FileText, BarChart2, Sliders, Activity, Menu, X, FolderOpen, SlidersHorizontal
} from 'lucide-react';
import './App.css';
import { useAppLogic } from './useAppLogic';

import { Chat } from './pages/Chat';
import { Query } from './pages/Query';
import { Summarize } from './pages/Summarize';
import { Ingestion } from './pages/Ingestion';
import { Evaluation } from './pages/Evaluation';
import { Settings } from './pages/Settings';
import { Analytics } from './pages/Analytics';
import { DocumentLibrary } from './pages/DocumentLibrary';
import { LogsConsole } from './pages/LogsConsole';
import { WorkloadTuning } from './pages/WorkloadTuning';
import { BackgroundJobPoller } from './components/BackgroundJobPoller';

// ─────────────────────────────────────────────────────────────
// Error Boundary — prevents one page crash from blanking the app
// ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; label?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label || 'page'}]`, error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem', margin: '2rem', borderRadius: '12px',
          border: '1px solid var(--glow-red)',
          backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--text-primary)'
        }}>
          <h3 style={{ color: 'var(--glow-red)', marginBottom: '0.75rem' }}>
            ⚠️ {this.props.label || 'Page'} failed to render
          </h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            {this.state.error?.message}
          </p>
          <button
            className="btn btn-outline"
            style={{ marginTop: '1rem', fontSize: '0.82rem' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            🔄 Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppLayout = () => {
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
    isBackendReachable,
    isOnboarding
  } = useAppLogic();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleString());

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchTenants();
    fetchConfig();
    fetchAvailableModels();
    
    // ISSUE 6 FIX: Poll health every 30s using lightweight ping so interval doesn't block UI
    const healthInterval = setInterval(() => {
      fetchHealth();
    }, 30000);

    return () => clearInterval(healthInterval);
  }, []);

  useEffect(() => {
    if (tenants.length > 0 && !currentTenant) {
      setCurrentTenant(tenants[0].tenant_id);
    }
  }, [tenants]);

  // Sync theme class on <html> element so css variables (html.dark {}) activate correctly
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="app-container">
      {/* ISSUE 6: Backend Offline Banner — shown when the circuit breaker detects unreachability */}
      {!isBackendReachable && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(90deg, #b91c1c, #dc2626)',
          color: '#fff', textAlign: 'center', padding: '10px 16px',
          fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.02em',
          boxShadow: '0 2px 12px rgba(185,28,28,0.4)'
        }}>
          ⚠️ Backend Unreachable — API server is offline or starting up. Some features are disabled.
        </div>
      )}
      {/* Mobile Header (visible only on small screens) */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={24} color="var(--accent)" />
          <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800 }}>Nexus RAG</h1>
        </div>
        <button 
          className="mobile-menu-btn"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <nav className={`sidebar ${mobileMenuOpen ? 'open' : ''}`} aria-label="Main Navigation">
        <div className="sidebar-logo-area">
          <Shield size={28} color="var(--accent)" />
          <div>
            <h1 className="sidebar-title">Nexus RAG System</h1>
            <p className="sidebar-subtitle">Enterprise Data Grounding</p>
          </div>
        </div>

        <div className="sidebar-context-box">
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
            Active Workspace Scope
          </div>
          <select 
            className="tenant-select" 
            value={currentTenant}
            onChange={(e) => setCurrentTenant(e.target.value)}
            aria-label="Select active workspace scope"
          >
            <option value="" disabled>Select scope...</option>
            {(tenants || []).map(t => (
              <option key={t.tenant_id} value={t.tenant_id}>
                🗂️ {t.tenant_id}
              </option>
            ))}
          </select>
        </div>

        <div className="tab-navigation">
          <div className="tab-nav-category">Chat & Synthesis</div>
          <NavLink to="/query" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <Server size={16} /> RAG Play Space
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <Cpu size={16} /> Raw Chat (MyGPT)
          </NavLink>
          <NavLink to="/summarize" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <FileText size={16} /> Document Summarizer
          </NavLink>

          <div className="tab-nav-category">Data & Telemetry</div>
          <NavLink to="/ingestion" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <UploadCloud size={16} /> Ingestion Pipeline
          </NavLink>
          <NavLink to="/documents" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <FolderOpen size={16} /> Document Library
          </NavLink>
          <NavLink to="/eval" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <BarChart2 size={16} /> Ragas Evaluation
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <Activity size={16} /> Analytics Dashboard
          </NavLink>

          <div className="tab-nav-category">Administration</div>
          <NavLink to="/tuning" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <SlidersHorizontal size={16} /> Workload Tuning
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <Sliders size={16} /> System Settings
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <Activity size={16} /> Live Observability & SLA
          </NavLink>
        </div>

        <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
              <Shield size={14} color="var(--accent)" /> App Version 2.0
            </div>
            <div style={{ fontSize: '0.68rem', opacity: 0.85, fontFamily: 'monospace' }}>{currentTime}</div>
          </div>
          
          <button 
            className="theme-toggle-btn" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', color: 'var(--text-primary)' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>

      {/* Overlay to close sidebar on mobile */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/query" replace />} />
          <Route path="/query" element={<ErrorBoundary label="RAG Query"><Query /></ErrorBoundary>} />
          <Route path="/chat" element={<ErrorBoundary label="Chat"><Chat /></ErrorBoundary>} />
          <Route path="/summarize" element={<ErrorBoundary label="Summarize"><Summarize /></ErrorBoundary>} />
          <Route path="/ingestion" element={<ErrorBoundary label="Ingestion"><Ingestion /></ErrorBoundary>} />
          <Route path="/documents" element={<ErrorBoundary label="Document Library"><DocumentLibrary /></ErrorBoundary>} />
          <Route path="/eval" element={<ErrorBoundary label="Evaluation"><Evaluation /></ErrorBoundary>} />
          <Route path="/tuning" element={<ErrorBoundary label="Workload Tuning"><WorkloadTuning /></ErrorBoundary>} />
          <Route path="/settings" element={<ErrorBoundary label="System Settings"><Settings /></ErrorBoundary>} />
          <Route path="/analytics" element={<ErrorBoundary label="Analytics"><Analytics /></ErrorBoundary>} />
          <Route path="/logs" element={<ErrorBoundary label="System Audit & Logs"><LogsConsole /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/query" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary label="Application">
      <BackgroundJobPoller />
      <Router>
        <AppLayout />
      </Router>
    </ErrorBoundary>
  );
}
