import { useState, useEffect } from 'react';

/**
 * Debounces a value to prevent excessive API calls during typing.
 * Challenge 272: Prevents unnecessary requests during high-frequency input events.
 * Challenge 276: Smooth search and filter operations without client-side lag.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

