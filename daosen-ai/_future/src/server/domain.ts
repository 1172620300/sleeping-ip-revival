import { z } from "zod";
import { db } from "./db";
import { ApiError, body, json, requireAdmin, requireUser } from "./http";
import type { SafeUser } from "./auth";

type Viewer = SafeUser | null;
type AnyRecord = Record<string, any>;

const workCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  prompt: z.string().max(10000).optional().nullable(),
  promptPublic: z.boolean().default(false),
  allowRemix: z.boolean().default(true),
  visibility: z.enum(["PRIVATE", "PUBLIC"]).default("PUBLIC"),
  imageUrl: z.string().max(1000).optional().nullable(),
  assetId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
});

const workPatchSchema = workCreateSchema.partial();
const commentSchema = z.object({ content: z.string().trim().min(1).max(1000) });
const interactionSchema = z.object({ type: z.enum(["LIKE", "BOOKMARK"]) });
const reportSchema = z.object({ workId: z.string().min(1), reason: z.string().trim().min(1).max(1000) });
const chatSchema = z.object({ message: z.string().trim().min(1).max(5000), chatId: z.string().optional() });
const materialRequestSchema = z.object({
  materialId: z.string().min(1),
  kind: z.enum(["CONSULTATION", "SAMPLE"]),
  contact: z.string().trim().min(2).max(200),
  purpose: z.string().trim().min(1).max(2000),
  notes: z.string().max(3000).optional().nullable(),
  idempotencyKey: z.string().trim().min(1).max(200),
});
const labApplicationSchema = z.object({
  product: z.string().trim().min(1).max(200),
  requirements: z.string().trim().min(1).max(5000),
  contact: z.string().trim().min(2).max(200),
  attachmentIds: z.array(z.string()).max(20).default([]),
  idempotencyKey: z.string().trim().min(1).max(200),
});
const manufacturingSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  contact: z.string().trim().min(2).max(200),
  workId: z.string().optional().nullable(),
});

function dateValue(value: unknown): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function safeImageUrl(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null || value === "") return value;
  // User supplied images are intentionally limited to local demo files or the
  // protected asset endpoint. This prevents an arbitrary remote URL from
  // becoming a tracking or SSRF surface in the public gallery.
  if (!/^\/(?:demo|api\/platform\/assets)\/[A-Za-z0-9._~!$&'()*+,;=:@%\-/]+$/.test(value)) {
    throw new ApiError(400, "imageUrl 仅支持平台演示文件或受保护资产路径", "INVALID_IMAGE_URL");
  }
  return value;
}

function publicWorkWhere() {
  return { visibility: "PUBLIC" };
}

function canReadWork(work: AnyRecord, viewer: Viewer) {
  return work.visibility === "PUBLIC" || Boolean(viewer && (viewer.id === work.authorId || viewer.role === "ADMIN"));
}

function workDto(work: AnyRecord, viewer: Viewer = null) {
  const interactions: AnyRecord[] = Array.isArray(work.interactions) ? work.interactions : [];
  const likes = interactions.filter((item) => item.type === "LIKE").length;
  const bookmarks = interactions.filter((item) => item.type === "BOOKMARK").length;
  const canSeePrompt = Boolean(work.prompt && (work.promptPublic || (viewer && (viewer.id === work.authorId || viewer.role === "ADMIN"))));
  return {
    id: work.id,
    title: work.title,
    description: work.description,
    ...(canSeePrompt ? { prompt: work.prompt } : {}),
    promptPublic: Boolean(work.promptPublic),
    allowRemix: Boolean(work.allowRemix),
    visibility: work.visibility,
    featured: Boolean(work.featured),
    imageUrl: work.imageUrl ?? null,
    author: work.author ? { id: work.author.id, name: work.author.name } : { id: work.authorId, name: "" },
    createdAt: dateValue(work.createdAt),
    updatedAt: dateValue(work.updatedAt),
    likes,
    bookmarks,
    remixedFromId: work.remixedFromId ?? null,
  };
}

function commentDto(comment: AnyRecord) {
  return {
    id: comment.id,
    content: comment.content,
    author: comment.user ? { id: comment.user.id, name: comment.user.name } : { id: comment.userId, name: "" },
    createdAt: dateValue(comment.createdAt),
  };
}

