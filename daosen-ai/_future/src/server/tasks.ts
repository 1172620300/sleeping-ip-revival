import crypto from "node:crypto";
import { db } from "./db";
import { Prisma } from "@prisma/client";
import { providers, type ProviderInput, type ProviderTaskType } from "./providers";

const taskView = { id: true, userId: true, provider: true, model: true, type: true, input: true, status: true, result: true, error: true, attempts: true, createdAt: true, updatedAt: true } as const;
export function hashTaskInput(type: ProviderTaskType, input: ProviderInput) {
  return crypto.createHash("sha256").update(JSON.stringify({ type, input })).digest("hex");
}
export function serializeTask(task: Record<string, unknown>) {
  return { ...task, input: task.input ?? {}, result: task.result ?? null, error: task.error ?? null };
}
export async function createTask(userId: string, type: ProviderTaskType, input: ProviderInput, idempotencyKey: string) {
  const inputHash = hashTaskInput(type, input);
  const existing = await db.task.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } }, select: taskView });
  if (existing) return { task: serializeTask(existing as unknown as Record<string, unknown>), created: false };
  const task = await db.task.create({ data: { userId, provider: "mock", model: type === "VIDEO" ? "mock-video-v1" : type === "IMAGE" ? "mock-image-v1" : "mock-llm-v1", type, input: input as object, status: "QUEUED", idempotencyKey, inputHash }, select: taskView });
  // Wake the durable processor immediately in-process; a separate worker can also claim it.
  void processTask(task.id);
  return { task: serializeTask(task as unknown as Record<string, unknown>), created: true };
}
export async function processTask(taskId: string) {
  const claimed = await db.task.updateMany({ where: { id: taskId, status: "QUEUED" }, data: { status: "PROCESSING", claimedAt: new Date() } });
  if (!claimed.count) return db.task.findUnique({ where: { id: taskId }, select: taskView });
  const task = await db.task.findUnique({ where: { id: taskId }, select: taskView });
  if (!task) return null;
  const input = (task.input ?? {}) as ProviderInput;
  try {
    if (input.simulateFailure) throw new Error("Mock Provider 模拟失败：输入被标记为失败");
    let result;
    if (task.type === "DESIGN") {
      const analysis = await providers.llm.analyze(input);
      const outputs = await providers.image.generate({ ...input, prompt: analysis.prompt, count: input.count ?? 2 });
      result = { ...analysis, ...outputs, mock: true as const };
    } else if (task.type === "IMAGE") result = { ...(await providers.image.generate(input)), mock: true as const };
    else if (task.type === "VIDEO") result = { ...(await providers.video.generate(input)), mock: true as const };
    else throw new Error("不支持的任务类型");
    return db.task.update({ where: { id: taskId }, data: { status: "SUCCEEDED", result, error: null }, select: taskView });
  } catch (error) {
    return db.task.update({ where: { id: taskId }, data: { status: "FAILED", result: Prisma.JsonNull, error: error instanceof Error ? error.message : "Provider 失败" }, select: taskView });
  }
}
export async function retryTask(userId: string, taskId: string) {
  const current = await db.task.findFirst({ where: { id: taskId, userId } });
  if (!current) return null;
  if (current.status !== "FAILED") throw new Error("只有失败任务可以重试");
  const task = await db.task.update({ where: { id: taskId }, data: { status: "QUEUED", result: Prisma.JsonNull, error: null, attempts: { increment: 1 }, claimedAt: null }, select: taskView });
  void processTask(task.id);
  return task;
}
export async function cancelTask(userId: string, taskId: string) {
  return db.task.update({ where: { id: taskId, userId, status: { in: ["QUEUED", "PROCESSING"] } }, data: { status: "CANCELLED", error: "用户取消" }, select: taskView });
}
export async function processQueuedTasks(limit = 5) {
  const tasks = await db.task.findMany({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, take: limit, select: { id: true } });
  for (const task of tasks) await processTask(task.id);
  return tasks.length;
}
