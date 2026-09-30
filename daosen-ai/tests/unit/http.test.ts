import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, body, errorResponse, requireAdmin, requireUser, verifyOrigin } from "@/server/http";
import type { SafeUser } from "@/modules/identity/types";

const user: SafeUser = { id: "one", name: "测试用户", email: "one@demo.daosen.ai", role: "DESIGNER", status: "APPROVED", reviewNote: null };
afterEach(() => { vi.unstubAllEnvs(); });

describe("HTTP safety boundary", () => {
  it("accepts same-origin writes and rejects missing or cross-site origins", () => {
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    expect(() => verifyOrigin(new Request("http://localhost:3000/api/platform/register", { method: "POST", headers: { origin: "http://localhost:3000" } }))).not.toThrow();
    for (const origin of ["", "null", "http://malicious.example", "http://localhost:3001"]) {
      expect(() => verifyOrigin(new Request("http://localhost:3000/api/platform/register", { method: "POST", headers: { origin } }))).toThrow("拒绝跨站请求");
    }
    expect(() => verifyOrigin(new Request("http://localhost:3000/api/platform/register", { method: "POST", headers: { origin: "http://localhost:3000", "sec-fetch-site": "cross-site" } }))).toThrow();
  });

  it("does not trust a forged request Host over the configured canonical origin", () => {
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    expect(() => verifyOrigin(new Request("http://malicious.example/api/platform/register", { method: "POST", headers: { origin: "http://malicious.example" } }))).toThrow();
  });

  it("rejects non-JSON, malformed JSON and oversized streaming bodies", async () => {
    const request = (value: string, type = "application/json") => new Request("http://localhost:3000", { method: "POST", headers: { "content-type": type }, body: value });
    await expect(body(request("{}", "text/plain"), z.object({}))).rejects.toMatchObject({ status: 415 });
    await expect(body(request("{"), z.object({}))).rejects.toMatchObject({ status: 400, code: "INVALID_JSON" });
    await expect(body(request("a".repeat(16_385)), z.object({}))).rejects.toMatchObject({ status: 413 });
    expect(await body(request('{"name":"test"}', "application/json; charset=utf-8"), z.object({ name: z.string() }))).toEqual({ name: "test" });
  });

  it("uses 401 for anonymous access and 403 for known unapproved users", () => {
    expect(() => requireUser(null)).toThrow(expect.objectContaining({ status: 401 }));
    for (const status of ["PENDING", "REJECTED", "DISABLED"] as const) {
      expect(() => requireUser({ ...user, status })).toThrow(expect.objectContaining({ status: 403, code: "ACCOUNT_NOT_APPROVED" }));
    }
    expect(requireUser(user)).toEqual(user);
  });

  it("requires both APPROVED status and ADMIN role", () => {
    for (const role of ["DESIGNER", "STORE_OWNER", "STAFF"] as const) {
      expect(() => requireAdmin({ ...user, role })).toThrow(expect.objectContaining({ status: 403, code: "FORBIDDEN" }));
    }
    expect(() => requireAdmin({ ...user, role: "ADMIN", status: "PENDING" })).toThrow();
    expect(requireAdmin({ ...user, role: "ADMIN" }).id).toBe(user.id);
  });

  it("returns stable no-store error envelopes without exposing server details", async () => {
    const response = errorResponse(new ApiError(403, "权限不足", "FORBIDDEN"));
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "权限不足", code: "FORBIDDEN" });
    const unavailable = errorResponse({ code: "P1001", message: "postgresql://secret:secret@internal" });
    expect(unavailable.status).toBe(503);
    expect(JSON.stringify(await unavailable.json())).not.toContain("secret");
  });
});
