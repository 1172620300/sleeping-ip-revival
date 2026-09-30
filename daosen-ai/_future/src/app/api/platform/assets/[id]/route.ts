import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { storage } from "@/server/storage";
import { ApiError, errorResponse } from "@/server/http";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    const asset = await db.asset.findUnique({ where: { id: (await context.params).id } });
    if (!asset) throw new ApiError(404, "文件不存在", "NOT_FOUND");
    const publicAsset = asset.visibility === "PUBLIC";
    if (!publicAsset && (!actor || (actor.id !== asset.ownerId && actor.role !== "ADMIN"))) throw new ApiError(403, "无权访问该文件", "FORBIDDEN");
    const data = await storage.get(asset.storageKey);
    return new Response(data as BodyInit, { headers: { "Content-Type": asset.mimeType, "Content-Length": String(asset.size), "Cache-Control": publicAsset ? "public, max-age=300" : "private, no-store", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.fileName)}` } });
  } catch (error) { return errorResponse(error); }
}
