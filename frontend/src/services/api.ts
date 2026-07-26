const API_BASE_URL = 'http://localhost:8000';

export const api = {
  getHealth: async () => {
    const res = await fetch(`${API_BASE_URL}/api/system/health`);
    return res.json();
  },
  
  getTenants: async () => {
    const res = await fetch(`${API_BASE_URL}/api/tenants`);
    return res.json();
  },
  
  pollJobStatus: async (jobId: string) => {
    const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/status`);
    return res.json();
  },
  
  ingestFiles: async (tenantId: string, formData: FormData) => {
    const res = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}/ingest`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },
  
  queryRag: async (tenantId: string, queryStr: string, topK: number, temp: number) => {
    const res = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_query: queryStr,
        temperature: temp,
        top_k: topK
      })
    });
    return res;
  }
};
