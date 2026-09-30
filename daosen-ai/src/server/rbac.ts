export const ROLES = ["DESIGNER", "STORE_OWNER", "STAFF", "ADMIN"] as const;
export type RoleCode = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "DISABLED"] as const;
export type AccountStatusCode = (typeof ACCOUNT_STATUSES)[number];

export function isRoleCode(value: string): value is RoleCode {
  return (ROLES as readonly string[]).includes(value);
}

export function isAccountStatus(value: string): value is AccountStatusCode {
  return (ACCOUNT_STATUSES as readonly string[]).includes(value);
}

/** Authentication is separate from authorization: approved is required for
 * protected work, while the role decides which protected work is allowed. */
export function canEnterBusiness(status: string): boolean {
  return status === "APPROVED";
}

export function canManageUsers(role: string): boolean {
  return role === "ADMIN";
}