function sourceDto(source: AnyRecord) {
  return {
    id: source.id,
    title: source.title,
    category: source.category,
    summary: source.summary ?? null,
    content: source.content,
    tags: source.tags ?? [],
    sourceUrl: source.sourceUrl ?? null,
    imageUrl: source.imageUrl ?? null,
    updatedAt: dateValue(source.updatedAt),
  };
}

function materialDto(material: AnyRecord) {
  return {
    id: material.id,
    name: material.name,
    type: material.type,
    properties: material.properties ?? {},
    applications: material.applications ?? [],
    constraints: material.constraints ?? [],
    caseStudy: material.caseStudy ?? null,
    updatedAt: dateValue(material.updatedAt),
    imageUrl: material.imageUrl ?? null,
  };
}

function applicationDto(application: AnyRecord, viewer: Viewer = null) {
  const canSeeReport = Boolean(viewer && (viewer.id === application.requesterId || viewer.role === "ADMIN"));
  const reportAssetId = application.reportAssetId ?? application.reportAsset?.id;
  return {
    id: application.id,
    product: application.product,
    requirements: application.requirements,
    contact: application.contact,
    attachmentIds: application.attachmentIds ?? [],
    status: application.status,
    publicNote: application.publicNote ?? null,
    ...(canSeeReport && reportAssetId ? { reportUrl: `/api/platform/assets/${reportAssetId}` } : {}),
    createdAt: dateValue(application.createdAt),
    updatedAt: dateValue(application.updatedAt),
  };
}

function materialRequestDto(request: AnyRecord) {
  return {
    id: request.id,
    materialId: request.materialId,
    material: request.material ? materialDto(request.material) : undefined,
    kind: request.kind,
    contact: request.contact,
    purpose: request.purpose,
    notes: request.notes ?? null,
    status: request.status,
    createdAt: dateValue(request.createdAt),
    updatedAt: dateValue(request.updatedAt),
  };
}

function manufacturingDto(project: AnyRecord) {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    contact: project.contact,
    workId: project.workId ?? null,
    status: project.status,
    publicNote: project.publicNote ?? null,
    createdAt: dateValue(project.createdAt),
    updatedAt: dateValue(project.updatedAt),
  };
}

async function loadWork(id: string) {
  return db.work.findUnique({
    where: { id },
    include: { author: true, interactions: { select: { type: true } } },
  });
}

async function listWorks(viewer: Viewer, scope: string | null, sort: string | null) {
  const approvedViewer = viewer && viewer.status === "APPROVED" ? viewer : null;
  const where: AnyRecord = scope === "mine" && approvedViewer ? { authorId: approvedViewer.id } : publicWorkWhere();
  if (scope === "mine" && !approvedViewer) throw new ApiError(403, "请先完成审核", "APPROVAL_REQUIRED");
  if (sort === "featured") where.featured = true;
  const works = await db.work.findMany({
    where,
    include: { author: true, interactions: { select: { type: true } } },
    orderBy: sort === "latest" || !sort ? { createdAt: "desc" } : { createdAt: "desc" },
    take: 100,
  });
  if (sort === "popular") {
    works.sort((a: AnyRecord, b: AnyRecord) => (b.interactions?.length ?? 0) - (a.interactions?.length ?? 0));
  }
  return works.map((work) => workDto(work, viewer));
}

async function writeAudit(actor: SafeUser, action: string, entity: string, entityId: string, payload: AnyRecord = {}) {
  await db.auditLog.create({ data: { actorId: actor.id, action, entity, entityId, payload } });
}

async function home(viewer: Viewer) {
  const [works, news, events] = await Promise.all([
    db.work.findMany({ where: publicWorkWhere(), include: { author: true, interactions: { select: { type: true } } }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 6 }),
    db.newsItem.findMany({ orderBy: { publishedAt: "desc" }, take: 4 }),
    db.platformEvent.findMany({ where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 4 }),
  ]);
  return {
    works: works.map((work) => workDto(work, viewer)),
    news: news.map((item) => ({ id: item.id, title: item.title, summary: item.summary, content: item.content, imageUrl: item.imageUrl, publishedAt: dateValue(item.publishedAt) })),
    events: events.map((event) => ({ id: event.id, title: event.title, description: event.description, startsAt: dateValue(event.startsAt), location: event.location, imageUrl: event.imageUrl })),
  };
}

