import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';

export interface UseFetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom data-fetching hook.
 * Challenge 261: Handles unexpected API responses safely.
 * Challenge 271: Manages loading states reliably (prevents infinite spinners).
 * Challenge 272: Deduplicates concurrent requests using requestId ref.
 */
export function useFetch<T>(url: string | null, options?: any): UseFetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!url);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchData = useCallback(async () => {
    if (!url) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const currentRequestId = ++requestId.current;

    try {
      const response = await api.get(url, options);
      // Ensure we only set state for the most recent request
      if (currentRequestId === requestId.current) {
        // Challenge 261: Validate response structure
        if (response.data && typeof response.data === 'object' && 'success' in response.data) {
          setData(response.data.data as T);
        } else {
          setData(response.data as T);
        }
      }
    } catch (err: any) {
      if (currentRequestId === requestId.current) {
        setError(err?.response?.data?.error || err.message || 'An unexpected error occurred');
        setData(null);
      }
    } finally {
      if (currentRequestId === requestId.current) {
        setIsLoading(false);
      }
    }
  }, [url, JSON.stringify(options)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

