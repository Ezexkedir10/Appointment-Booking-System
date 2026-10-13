/**
 * Minimal fixed-window limiter for unauthenticated endpoints. It is per server
 * instance (in memory); for multi-instance deployments swap it for Redis/Upstash.
 */
const hits = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count += 1
  return entry.count <= limit
}
