export type UserRole = "DESIGNER" | "STORE_OWNER" | "STAFF" | "ADMIN";
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED" | "DISABLED";

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  reviewNote?: string | null;
};

export class ApiClientError extends Error {
  constructor(message: string, public status = 500, public code = "CLIENT_ERROR") {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError("无法连接演示服务，请检查网络后重试。", 0, "NETWORK_ERROR");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const record = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
    throw new ApiClientError(
      typeof record.error === "string" ? record.error : "请求暂时无法完成，请稍后重试。",
      response.status,
      typeof record.code === "string" ? record.code : "HTTP_ERROR",
    );
  }
  if (payload === null && response.status !== 204) {
    throw new ApiClientError("演示服务返回了无效响应，请重试。", response.status, "INVALID_RESPONSE");
  }
  return payload as T;
}

export const getSession = (signal?: AbortSignal) => api<{ user: SafeUser | null }>("/api/platform/session", { signal });
export const getUsers = (signal?: AbortSignal) => api<{ users: SafeUser[] }>("/api/platform/users", { signal });