async function publicKnowledge(search: string | null, category: string | null) {
  const where: AnyRecord = { visibility: "PUBLIC" };
  if (category) where.category = category;
  if (search) {
    where.OR = [{ title: { contains: search } }, { summary: { contains: search } }, { content: { contains: search } }];
  }
  const rows = await db.knowledgeSource.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 });
  return rows.map(sourceDto);
}

async function chatResponse(actor: SafeUser, input: z.infer<typeof chatSchema>) {
  if (/模拟错误|simulate[_ -]?error/i.test(input.message)) {
    throw new ApiError(422, "AI 模拟错误：请修改问题后重试", "AI_SIMULATED_ERROR");
  }
  let chat: AnyRecord | null = null;
  if (input.chatId) {
    chat = await db.chat.findFirst({ where: { id: input.chatId, userId: actor.id } });
    if (!chat) throw new ApiError(404, "会话不存在", "CHAT_NOT_FOUND");
  } else {
    chat = await db.chat.create({ data: { userId: actor.id, title: input.message.slice(0, 40) } });
  }
  await db.chatMessage.create({ data: { chatId: chat.id, role: "user", content: input.message, sources: [] } });
  const [knowledge, works] = await Promise.all([
    db.knowledgeSource.findMany({ where: { visibility: "PUBLIC" }, orderBy: { updatedAt: "desc" }, take: 2 }),
    db.work.findMany({ where: publicWorkWhere(), include: { author: true }, orderBy: { createdAt: "desc" }, take: 1 }),
  ]);
  const sources = [
    ...knowledge.map((item) => ({ id: item.id, type: "KNOWLEDGE", title: item.title, category: item.category })),
    ...works.map((work) => ({ id: work.id, type: "WORK", title: work.title, category: "作品" })),
  ];
  const answer = `围绕“${input.message.slice(0, 80)}”，建议先明确目标用户与使用场景，再用材料约束筛选形态。你可以从一个小批量原型开始验证。`;
  await db.chatMessage.create({ data: { chatId: chat.id, role: "assistant", content: answer, sources } });
  return { chatId: chat.id, answer, sources };
}

