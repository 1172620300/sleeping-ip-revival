import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { storage } from "@/server/storage";
import { ApiError, errorResponse, json, requireUser, verifyOrigin } from "@/server/http";

const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "video/webm", "video/mp4", "application/pdf"]);
const maxSize = 20 * 1024 * 1024;
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const actor = requireUser(await currentUser());
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "ATTACHMENT").slice(0, 30);
    if (!(file instanceof File)) throw new ApiError(400, "请选择文件", "FILE_REQUIRED");
    if (!allowed.has(file.type)) throw new ApiError(415, "不支持的文件格式", "UNSUPPORTED_FILE");
    if (file.size > maxSize) throw new ApiError(413, "文件不能超过 20MB", "FILE_TOO_LARGE");
    const id = crypto.randomUUID();
    const key = `${actor.id}/${id}-${file.name.replace(/[^\w.\-\u4e00-\u9fff]/g, "_")}`;
    await storage.put(key, new Uint8Array(await file.arrayBuffer()), file.type);
    const asset = await db.asset.create({ data: { id, ownerId: actor.id, kind, visibility: "PRIVATE", storageKey: key, mimeType: file.type, size: file.size, fileName: file.name } });
    return json({ asset: { id: asset.id, fileName: asset.fileName, mimeType: asset.mimeType, size: asset.size, url: `/api/platform/assets/${asset.id}` } }, 201);
  } catch (error) { return errorResponse(error); }
}
