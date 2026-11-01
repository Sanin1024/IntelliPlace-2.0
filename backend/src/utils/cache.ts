/**
 * In-Memory TTL Cache Utility
 * Challenge 282: Cache expensive analytics and frequent database lookups
 * Challenge 288: Invalidation by exact key or pattern
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

// Periodic cleanup of expired keys every 60 seconds (unref'd to prevent holding process)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
}, 60000);
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

/**
 * Retrieve cached item if present and not expired
 */
export function getCache<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value as T;
}

/**
 * Set cache item with time-to-live in seconds
 */
export function setCache<T>(key: string, value: T, ttlSeconds: number = 300): void {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cacheStore.set(key, { value, expiresAt });
}

/**
 * Delete a specific key from cache
 */
export function invalidateCache(key: string): void {
  cacheStore.delete(key);
}

/**
 * Invalidate all cache entries matching a pattern (string prefix/substring or regex)
 */
export function invalidatePattern(pattern: string | RegExp): void {
  for (const key of cacheStore.keys()) {
    if (typeof pattern === 'string') {
      if (key.includes(pattern)) {
        cacheStore.delete(key);
      }
    } else if (pattern.test(key)) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  cacheStore.clear();
}

/**
 * Get internal cache stats for diagnostics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cacheStore.size,
    keys: Array.from(cacheStore.keys()),
  };
}