async function profile(actor: SafeUser) {
  const [works, bookmarks, applications, materialRequests, projects, notifications] = await Promise.all([
    db.work.findMany({ where: { authorId: actor.id }, include: { author: true, interactions: { select: { type: true } } }, orderBy: { createdAt: "desc" } }),
    db.workInteraction.findMany({ where: { userId: actor.id, type: "BOOKMARK" }, include: { work: { include: { author: true, interactions: { select: { type: true } } } } }, orderBy: { createdAt: "desc" } }),
    db.labApplication.findMany({ where: { requesterId: actor.id }, include: { reportAsset: true }, orderBy: { createdAt: "desc" } }),
    db.materialRequest.findMany({ where: { requesterId: actor.id }, include: { material: true }, orderBy: { createdAt: "desc" } }),
    db.manufacturingProject.findMany({ where: { requesterId: actor.id }, orderBy: { createdAt: "desc" } }),
    db.notification.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return {
    works: works.map((work) => workDto(work, actor)),
    bookmarks: bookmarks.map((item: AnyRecord) => workDto(item.work, actor)),
    applications: applications.map((item) => applicationDto(item, actor)),
    materialRequests: materialRequests.map(materialRequestDto),
    projects: projects.map(manufacturingDto),
    notifications: notifications.map((item) => ({ id: item.id, type: item.type, title: item.title, body: item.body, readAt: dateValue(item.readAt), createdAt: dateValue(item.createdAt) })),
  };
}

async function adminSnapshot() {
  const [users, works, reports, labApplications, materialRequests, projects, tasks, settings, auditLogs] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" } }),
    db.work.findMany({ include: { author: true, interactions: { select: { type: true } } }, orderBy: { createdAt: "desc" } }),
    db.report.findMany({ include: { work: true, reporter: true }, orderBy: { createdAt: "desc" } }),
    db.labApplication.findMany({ include: { requester: true, reportAsset: true }, orderBy: { createdAt: "desc" } }),
    db.materialRequest.findMany({ include: { material: true, requester: true }, orderBy: { createdAt: "desc" } }),
    db.manufacturingProject.findMany({ include: { requester: true }, orderBy: { createdAt: "desc" } }),
    db.task.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.siteSetting.findUnique({ where: { id: "singleton" } }),
    db.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  return {
    users: users.map((item) => ({ id: item.id, name: item.name, email: item.email, role: item.role, status: item.status, reviewNote: item.reviewNote, createdAt: dateValue(item.createdAt) })),
    works: works.map((item) => workDto(item, { id: "admin", role: "ADMIN", status: "APPROVED" } as SafeUser)),
    reports: reports.map((item) => ({ id: item.id, workId: item.workId, workTitle: item.work.title, reporter: { id: item.reporter.id, name: item.reporter.name }, reason: item.reason, status: item.status, resolution: item.resolution, createdAt: dateValue(item.createdAt) })),
    labApplications: labApplications.map((item) => applicationDto(item, { id: "admin", role: "ADMIN", status: "APPROVED" } as SafeUser)),
    materialRequests: materialRequests.map(materialRequestDto),
    projects: projects.map(manufacturingDto),
    tasks: tasks.map((item) => ({ id: item.id, userId: item.userId, provider: item.provider, model: item.model, type: item.type, status: item.status, input: item.input, result: item.result, error: item.error, attempts: item.attempts, createdAt: dateValue(item.createdAt), updatedAt: dateValue(item.updatedAt) })),
    settings: settings ? { dailyTaskLimit: settings.dailyTaskLimit } : { dailyTaskLimit: 20 },
    auditLogs: auditLogs.map((item) => ({ id: item.id, actor: item.actor ? { id: item.actor.id, name: item.actor.name } : null, action: item.action, entity: item.entity, entityId: item.entityId, payload: item.payload, createdAt: dateValue(item.createdAt) })),
  };
}

export async function domainRoute(request: Request, path: string[], user: SafeUser | null): Promise<Response | null> {
  const method = request.method.toUpperCase();
  const segments = path.filter(Boolean);
  const url = new URL(request.url);
  const query = url.searchParams;

  // Home and public catalogue endpoints.
  if (segments.length === 0 || segments[0] === "home") {
    if (method !== "GET") return null;
    return json(await home(user));
  }

  if (segments[0] === "works") {
    if (segments.length === 1) {
      if (method === "GET") return json({ works: await listWorks(user, query.get("scope"), query.get("sort")) });
      if (method === "POST") {
        const actor = requireUser(user);
        const input = await body(request, workCreateSchema);
        safeImageUrl(input.imageUrl);
        if (input.assetId) {
          const asset = await db.asset.findFirst({ where: { id: input.assetId, ownerId: actor.id } });
          if (!asset) throw new ApiError(400, "素材不存在或不属于当前用户", "INVALID_ASSET");
        }
        const work = await db.work.create({ data: { ...input, authorId: actor.id } as any, include: { author: true, interactions: { select: { type: true } } } });
        return json({ work: workDto(work, actor) }, 201);
      }
      return null;
    }
    const workId = segments[1];
    if (segments.length === 2) {
      if (method === "GET") {
        const work = await loadWork(workId);
        if (!work || !canReadWork(work, user)) throw new ApiError(404, "作品不存在", "WORK_NOT_FOUND");
        return json({ work: workDto(work, user) });
      }
      if (method === "PATCH") {
        const actor = requireUser(user);
        const current = await loadWork(workId);
        if (!current) throw new ApiError(404, "作品不存在", "WORK_NOT_FOUND");
        if (actor.id !== current.authorId && actor.role !== "ADMIN") throw new ApiError(403, "无权修改该作品", "FORBIDDEN");
        const input = await body(request, workPatchSchema);
        if (input.imageUrl !== undefined) safeImageUrl(input.imageUrl);
        const changes: AnyRecord = { ...input };
        if (actor.role !== "ADMIN") {
          delete changes.featured;
          if (changes.visibility === "PRIVATE" || changes.visibility === "PUBLIC") {
            // Authors may switch their own work between public and private.
          }
        }
        const work = await db.work.update({ where: { id: workId }, data: changes, include: { author: true, interactions: { select: { type: true } } } });
        if (actor.role === "ADMIN") await writeAudit(actor, "UPDATE", "Work", workId, changes);
        return json({ work: workDto(work, actor) });
      }
    }
    if (segments.length === 3 && segments[2] === "remix" && method === "POST") {
      const actor = requireUser(user);
      const source = await loadWork(workId);
      if (!source || !canReadWork(source, user)) throw new ApiError(404, "作品不存在", "WORK_NOT_FOUND");
      if (!source.allowRemix) throw new ApiError(403, "作者未开放改编", "REMIX_DISABLED");
      const input = await body(request, z.object({ imageUrl: z.string().optional().nullable(), prompt: z.string().max(10000).optional().nullable() }));
      safeImageUrl(input.imageUrl);
      const prompt = input.prompt ?? (source.promptPublic || actor.id === source.authorId ? source.prompt : null);
      const remix = await db.work.create({ data: { title: `Remix · ${source.title}`, description: source.description, prompt, promptPublic: Boolean(input.prompt), allowRemix: true, visibility: "PUBLIC", imageUrl: input.imageUrl ?? source.imageUrl, authorId: actor.id, remixedFromId: source.id }, include: { author: true, interactions: { select: { type: true } } } });
      return json({ referenceWorkId: source.id, imageUrl: remix.imageUrl, prompt: remix.prompt, notice: "已创建改编作品" }, 201);
    }
    if (segments.length === 3 && segments[2] === "interaction" && method === "POST") {
      const actor = requireUser(user);
      const work = await loadWork(workId);
      if (!work || !canReadWork(work, user)) throw new ApiError(404, "作品不存在", "WORK_NOT_FOUND");
      const input = await body(request, interactionSchema);
      const existing = await db.workInteraction.findUnique({ where: { userId_workId_type: { userId: actor.id, workId, type: input.type } } });
      if (existing) {
        await db.workInteraction.delete({ where: { id: existing.id } });
        return json({ active: false });
      }
      await db.workInteraction.create({ data: { userId: actor.id, workId, type: input.type } });
      return json({ active: true });
    }
    if (segments.length === 3 && segments[2] === "comments") {
      const work = await loadWork(workId);
      if (!work || !canReadWork(work, user)) throw new ApiError(404, "作品不存在", "WORK_NOT_FOUND");
      if (method === "GET") {
        const comments = await db.workComment.findMany({ where: { workId }, include: { user: true }, orderBy: { createdAt: "asc" } });
        return json({ comments: comments.map(commentDto) });
      }
      if (method === "POST") {
        const actor = requireUser(user);
        const input = await body(request, commentSchema);
        const comment = await db.workComment.create({ data: { ...input, workId, userId: actor.id }, include: { user: true } });
        return json({ comment: commentDto(comment) }, 201);
      }
    }
    return null;
  }

  if (segments[0] === "follows" && segments.length === 2 && method === "POST") {
    const actor = requireUser(user);
    const targetId = segments[1];
    if (targetId === actor.id) throw new ApiError(400, "不能关注自己", "INVALID_FOLLOW");
    const target = await db.user.findUnique({ where: { id: targetId } });
    if (!target || target.status !== "APPROVED") throw new ApiError(404, "用户不存在", "USER_NOT_FOUND");
    const existing = await db.follow.findUnique({ where: { followerId_followingId: { followerId: actor.id, followingId: targetId } } });
    if (existing) {
      await db.follow.delete({ where: { id: existing.id } });
      return json({ active: false });
    }
    await db.follow.create({ data: { followerId: actor.id, followingId: targetId } });
    return json({ active: true });
  }

  if (segments[0] === "reports" && segments.length === 1 && method === "POST") {
    const actor = requireUser(user);
    const input = await body(request, reportSchema);
    const work = await loadWork(input.workId);
    if (!work || !canReadWork(work, user)) throw new ApiError(404, "作品不存在", "WORK_NOT_FOUND");
    const report = await db.report.create({ data: { ...input, reporterId: actor.id } });
    return json({ report: { id: report.id, workId: report.workId, reason: report.reason, status: report.status, createdAt: dateValue(report.createdAt) } }, 201);
  }

  if (segments[0] === "knowledge") {
    if (method !== "GET") return null;
    if (segments.length === 1) return json({ sources: await publicKnowledge(query.get("q"), query.get("category")) });
    const source = await db.knowledgeSource.findFirst({ where: { id: segments[1], visibility: "PUBLIC" } });
    if (!source) throw new ApiError(404, "知识源不存在", "KNOWLEDGE_NOT_FOUND");
    return json({ source: sourceDto(source) });
  }

  if (segments[0] === "materials") {
    if (method !== "GET") return null;
    if (segments.length === 1) {
      const where: AnyRecord = { visibility: "PUBLIC" };
      if (query.get("type")) where.type = query.get("type");
      if (query.get("q")) where.OR = [{ name: { contains: query.get("q") } }, { type: { contains: query.get("q") } }];
      const materials = await db.material.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 });
      return json({ materials: materials.map(materialDto) });
    }
    const material = await db.material.findFirst({ where: { id: segments[1], visibility: "PUBLIC" } });
    if (!material) throw new ApiError(404, "材料不存在", "MATERIAL_NOT_FOUND");
    return json({ material: materialDto(material) });
  }

  if (segments[0] === "chats") {
    const actor = requireUser(user);
    if (segments.length === 1 && method === "GET") {
      const chats = await db.chat.findMany({ where: { userId: actor.id }, orderBy: { updatedAt: "desc" } });
      return json({ chats: chats.map((chat) => ({ id: chat.id, title: chat.title, createdAt: dateValue(chat.createdAt), updatedAt: dateValue(chat.updatedAt) })) });
    }
    if (segments.length === 1 && method === "POST") return json(await chatResponse(actor, await body(request, chatSchema)), 201);
    if (segments.length === 2 && method === "GET") {
      const chat = await db.chat.findFirst({ where: { id: segments[1], userId: actor.id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
      if (!chat) throw new ApiError(404, "会话不存在", "CHAT_NOT_FOUND");
      return json({ chat: { id: chat.id, title: chat.title, messages: chat.messages.map((item) => ({ id: item.id, role: item.role, content: item.content, sources: item.sources ?? [] })) } });
    }
    return null;
  }

  if (segments[0] === "material-requests" && segments.length === 1 && method === "POST") {
    const actor = requireUser(user);
    const input = await body(request, materialRequestSchema);
    const material = await db.material.findFirst({ where: { id: input.materialId, visibility: "PUBLIC" } });
    if (!material) throw new ApiError(404, "材料不存在", "MATERIAL_NOT_FOUND");
    const existing = await db.materialRequest.findUnique({ where: { requesterId_idempotencyKey: { requesterId: actor.id, idempotencyKey: input.idempotencyKey } }, include: { material: true } });
    if (existing) return json({ application: materialRequestDto(existing) });
    const application = await db.materialRequest.create({ data: { ...input, requesterId: actor.id }, include: { material: true } });
    return json({ application: materialRequestDto(application) }, 201);
  }

  if (segments[0] === "lab-applications") {
    const actor = requireUser(user);
    if (segments.length === 1 && method === "GET") {
      const applications = await db.labApplication.findMany({ where: { requesterId: actor.id }, include: { reportAsset: true }, orderBy: { createdAt: "desc" } });
      return json({ applications: applications.map((item) => applicationDto(item, actor)) });
    }
    if (segments.length === 1 && method === "POST") {
      const input = await body(request, labApplicationSchema);
      if (input.attachmentIds.length) {
        const count = await db.asset.count({ where: { id: { in: input.attachmentIds }, ownerId: actor.id } });
        if (count !== input.attachmentIds.length) throw new ApiError(400, "附件不存在或不属于当前用户", "INVALID_ATTACHMENT");
      }
      const existing = await db.labApplication.findUnique({ where: { requesterId_idempotencyKey: { requesterId: actor.id, idempotencyKey: input.idempotencyKey } }, include: { reportAsset: true } });
      if (existing) return json({ application: applicationDto(existing, actor) });
      const application = await db.labApplication.create({ data: { ...input, requesterId: actor.id }, include: { reportAsset: true } });
      return json({ application: applicationDto(application, actor) }, 201);
    }
    if (segments.length === 2 && method === "GET") {
      const application = await db.labApplication.findFirst({ where: { id: segments[1], requesterId: actor.id }, include: { reportAsset: true } });
      if (!application) throw new ApiError(404, "申请不存在", "APPLICATION_NOT_FOUND");
      return json({ application: applicationDto(application, actor) });
    }
    return null;
  }

  if (segments[0] === "manufacturing") {
    const actor = requireUser(user);
    if (segments.length === 1 && method === "GET") {
      const projects = await db.manufacturingProject.findMany({ where: { requesterId: actor.id }, orderBy: { createdAt: "desc" } });
      return json({ projects: projects.map(manufacturingDto) });
    }
    if (segments.length === 1 && method === "POST") {
      const input = await body(request, manufacturingSchema);
      if (input.workId) {
        const work = await db.work.findFirst({ where: { id: input.workId, authorId: actor.id } });
        if (!work) throw new ApiError(400, "作品不存在或不属于当前用户", "INVALID_WORK");
      }
      const project = await db.manufacturingProject.create({ data: { ...input, requesterId: actor.id } });
      return json({ project: manufacturingDto(project) }, 201);
    }
    return null;
  }

  if (segments[0] === "profile" && segments.length === 1 && method === "GET") {
    return json(await profile(requireUser(user)));
  }

  if (segments[0] === "admin") {
    const actor = requireAdmin(user);
    if (segments.length === 1 && method === "GET") return json(await adminSnapshot());
    if (segments.length === 3 && method === "PATCH" && segments[1] === "users") {
      const input = await body(request, z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(), role: z.enum(["USER", "STAFF", "ADMIN"]).optional(), reviewNote: z.string().max(2000).nullable().optional() }));
      const updated = await db.user.update({ where: { id: segments[2] }, data: input });
      await writeAudit(actor, "UPDATE", "User", updated.id, input);
      return json({ user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, status: updated.status, reviewNote: updated.reviewNote } });
    }
    if (segments.length === 3 && method === "PATCH" && segments[1] === "works") {
      const input = await body(request, z.object({ featured: z.boolean().optional(), visibility: z.enum(["PRIVATE", "PUBLIC"]).optional() }));
      const updated = await db.work.update({ where: { id: segments[2] }, data: input, include: { author: true, interactions: { select: { type: true } } } });
      await writeAudit(actor, "UPDATE", "Work", updated.id, input);
      return json({ work: workDto(updated, actor) });
    }
    if (segments.length === 3 && method === "PATCH" && segments[1] === "lab") {
      const input = await body(request, z.object({ status: z.string().min(1), publicNote: z.string().max(3000).nullable().optional(), reportAssetId: z.string().nullable().optional() }));
      if (input.reportAssetId) {
        const asset = await db.asset.findUnique({ where: { id: input.reportAssetId } });
        if (!asset) throw new ApiError(400, "报告素材不存在", "INVALID_ASSET");
      }
      const updated = await db.labApplication.update({ where: { id: segments[2] }, data: input, include: { reportAsset: true } });
      await writeAudit(actor, "UPDATE", "LabApplication", updated.id, input);
      return json({ application: applicationDto(updated, actor) });
    }
    if (segments.length === 3 && method === "PATCH" && segments[1] === "material-requests") {
      const input = await body(request, z.object({ status: z.string().min(1), internalNote: z.string().max(3000).nullable().optional() }));
      const updated = await db.materialRequest.update({ where: { id: segments[2] }, data: input, include: { material: true } });
      await writeAudit(actor, "UPDATE", "MaterialRequest", updated.id, input);
      return json({ application: materialRequestDto(updated) });
    }
    if (segments.length === 3 && method === "PATCH" && segments[1] === "manufacturing") {
      const input = await body(request, z.object({ status: z.string().min(1), publicNote: z.string().max(3000).nullable().optional() }));
      const updated = await db.manufacturingProject.update({ where: { id: segments[2] }, data: input });
      await writeAudit(actor, "UPDATE", "ManufacturingProject", updated.id, input);
      return json({ project: manufacturingDto(updated) });
    }
    if (segments.length === 3 && method === "PATCH" && segments[1] === "reports") {
      const input = await body(request, z.object({ status: z.string().min(1), resolution: z.string().max(3000) }));
      const updated = await db.report.update({ where: { id: segments[2] }, data: input });
      await writeAudit(actor, "UPDATE", "Report", updated.id, input);
      return json({ report: { id: updated.id, workId: updated.workId, reason: updated.reason, status: updated.status, resolution: updated.resolution } });
    }
    if (segments.length === 2 && segments[1] === "settings" && method === "PATCH") {
      const input = await body(request, z.object({ dailyTaskLimit: z.number().int().min(1).max(10000) }));
      const settings = await db.siteSetting.upsert({ where: { id: "singleton" }, update: { ...input, updatedById: actor.id }, create: { id: "singleton", ...input, updatedById: actor.id } });
      await writeAudit(actor, "UPDATE", "SiteSetting", settings.id, input);
      return json({ settings: { dailyTaskLimit: settings.dailyTaskLimit } });
    }
    return null;
  }

  return null;
}

