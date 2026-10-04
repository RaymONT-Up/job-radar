/**
 * Simple in-memory rate limiter for API routes.
 * Prevents UI from firing 50 parallel external requests when user clicks rapidly.
 *
 * Usage:
 *   const limiter = getRateLimiter("sources-fetch", { maxCalls: 1, windowMs: 10_000 });
 *   const allowed = limiter.allow(request);
 *   if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

interface RateLimitOptions {
  /** Max calls allowed within windowMs */
  maxCalls: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limiters = new Map<string, Map<string, RateLimitEntry>>();

function getLimiterStore(name: string) {
  if (!limiters.has(name)) limiters.set(name, new Map());
  return limiters.get(name)!;
}

function getClientKey(request: Request): string {
  // In local-first mode there's only one user, so we use a fixed key.
  // In future SaaS mode this would be user ID or IP.
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = request.headers.get("x-real-ip");
  return forwarded ? forwarded.split(",")[0].trim() : ip || "local";
}

export function getRateLimiter(name: string, options: RateLimitOptions) {
  return {
    allow(request: Request): boolean {
      const store = getLimiterStore(name);
      const key = getClientKey(request);
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now >= entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + options.windowMs });
        return true;
      }
      if (entry.count >= options.maxCalls) return false;
      entry.count += 1;
      return true;
    },
    /** Returns remaining wait time in seconds, or 0 if allowed */
    retryAfterSeconds(request: Request): number {
      const store = getLimiterStore(name);
      const key = getClientKey(request);
      const entry = store.get(key);
      if (!entry || Date.now() >= entry.resetAt) return 0;
      return Math.ceil((entry.resetAt - Date.now()) / 1000);
    },
  };
}

// Pre-configured limiters for known heavy endpoints
export const sourceFetchLimiter = getRateLimiter("sources-fetch", { maxCalls: 2, windowMs: 15_000 });
export const vacancyVerifyLimiter = getRateLimiter("vacancy-verify", { maxCalls: 1, windowMs: 30_000 });
export const sourcesParseLimiter = getRateLimiter("sources-parse", { maxCalls: 3, windowMs: 10_000 });
