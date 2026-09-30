import { describe, expect, it } from "vitest";
import { FixedWindowLimiter } from "@/modules/identity/rate-limit";

describe("bounded Demo rate limiter", () => {
  it("resets an expired window without extending a block indefinitely", () => {
    const limiter = new FixedWindowLimiter(2, 1000);
    expect(limiter.consume("email", 0)).toBe(true);
    expect(limiter.consume("email", 100)).toBe(true);
    expect(limiter.consume("email", 999)).toBe(false);
    expect(limiter.consume("email", 1000)).toBe(true);
  });

  it("rejects new keys when full instead of evicting active blocks", () => {
    const limiter = new FixedWindowLimiter(1, 1000, 2);
    expect(limiter.consume("one", 0)).toBe(true);
    expect(limiter.consume("two", 0)).toBe(true);
    expect(limiter.consume("three", 1)).toBe(false);
    expect(limiter.consume("one", 2)).toBe(false);
    expect(limiter.consume("three", 1000)).toBe(true);
  });

  it("allows explicit clearing after successful login", () => {
    const limiter = new FixedWindowLimiter(1, 1000);
    expect(limiter.consume("email", 0)).toBe(true);
    expect(limiter.consume("email", 1)).toBe(false);
    limiter.clear("email");
    expect(limiter.consume("email", 2)).toBe(true);
  });
});
