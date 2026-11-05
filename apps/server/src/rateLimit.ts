/** Tiny in-memory fixed-window limiter. Good enough for a single instance. */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Returns false when `key` is over its limit. */
  allow(key: string): boolean {
    const now = Date.now();
    if (this.hits.size > 10_000) this.prune(now);
    const entry = this.hits.get(key);
    return !entry || entry.resetAt <= now || entry.count < this.max;
  }

  /** Record one hit for `key`. */
  hit(key: string): void {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count += 1;
    }
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  clear(): void {
    this.hits.clear();
  }

  private prune(now: number) {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}
