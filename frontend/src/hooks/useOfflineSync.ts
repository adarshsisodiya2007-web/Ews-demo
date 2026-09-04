import { useState, useEffect, useCallback } from 'react';
import {
  getPendingReports,
  updatePendingReport,
  removePendingReport,
  getOfflinePhoto,
  deleteOfflinePhoto,
  getPendingRoadStatuses,
  updatePendingRoadStatus,
  removePendingRoadStatus,
} from '../services/offlineStore';
import { submitReport, uploadPhoto, updateRoadStatus } from '../services/api';
import { PendingReportItem, PendingRoadStatusItem } from '../types';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingReports, setPendingReports] = useState<PendingReportItem[]>([]);
  const [pendingRoads, setPendingRoads] = useState<PendingRoadStatusItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    try {
      const [reports, roads] = await Promise.all([
        getPendingReports(),
        getPendingRoadStatuses(),
      ]);
      setPendingReports(reports);
      setPendingRoads(roads);
    } catch (err) {
      console.error('Error fetching pending sync items:', err);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    setSyncError(null);

    let hadErrors = false;

    try {
      // 1. Sync Pending Incident Reports
      const reports = await getPendingReports();
      for (const item of reports) {
        try {
          // Mark SYNCING
          item.syncStatus = 'SYNCING';
          await updatePendingReport(item);

          let finalPhotoUrl = item.payload.photoUrl;

          // If there is an offline photo blob waiting to be uploaded
          if (item.payload.photoBlobKey && !finalPhotoUrl) {
            const blob = await getOfflinePhoto(item.payload.photoBlobKey);
            if (blob) {
              try {
                finalPhotoUrl = await uploadPhoto(blob, `report_${item.clientReportId}.jpg`);
                item.payload.photoUrl = finalPhotoUrl;
              } catch (photoErr: any) {
                console.warn('Photo upload failed, continuing with report text/GPS transmission to ensure emergency delivery:', photoErr);
                // Do not block life-critical emergency report transmission if photo fails!
              }
            }
          }

          // Submit report with idempotency key (clientReportId)
          await submitReport({
            ...item.payload,
            photoUrl: finalPhotoUrl,
          });

          // Server acknowledged — safe to remove local queued data and blob
          if (item.payload.photoBlobKey) {
            await deleteOfflinePhoto(item.payload.photoBlobKey).catch(() => {});
          }
          await removePendingReport(item.id);
          window.dispatchEvent(new CustomEvent('ews-reports-updated'));
        } catch (reportErr: any) {
          console.error('Failed to sync report:', item.id, reportErr);
          item.syncStatus = 'SYNC_FAILED';
          item.retryCount = (item.retryCount || 0) + 1;
          item.lastError = reportErr?.message || 'Server rejected or connection dropped';
          await updatePendingReport(item);
          hadErrors = true;
        }
      }

      // 2. Sync Pending Road Status Updates (Responder Mode)
      const roads = await getPendingRoadStatuses();
      for (const roadItem of roads) {
        try {
          roadItem.syncStatus = 'SYNCING';
          await updatePendingRoadStatus(roadItem);

          await updateRoadStatus(roadItem.regionId, roadItem.roadStatus);

          // Succeeded — remove from queue
          await removePendingRoadStatus(roadItem.id);
        } catch (roadErr: any) {
          console.error('Failed to sync road status for region:', roadItem.regionId, roadErr);
          roadItem.syncStatus = 'SYNC_FAILED';
          roadItem.retryCount = (roadItem.retryCount || 0) + 1;
          roadItem.lastError = roadErr?.message || 'Road status update rejected';
          await updatePendingRoadStatus(roadItem);
          hadErrors = true;
        }
      }

      setLastSyncTime(Date.now());
      if (hadErrors) {
        setSyncError('Some queued actions could not be synchronized. They remain saved for retry.');
      }
      window.dispatchEvent(new CustomEvent('ews-sync-completed', { detail: { hadErrors, timestamp: Date.now() } }));
    } finally {
      setIsSyncing(false);
      await refreshPending();
    }
  }, [isSyncing, refreshPending]);

  useEffect(() => {
    let intervalId: any = null;

    const handleOnline = () => {
      setIsOnline(true);
      if (!isSyncing) {
        syncNow();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueChange = () => {
      refreshPending();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('ews-queue-change', handleQueueChange);

    // Immediate check on mount: refresh pending and auto-sync immediately if online
    refreshPending().then(() => {
      if (navigator.onLine && !isSyncing) {
        syncNow();
      }
    });

    // Background auto-retry interval: periodically retry pending queue when online
    intervalId = setInterval(() => {
      if (navigator.onLine && !isSyncing) {
        getPendingReports().then((reps) => {
          if (reps.length > 0) {
            syncNow();
          } else {
            getPendingRoadStatuses().then((roads) => {
              if (roads.length > 0) {
                syncNow();
              }
            });
          }
        }).catch(() => {});
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('ews-queue-change', handleQueueChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, [syncNow, refreshPending, isSyncing]);

  const pendingCount = pendingReports.length + pendingRoads.length;

  return {
    isOnline,
    pendingReports,
    pendingRoads,
    pendingCount,
    isSyncing,
    syncNow,
    lastSyncTime,
    syncError,
    refreshPending,
  };
}
