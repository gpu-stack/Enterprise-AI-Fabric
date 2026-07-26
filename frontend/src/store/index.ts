import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalState {
  theme: string;
  setTheme: (theme: string) => void;
  
  tenants: any[];
  setTenants: (tenants: any[]) => void;
  
  currentTenant: string;
  setCurrentTenant: (tenant: string) => void;
  
  health: any;
  setHealth: (health: any) => void;
  
  activeProfileName: string;
  setActiveProfileName: (profile: string) => void;
  
  ragChatHistory: Record<string, any[]>;
  setRagChatHistory: (history: any | ((prev: Record<string, any[]>) => Record<string, any[]>)) => void;
  
  evalRuns: any[];
  setEvalRuns: (runs: any[]) => void;

  ingestionHistory: any[];
  setIngestionHistory: (history: any | ((prev: any[]) => any[])) => void;

  lastIngestResults: any[] | null;
  setLastIngestResults: (results: any[] | null) => void;

  lastIngestMetrics: { date: string; timeTaken: string; status: string } | null;
  setLastIngestMetrics: (metrics: { date: string; timeTaken: string; status: string } | null) => void;

  activeJobs: any[];
  setActiveJobs: (jobs: any[] | ((prev: any[]) => any[])) => void;

  isIngesting: boolean;
  setIsIngesting: (isIngesting: boolean) => void;

  ingestProgress: number;
  setIngestProgress: (progress: number | ((prev: number) => number)) => void;

  ingestStatusText: string;
  setIngestStatusText: (text: string) => void;

  ingestStartTime: number | null;
  setIngestStartTime: (time: number | null) => void;
}

export const useStore = create<GlobalState>()(
  persist(
    (set) => ({
      theme: localStorage.getItem('theme') || 'dark',
      setTheme: (theme) => {
        localStorage.setItem('theme', theme);
        set({ theme });
      },
  
  tenants: [],
  setTenants: (tenants) => set({ tenants }),
  
  currentTenant: '',
  setCurrentTenant: (currentTenant) => set({ currentTenant }),
  
  health: null,
  setHealth: (health) => set({ health }),
  
  activeProfileName: '',
  setActiveProfileName: (activeProfileName) => set({ activeProfileName }),
  
  ragChatHistory: {},
  setRagChatHistory: (history) => set((state) => ({ 
    ragChatHistory: typeof history === 'function' ? history(state.ragChatHistory) : history 
  })),
  
  evalRuns: [],
  setEvalRuns: (evalRuns) => set({ evalRuns }),

  ingestionHistory: [],
  setIngestionHistory: (history) => set((state) => ({
    ingestionHistory: typeof history === 'function' ? history(state.ingestionHistory) : history
  })),

  lastIngestResults: null,
  setLastIngestResults: (lastIngestResults) => set({ lastIngestResults }),

  lastIngestMetrics: null,
  setLastIngestMetrics: (lastIngestMetrics) => set({ lastIngestMetrics }),

  activeJobs: [],
  setActiveJobs: (jobs) => set((state) => ({
    activeJobs: typeof jobs === 'function' ? jobs(state.activeJobs) : jobs
  })),

  isIngesting: false,
  setIsIngesting: (isIngesting) => set({ isIngesting }),

  ingestProgress: 0,
  setIngestProgress: (progress) => set((state) => ({
    ingestProgress: typeof progress === 'function' ? progress(state.ingestProgress) : progress
  })),

  ingestStatusText: '',
  setIngestStatusText: (ingestStatusText) => set({ ingestStatusText }),

  ingestStartTime: null,
  setIngestStartTime: (ingestStartTime) => set({ ingestStartTime })
    }),
    {
      name: 'enterprise-rag-storage',
    }
  )
);
