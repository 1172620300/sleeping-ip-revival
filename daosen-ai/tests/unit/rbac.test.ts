import { describe, expect, it } from "vitest";
import { ACCOUNT_STATUSES, ROLES, canEnterBusiness, canManageUsers, isAccountStatus, isRoleCode } from "@/server/rbac";

describe("Phase 1 roles and account states", () => {
  it("defines the four product roles", () => {
    expect(ROLES).toEqual(["DESIGNER", "STORE_OWNER", "STAFF", "ADMIN"]);
  });

  it("defines the complete account status lifecycle", () => {
    expect(ACCOUNT_STATUSES).toEqual(["PENDING", "APPROVED", "REJECTED", "DISABLED"]);
    expect(isAccountStatus("APPROVED")).toBe(true);
    expect(isAccountStatus("UNKNOWN")).toBe(false);
  });

  it("requires approval before protected business access", () => {
    expect(canEnterBusiness("APPROVED")).toBe(true);
    expect(canEnterBusiness("PENDING")).toBe(false);
    expect(canEnterBusiness("REJECTED")).toBe(false);
    expect(canEnterBusiness("DISABLED")).toBe(false);
  });

  it("separates role capabilities", () => {
    expect(canManageUsers("ADMIN")).toBe(true);
    expect(canManageUsers("STAFF")).toBe(false);
    expect(canManageUsers("DESIGNER")).toBe(false);
    expect(canManageUsers("STORE_OWNER")).toBe(false);
    expect(isRoleCode("STORE_OWNER")).toBe(true);
    expect(isRoleCode("USER")).toBe(false);
  });
});
