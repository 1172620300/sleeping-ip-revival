/** Single-process Demo guard. Deployment across instances needs a shared store. */
export class FixedWindowLimiter {
  private entries = new Map<string, { count: number; expiresAt: number }>();

  constructor(private maxAttempts: number, private windowMs: number, private maxKeys = 1000) {}

  consume(key: string, now = Date.now()): boolean {
    for (const [entryKey, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(entryKey);
    }
    const entry = this.entries.get(key);
    if (entry) {
      if (entry.count >= this.maxAttempts) return false;
      entry.count += 1;
      return true;
    }
    // Reject new keys at capacity; never evict an active block for an attacker.
    if (this.entries.size >= this.maxKeys) return false;
    this.entries.set(key, { count: 1, expiresAt: now + this.windowMs });
    return true;
  }

  clear(key: string): void { this.entries.delete(key); }
}

export function createIdentityLimiters() {
  return {
    loginGlobal: new FixedWindowLimiter(80, 60_000, 1),
    loginEmail: new FixedWindowLimiter(8, 15 * 60_000),
    registrationGlobal: new FixedWindowLimiter(30, 60 * 60_000, 1),
    registrationEmail: new FixedWindowLimiter(3, 60 * 60_000),
  };
}
