import { z } from "zod";
import { IdentityError } from "@/modules/identity/types";
import { canEnterBusiness, canManageUsers } from "./rbac";
import type { SafeUser } from "./auth";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = "REQUEST_FAILED") {
    super(message);
    this.name = "ApiError";
  }
}

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function body<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.infer<T>> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new ApiError(415, "请使用 JSON 请求", "CONTENT_TYPE");
  const maxBytes = 16_384;
  if (Number(request.headers.get("content-length")) > maxBytes) throw new ApiError(413, "请求内容过大", "PAYLOAD_TOO_LARGE");
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  if (reader) {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) {
          await reader.cancel();
          throw new ApiError(413, "请求内容过大", "PAYLOAD_TOO_LARGE");
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  let input: unknown;
  try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(400, "请求 JSON 格式错误", "INVALID_JSON"); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, "输入字段无效，请检查姓名、邮箱、身份和密码（至少 12 位且最多 72 字节）", "VALIDATION_ERROR");
  return parsed.data;
}

export function requireUser(user: SafeUser | null): SafeUser {
  if (!user) throw new ApiError(401, "请先登录", "UNAUTHENTICATED");
  if (!canEnterBusiness(user.status)) throw new ApiError(403, "账号尚未审核通过或已停用", "ACCOUNT_NOT_APPROVED");
  return user;
}

export function requireAdmin(user: SafeUser | null): SafeUser {
  const actor = requireUser(user);
  if (!canManageUsers(actor.role)) throw new ApiError(403, "仅管理员可执行此操作", "FORBIDDEN");
  return actor;
}

export function verifyOrigin(request: Request): void {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  const canonical = new URL(process.env.NEXTAUTH_URL || request.url).origin;
  if (!origin || origin !== canonical || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "拒绝跨站请求", "INVALID_ORIGIN");
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError || error instanceof IdentityError) return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof z.ZodError) return json({ error: "输入字段无效", code: "VALIDATION_ERROR" }, 400);
  const code = (error as { code?: string })?.code;
  if (code === "P2002") return json({ error: "记录已存在，请刷新后重试", code: "CONFLICT" }, 409);
  if (code === "P2025") return json({ error: "记录不存在", code: "NOT_FOUND" }, 404);
  if (code === "P1000" || code === "P1001" || code === "P1002" || code === "P2021") {
    return json({ error: "Demo 数据库尚未就绪，请先完成数据库初始化", code: "DATABASE_UNAVAILABLE" }, 503);
  }
  // Never log request bodies, credentials, password hashes, or connection strings.
  console.error("[platform] Request failed", typeof code === "string" ? code : "INTERNAL_ERROR");
  return json({ error: "服务暂时不可用，请稍后重试", code: "INTERNAL_ERROR" }, 500);
}
