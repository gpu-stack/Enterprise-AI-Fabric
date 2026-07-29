// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { FolderOpen, Search, Trash2, RefreshCw, FileText } from 'lucide-react';
import { useAppLogic } from '../useAppLogic';

export const DocumentLibrary = () => {
  const { currentTenant } = useAppLogic();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchDocuments = async () => {
    if (!currentTenant) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tenants/${currentTenant}/documents`);
      const data = await res.json();
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
    } catch (e) {
      console.error("Failed to fetch tenant documents", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentTenant]);

  const handleDeleteFamily = async (docFamily: string) => {
    if (!confirm(`Are you sure you want to deprovision document family '${docFamily}'? All associated vector chunks will be deleted.`)) {
      return;
    }
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/tenants/${currentTenant}/documents/${encodeURIComponent(docFamily)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ message: data.message || 'Document family deleted.', type: 'success' });
        fetchDocuments();
      } else {
        setStatusMsg({ message: data.detail || 'Deletion failed.', type: 'error' });
      }
    } catch (e: any) {
      setStatusMsg({ message: e.message || 'Deletion error.', type: 'error' });
    }
  };

  const filteredDocs = documents.filter(doc => {
    const term = searchTerm.toLowerCase();
    const fam = (doc.document_family || '').toLowerCase();
    const files = (doc.source_files || []).join(' ').toLowerCase();
    return fam.includes(term) || files.includes(term);
  });

  return (
    <div style={{ padding: '1rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderOpen size={24} color="var(--accent)" /> Document Knowledge Library Browser
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Browse, inspect, and manage ingested document families, version lineage, and vector chunk footprints across tenant scope <strong>[{currentTenant || 'None'}]</strong>.
          </p>
        </div>

        <button 
          className="btn btn-outline" 
          onClick={fetchDocuments}
          disabled={isLoading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> Refresh Catalog
        </button>
      </div>

      {!currentTenant ? (
        <div className="status-msg-box status-msg-warning">
          ⚠️ No active workspace scope focused. Select a workspace scope inside the left sidebar panel first.
        </div>
      ) : (
        <>
          {statusMsg && (
            <div className={`status-msg-box status-msg-${statusMsg.type}`} style={{ marginBottom: '1.25rem' }}>
              {statusMsg.message}
            </div>
          )}

          {/* Search Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flexGrow: 1, maxWidth: '480px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Search document families or source filenames..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.25rem', width: '100%' }}
              />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {filteredDocs.length} of {documents.length} document families
            </div>
          </div>

          {/* Document Families Table */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading tenant document catalog...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ 
              padding: '3rem', 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '12px', 
              border: '1px solid var(--border-color)', 
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <FileText size={36} opacity={0.4} style={{ marginBottom: '0.75rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0' }}>No document families found</h4>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>
                {searchTerm ? 'No matches found for your search query.' : 'Upload PDFs, Word docs, or Excel sheets in the Ingestion Pipeline tab to populate your library.'}
              </p>
            </div>
          ) : (
            <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', backgroundColor: 'rgba(0,0,0,0.03)' }}>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>Document Family & Files</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>Version</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>Chunk Count</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>Est. Words</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>Ingested At</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          📁 {doc.document_family}
                        </div>
                        {doc.source_files && doc.source_files.length > 0 && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            Files: {doc.source_files.join(', ')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="trace-badge trace-badge-accent">v{doc.latest_version || '1.0'}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                        {doc.total_chunks} chunks
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                        {doc.total_words ? doc.total_words.toLocaleString() : 'N/A'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        {doc.ingested_at ? new Date(doc.ingested_at).toLocaleString() : 'Recent'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          backgroundColor: doc.is_latest ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: doc.is_latest ? '#10b981' : '#f59e0b',
                          fontWeight: 600
                        }}>
                          {doc.is_latest ? '● Active Lineage' : '○ Deprecated'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button 
                          className="btn btn-outline" 
                          onClick={() => handleDeleteFamily(doc.document_family)}
                          style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          title="Deprovision document family"
                        >
                          <Trash2 size={14} /> Deprovision
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
