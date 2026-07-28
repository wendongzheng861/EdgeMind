import { useEffect, useState } from 'react';

export type WebLLMPhase =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'unsupported'
  | 'error';

export interface WebLLMStatus {
  phase: WebLLMPhase;
  progress: number;
  detail: string;
}

let currentStatus: WebLLMStatus = {
  phase: 'idle',
  progress: 0,
  detail: '首次启用时下载离线模型',
};

const listeners = new Set<(status: WebLLMStatus) => void>();

export function setWebLLMStatus(next: WebLLMStatus): void {
  currentStatus = next;
  listeners.forEach((listener) => listener(currentStatus));
}

export function subscribeWebLLMStatus(
  listener: (status: WebLLMStatus) => void
): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => listeners.delete(listener);
}

export function useWebLLMStatus(): WebLLMStatus {
  const [status, setStatus] = useState<WebLLMStatus>(currentStatus);

  useEffect(() => subscribeWebLLMStatus(setStatus), []);

  return status;
}
