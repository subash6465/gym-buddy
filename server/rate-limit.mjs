// Process-local protection; multiple API instances also need shared limits at
// their gateway. Expiration and a capacity limit bound memory consumption.
export function createRateLimiter({ limit = 60, windowMs = 60_000, maxEntries = 10_000, now = Date.now } = {}) {
  const entries = new Map();
  return (key) => {
    const time = now();
    for (const [entryKey, entry] of entries) if (entry.expires <= time) entries.delete(entryKey);
    let entry = entries.get(key);
    if (!entry) {
      if (entries.size >= maxEntries) return false;
      entry = { count: 0, expires: time + windowMs };
      entries.set(key, entry);
    }
    entry.count++;
    return entry.count <= limit;
  };
}
