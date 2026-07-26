import React, { useEffect } from 'react';
import { useStore } from '../store';

export const BackgroundJobPoller: React.FC = () => {
  const {
    activeJobs, setActiveJobs,
    isIngesting, setIsIngesting,
    setIngestProgress, setIngestStatusText,
    ingestStartTime, setIngestStartTime,
    setLastIngestResults, setLastIngestMetrics,
    setIngestionHistory
  } = useStore();

  useEffect(() => {
    let timer: any;
    
    const pollActiveJobs = async () => {
      if (!activeJobs || activeJobs.length === 0) return;
      
      let allComplete = true;
      const updatedJobs = [...activeJobs];

      for (const r of updatedJobs) {
        if (r.status === 'queued' && r.job_id) {
          try {
            const pollRes = await fetch(`/api/jobs/${r.job_id}/status`);
            const pollData = await pollRes.json();
            
            if (pollData.status === 'PROGRESS') {
               setIngestProgress(pollData.meta?.progress || 0.5);
               setIngestStatusText(pollData.meta?.status || 'Processing background job...');
               allComplete = false;
            } else if (pollData.status === 'SUCCESS') {
               r.status = 'success';
               r.ingest_status = pollData.result?.ingest_status;
               r.deprecation_count = pollData.result?.deprecation_count;
            } else if (pollData.status === 'FAILURE') {
               r.status = 'error';
               r.message = pollData.error;
            } else {
               allComplete = false;
            }
          } catch(e) {
            allComplete = false;
          }
        }
      }

      setActiveJobs(updatedJobs);
      
      if (allComplete) {
        setIngestProgress(1.0);
        setIngestStatusText('Ingestion completed.');
        setLastIngestResults(updatedJobs);
        setIsIngesting(false);
        
        const timeTakenSec = ((Date.now() - (ingestStartTime || Date.now())) / 1000).toFixed(1) + 's';
        const hasErrors = updatedJobs.some((r: any) => r.status === 'error');
        setLastIngestMetrics({
          date: new Date().toLocaleString(),
          timeTaken: timeTakenSec,
          status: hasErrors ? 'Completed with errors' : 'Success'
        });
        
        const vPerSec = Math.round(320 / (0.75 * (updatedJobs.length || 1)));
        setIngestionHistory((prev: any[]) => [...(prev || []), {
           name: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
           Vectors: vPerSec * 60
        }]);

        setActiveJobs([]);
        setIngestStartTime(null);
      } else {
        // Continue polling if not complete
        timer = setTimeout(pollActiveJobs, 2500);
      }
    };

    // If there are active jobs, ensure we are in ingesting state and start polling
    if (activeJobs && activeJobs.length > 0) {
      if (!isIngesting) setIsIngesting(true);
      timer = setTimeout(pollActiveJobs, 1000);
    }
    
    return () => clearTimeout(timer);
  }, [activeJobs]);

  return null; // Invisible global polling component
};
