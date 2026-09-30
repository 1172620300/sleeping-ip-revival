import { describe, expect, it } from "vitest";
import { loginSchema, registrationSchema } from "@/modules/identity/validation";

const input = { name: "演示用户", email: "person@demo.daosen.ai", password: "Demo-password-2026!", role: "DESIGNER" };

describe("registration boundary", () => {
  it("trims names and normalizes emails before uniqueness checks", () => {
    expect(registrationSchema.parse({ ...input, name: "  演示用户  ", email: "  PERSON@Demo.Daosen.AI  " }))
      .toMatchObject({ name: "演示用户", email: "person@demo.daosen.ai" });
  });

  it.each(["DESIGNER", "STORE_OWNER"])("allows public role %s", (role) => {
    expect(registrationSchema.parse({ ...input, role }).role).toBe(role);
  });

  it.each(["ADMIN", "STAFF", "USER", "unknown"])("rejects self-assigned role %s", (role) => {
    expect(registrationSchema.safeParse({ ...input, role }).success).toBe(false);
  });

  it.each([{ status: "APPROVED" }, { roleRefId: "admin" }, { passwordHash: "injected" }, { id: "admin" }])("rejects privilege/field injection %j", (field) => {
    expect(registrationSchema.safeParse({ ...input, ...field }).success).toBe(false);
  });

  it("defaults to DESIGNER if role is omitted", () => {
    const { role: _, ...withoutRole } = input;
    expect(registrationSchema.parse(withoutRole).role).toBe("DESIGNER");
  });

  it("requires 12 password characters and at most 72 UTF-8 bytes", () => {
    expect(registrationSchema.safeParse({ ...input, password: "a".repeat(11) }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...input, password: "a".repeat(12) }).success).toBe(true);
    expect(registrationSchema.safeParse({ ...input, password: "a".repeat(72) }).success).toBe(true);
    expect(registrationSchema.safeParse({ ...input, password: "a".repeat(73) }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...input, password: "密".repeat(24) }).success).toBe(true);
    expect(registrationSchema.safeParse({ ...input, password: "密".repeat(25) }).success).toBe(false);
  });

  it("rejects invalid contact fields and does not trim passwords", () => {
    expect(registrationSchema.safeParse({ ...input, phone: "0".repeat(31) }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...input, purpose: "x".repeat(301) }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...input, email: "not-an-email" }).success).toBe(false);
    expect(registrationSchema.parse({ ...input, password: "  Demo-password-2026!  " }).password).toBe("  Demo-password-2026!  ");
  });

  it("accepts the documented demo password", () => {
    expect(loginSchema.safeParse({ email: "designer@demo.daosen.ai", password: "Daosen@2026!" }).success).toBe(true);
  });
});
