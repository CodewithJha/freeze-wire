import { useCallback, useEffect, useState } from 'react';
import { api, productErrorMessage, type HealthResponse } from '@/lib/api';

export function useHealth(pollMs = 30_000) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const body = await api.health();
      setHealth(body);
      setError(null);
    } catch (err) {
      setHealth(null);
      setError(productErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, refresh]);

  return { health, error, refresh };
}
