// @ts-nocheck
import React, { useState } from 'react';
import { 
  FileText, UploadCloud, Sparkles, Clock, Copy, Check, Download, 
  AlertCircle, CheckCircle, Sliders, Layers, X, FileCheck, FolderOpen, RefreshCw
} from 'lucide-react';
import { useAppLogic } from '../useAppLogic';

export const Summarize = () => {
  const {
    currentTenant,
    sumFile,
    setSumFile,
    sumLength,
    setSumLength,
    sumMaxTokens,
    setSumMaxTokens,
    isSummarizing,
    summaryResult,
    summarizeMode,
    setSummarizeMode,
    selectedDocumentFamily,
    setSelectedDocumentFamily,
    workspaceDocs,
    fetchWorkspaceDocs,
    handleSummarizeSubmit
  } = useAppLogic();

  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleCopy = () => {
    if (!summaryResult?.summary) return;
    navigator.clipboard.writeText(summaryResult.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!summaryResult?.summary) return;
    const element = document.createElement("a");
    const file = new Blob([summaryResult.summary], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `document_summary.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'docx', 'xlsx', 'xls', 'txt', 'csv', 'md', 'json', 'log', 'py', 'tsv'].includes(ext || '')) {
        setSumFile(droppedFile);
        setSummarizeMode('upload');
      } else {
        alert('Unsupported file format. Please upload PDF, DOCX, XLSX, TXT, CSV, MD, or JSON files.');
      }
    }
  };

  const isSubmitDisabled = isSummarizing || (summarizeMode === 'upload' ? !sumFile : !selectedDocumentFamily);

  return (
    <div style={{ padding: '0.5rem', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Title & Header Callout */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary)' }}>
            <FileText size={24} color="var(--accent)" /> Executive Document Summarization Console
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Transform workspace documents and uploaded assets into structured executive briefs.
          </p>
        </div>
        <div style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '0.35rem 0.75rem', borderRadius: '16px' }}>
          Workspace Scope: <strong style={{ color: 'var(--accent)' }}>{currentTenant || 'Global'}</strong>
        </div>
      </div>

      {/* Two Column Layout: Form Left, Output Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 460px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Form Card */}
        <div style={{
          backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={16} color="var(--accent)" /> Configuration & Target Document
          </h3>

          <form onSubmit={handleSummarizeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            
            {/* Source Mode Selector (Workspace Library vs File Upload) */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--text-secondary)' }}>
                Target Source Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSummarizeMode('library')}
                  style={{
                    padding: '0.55rem 0.5rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                    border: `1px solid ${summarizeMode === 'library' ? 'var(--accent)' : 'var(--border-color)'}`,
                    backgroundColor: summarizeMode === 'library' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-secondary)',
                    color: summarizeMode === 'library' ? 'var(--accent)' : 'var(--text-primary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                >
                  <FolderOpen size={14} /> Workspace Library ({workspaceDocs.length})
                </button>

                <button
                  type="button"
                  onClick={() => setSummarizeMode('upload')}
                  style={{
                    padding: '0.55rem 0.5rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                    border: `1px solid ${summarizeMode === 'upload' ? 'var(--accent)' : 'var(--border-color)'}`,
                    backgroundColor: summarizeMode === 'upload' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-secondary)',
                    color: summarizeMode === 'upload' ? 'var(--accent)' : 'var(--text-primary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                >
                  <UploadCloud size={14} /> Upload Local File
                </button>
              </div>
            </div>

            {/* Mode 1: Workspace Library Dropdown Selector */}
            {summarizeMode === 'library' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Select Ingested Document
                  </label>
                  <button 
                    type="button" 
                    onClick={() => fetchWorkspaceDocs()} 
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                  >
                    <RefreshCw size={11} /> Refresh List
                  </button>
                </div>

                {workspaceDocs.length > 0 ? (
                  <select
                    className="tenant-select"
                    value={selectedDocumentFamily}
                    onChange={(e) => setSelectedDocumentFamily(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem' }}
                  >
                    {workspaceDocs.map((doc) => {
                      const fileName = doc.source_files?.[0] || doc.document_family;
                      return (
                        <option key={doc.document_family} value={doc.document_family}>
                          📄 {fileName} ({doc.total_words?.toLocaleString()} words | {doc.total_chunks} chunks)
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div style={{
                    padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border-color)',
                    borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center'
                  }}>
                    No document families ingested yet in <strong>[{currentTenant}]</strong>. Switch to <strong>Upload Local File</strong> above to analyze a file.
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Drag and Drop Local File Zone */}
            {summarizeMode === 'upload' && (
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--text-secondary)' }}>
                  Target Local Document File
                </label>
                
                {!sumFile ? (
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${dragActive ? 'var(--accent)' : 'var(--border-color)'}`,
                      backgroundColor: dragActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                      borderRadius: '10px', padding: '1.5rem 1rem', textAlign: 'center',
                      cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                    onClick={() => document.getElementById('summarizer-file-input')?.click()}
                  >
                    <UploadCloud size={32} color={dragActive ? 'var(--accent)' : 'var(--text-secondary)'} style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Click or Drag & Drop File
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Supports <strong>PDF</strong>, <strong>DOCX</strong>, <strong>XLSX</strong>, <strong>TXT</strong>, <strong>CSV</strong>, <strong>MD</strong>
                    </div>
                    <input 
                      id="summarizer-file-input"
                      type="file"
                      accept=".pdf,.docx,.xlsx,.xls,.txt,.csv,.md,.json,.log,.py,.tsv"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) setSumFile(e.target.files[0]);
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                      <FileCheck size={20} color="#10b981" />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sumFile.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                          {(sumFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSumFile(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.2rem' }}
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Depth Level Selection */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--text-secondary)' }}>
                Summary Depth & Detail
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                {[
                  { value: 'Brief & Concise', label: 'Brief', icon: '⚡' },
                  { value: 'Standard Medium', label: 'Standard', icon: '📝' },
                  { value: 'Deep & Highly Detailed', label: 'Detailed', icon: '🔍' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSumLength(opt.value)}
                    style={{
                      padding: '0.5rem 0.2rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                      border: `1px solid ${sumLength === opt.value ? 'var(--accent)' : 'var(--border-color)'}`,
                      backgroundColor: sumLength === opt.value ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-secondary)',
                      color: sumLength === opt.value ? 'var(--accent)' : 'var(--text-primary)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Max Output Tokens */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Max Token Cap
                </label>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent)' }}>{sumMaxTokens} tokens</span>
              </div>
              <input 
                type="range"
                min="500"
                max="8000"
                step="250"
                value={sumMaxTokens}
                onChange={(e) => setSumMaxTokens(parseInt(e.target.value, 10))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Submit Button */}
            <button 
              type="button"
              onClick={(e) => handleSummarizeSubmit(e)}
              disabled={isSubmitDisabled}
              style={{
                padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 800,
                backgroundColor: isSubmitDisabled ? 'var(--border-color)' : 'var(--accent)',
                color: isSubmitDisabled ? 'var(--text-secondary)' : '#fff', border: 'none',
                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: isSubmitDisabled ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)',
                marginTop: '0.5rem'
              }}
            >
              <Sparkles size={16} />
              {isSummarizing ? '🧠 Analyzing & Summarizing...' : 'Generate Executive Brief'}
            </button>
          </form>
        </div>

        {/* Right Column: Output Card */}
        <div style={{
          backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: '12px', padding: '1.25rem', minHeight: '480px',
          display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          {isSummarizing && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              flex: 1, padding: '3rem 1rem', textAlign: 'center', gap: '1rem'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                border: '3px solid var(--accent)', borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite'
              }} />
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 800 }}>Reading & Condensing Document</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Extracting text layers, analyzing document structure, and synthesizing executive takeaways...
                </p>
              </div>
            </div>
          )}

          {!isSummarizing && summaryResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {summaryResult.status === 'success' ? (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    paddingBottom: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)',
                    flexWrap: 'wrap', gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={18} color="#10b981" />
                      <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>Executive Analysis Brief</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={handleCopy}
                        style={{
                          padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                        }}
                      >
                        {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy Summary'}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownload}
                        style={{
                          padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                          backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid #6366f1',
                          color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                        }}
                      >
                        <Download size={14} /> Download (.md)
                      </button>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '1.25rem', fontSize: '0.88rem', lineHeight: '1.65',
                    textAlign: 'left', flex: 1, overflowY: 'auto', maxHeight: '550px'
                  }}>
                    <div dangerouslySetInnerHTML={{ __html: summaryResult.summary?.replace(/\n/g, '<br/>') }} />
                  </div>

                  <div style={{
                    marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: '0.75rem', color: 'var(--text-secondary)'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} /> Processing Latency: <strong style={{ color: 'var(--text-primary)' }}>{summaryResult.latency_seconds}s</strong>
                    </span>
                    <span>Document: <strong>{sumFile?.name || selectedDocumentFamily}</strong></span>
                  </div>
                </>
              ) : (
                <div style={{
                  padding: '1.25rem', backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px',
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem', textAlign: 'left'
                }}>
                  <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: '#ef4444', fontSize: '0.9rem', fontWeight: 800 }}>Summarization Failed</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {summaryResult.message || summaryResult.detail || (typeof summaryResult === 'string' ? summaryResult : 'An unexpected error occurred.')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            !isSummarizing && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                flex: 1, padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)'
              }}>
                <FileText size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
                  No Executive Brief Generated Yet
                </h4>
                <p style={{ fontSize: '0.8rem', margin: 0, maxWidth: '360px' }}>
                  Select an ingested document from your <strong>Workspace Library</strong> or drag a file to click <strong>Generate Executive Brief</strong>.
                </p>
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
};
