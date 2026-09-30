import { currentUser } from "@/server/auth";
import { errorResponse, verifyOrigin, json, body, ApiError, requireUser } from "@/server/http";
import { domainRoute } from "@/server/domain";
import { createTask, retryTask, cancelTask, serializeTask } from "@/server/tasks";
import { z } from "zod";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const taskSchema = z.object({
  type: z.enum(["DESIGN", "IMAGE", "VIDEO"]),
  input: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().trim().min(8).max(128)
});
async function taskRoute(request: Request, path: string[], user: Awaited<ReturnType<typeof currentUser>>) {
  const actor = requireUser(user);
  if (path.length === 1 && request.method === "GET") {
    const tasks = await db.task.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, take: 50 });
    return json({ tasks: tasks.map(t => serializeTask(t as unknown as Record<string, unknown>)) });
  }
  if (path.length === 1 && request.method === "POST") {
    const input = await body(request, taskSchema);
    const result = await createTask(actor.id, input.type, { ...input.input, simulateFailure: Boolean(input.input.simulateFailure) }, input.idempotencyKey);
    return json({ task: result.task }, result.created ? 201 : 200);
  }
  const task = await db.task.findFirst({ where: { id: path[1], userId: actor.id } });
  if (!task) throw new ApiError(404, "任务不存在", "NOT_FOUND");
  if (path.length === 2 && request.method === "GET") return json({ task: serializeTask(task as unknown as Record<string, unknown>) });
  if (path.length === 3 && request.method === "POST" && path[2] === "retry") {
    const retried = await retryTask(actor.id, task.id);
    return json({ task: serializeTask(retried as unknown as Record<string, unknown>) });
  }
  if (path.length === 3 && request.method === "POST" && path[2] === "cancel") {
    const cancelled = await cancelTask(actor.id, task.id);
    return json({ task: serializeTask(cancelled as unknown as Record<string, unknown>) });
  }
  throw new ApiError(404, "任务操作不存在", "NOT_FOUND");
}

async function handler(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    verifyOrigin(request);
    const { path } = await context.params;
    const user = await currentUser();
    if (path[0] === "tasks") return taskRoute(request, path.slice(1), user);
    const result = await domainRoute(request, path, user);
    return result ?? json({ error: "接口不存在", code: "NOT_FOUND" }, 404);
  } catch (error) { return errorResponse(error); }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
