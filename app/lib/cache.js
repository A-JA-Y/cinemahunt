// Process-local TTL cache. A film's vibe analysis doesn't change between requests,
// so this keeps repeat visits instant and well clear of Groq's free-tier rate limit.
// Per-instance only — serverless cold starts drop it, which is fine for a read cache.

const MAX_ENTRIES = 300;
const store = new Map();

/**
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<any>} produce
 */
export async function cached(key, ttlMs, produce) {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) {
    // Refresh recency so the LRU eviction below keeps hot films around.
    store.delete(key);
    store.set(key, hit);
    return hit.value;
  }

  const value = await produce();

  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

export const DAY = 86_400_000;
export const HOUR = 3_600_000;
