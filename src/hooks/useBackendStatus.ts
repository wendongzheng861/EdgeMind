import { useEffect, useState } from 'react';
import {
  BackendApi,
  getBackendStatus,
  subscribeBackendStatus,
  type BackendStatus,
} from '../services/backend';

export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState(getBackendStatus);

  useEffect(() => {
    const unsubscribe = subscribeBackendStatus(setStatus);
    if (BackendApi.isConfigured()) {
      void BackendApi.health().catch(() => {
        // The service publishes an offline state and repositories keep working locally.
      });
    }
    return unsubscribe;
  }, []);

  return status;
}
