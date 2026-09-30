import type { Commission, DemoState, Project, Role, Shot } from './types';
import { createSeed, makeProject } from './seed';
import { assistantProblem, migrateAssistants, productionSignature, scriptCurrent } from './assistant-model';

export function isClosed(task: Commission) { return new Date(`${task.deadline}T23:59:59+08:00`).getTime() < Date.now(); }
export function submissionProblem(state: DemoState, project: Project): string | null {
  const task = state.tasks.find(t => t.id === project.taskId);
  if (!task || isClosed(task)) return '这项征集已截止，无法继续投稿。请选择正在征集的任务。';
  if (!state.ips.find(i => i.id === project.ipId)?.available) return '该 IP 尚未开放创作。';
  if (state.submissions.some(s => s.projectId === project.id && s.status === 'pending')) return '当前版本正在审核，请等待版权方反馈后再投稿。';
  if (project.status === 'selected') return '此项目已入选，可以在作品展映中查看。';
  if (!project.script.body.trim() || project.script.body !== project.script.confirmedBody) return '请先确认当前剧本，再完成制作。';
  const assistantError = assistantProblem(project, state); if (assistantError) return assistantError;
  if (!project.shots.length || project.shots.some(s => s.clipStatus !== 'done' || !s.selected)) return '请完成全部镜头的演示生成，并选用每个镜头结果。';
  if (project.shots.some(s => !s.assetIds.length || s.assetIds.some(id => !project.assetIds.includes(id)))) return '每个镜头都需要引用项目已选用的资产。请检查分镜资产。';
  if (project.shots.some(s => !Number.isFinite(s.duration) || s.duration <= 0) || Math.abs(project.shots.reduce((n, s) => n + s.duration, 0) - task.seconds) > 0.01) return `任务要求总时长 ${task.seconds} 秒，请调整分镜时长。`;
  if (Object.values(project.submission).some(v => !v.trim())) return '请填写作品标题、简介、署名和创作说明。';
  return null;
}
export function submitProject(state: DemoState, id: string): DemoState {
  const next = structuredClone(state), p = next.projects.find(x => x.id === id);
  if (!p) throw new Error('项目不存在。');
  const error = submissionProblem(next, p); if (error) throw new Error(error);
  const version = Math.max(0, ...next.submissions.filter(s => s.projectId === id).map(s => s.version)) + 1;
  p.status = 'review'; p.updatedAt = new Date().toISOString();
  next.submissions.unshift({ id: crypto.randomUUID(), projectId: id, taskId: p.taskId, version, snapshot: structuredClone(p), context: { ip: structuredClone(next.ips.find(i => i.id === p.ipId)!), assets: structuredClone(next.assets.filter(a => p.assetIds.includes(a.id))), task: structuredClone(next.tasks.find(t => t.id === p.taskId)!) }, status: 'pending', notes: [], submittedAt: p.updatedAt });
  return next;
}
export function reviewSubmission(state: DemoState, id: string, decision: 'changes' | 'selected'): DemoState {
  if (state.role !== 'owner') throw new Error('请切换到演示版权方身份。');
  const next = structuredClone(state), s = next.submissions.find(x => x.id === id);
  if (!s || s.status !== 'pending') throw new Error('该投稿已处理，请查看最新版本。');
  if (decision === 'changes' && !s.notes.length) throw new Error('退回修改前，请先添加一条具体审核意见。');
  s.status = decision;
  const p = next.projects.find(x => x.id === s.projectId); if (p) { p.status = decision; p.updatedAt = new Date().toISOString(); }
  return next;
}

let state: DemoState = createSeed();
let loaded = false, database: IDBDatabase | null = null;
let saveError = '';
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
export const subscribe = (callback: () => void) => { listeners.add(callback); return () => { listeners.delete(callback); }; };
export const getState = () => state;
export const getSaveError = () => saveError;
function emit() { listeners.forEach(l => l()); }
function persist(next: DemoState) {
  state = next; emit();
  if (!database) return;
  try {
    const tx = database.transaction('state', 'readwrite'); tx.objectStore('state').put(next, 'demo');
    tx.onerror = () => { saveError = '本机存储失败，当前修改只保留在本次页面中。请检查浏览器存储空间后重试。'; state = { ...state }; emit(); };
  } catch { saveError = '浏览器未能保存修改，请保留当前页面并导出项目。'; state = { ...state }; emit(); }
}
export async function initialize(): Promise<void> {
  if (loaded) return; loaded = true;
  try {
    database = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('imaideo-independent-demo', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('state');
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    const saved = await new Promise<DemoState | undefined>((resolve, reject) => {
      const r = database!.transaction('state', 'readonly').objectStore('state').get('demo'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    if (saved?.schema === 1) {
      const fresh = createSeed();
      const storedById = new Map(saved.ips.map(ip => [ip.id, ip]));
      saved.ips = fresh.ips.map(ip => ({ ...ip, ...storedById.get(ip.id), category: storedById.get(ip.id)?.category ?? ip.category, featured: storedById.get(ip.id)?.featured ?? ip.featured, demoOnly: storedById.get(ip.id)?.demoOnly ?? ip.demoOnly, sortOrder: storedById.get(ip.id)?.sortOrder ?? ip.sortOrder }));
      state = saved;
    }
    migrateAssistants(state);
    state.projects.forEach(p => p.shots.forEach(s => { if (s.clipStatus === 'queued' || s.clipStatus === 'running') s.clipStatus = 'failed'; }));
    persist(state);
  } catch { saveError = '此浏览器无法使用 IndexedDB。可以继续体验，但刷新后不会保留本次修改。'; state = { ...state }; emit(); }
}
export function update(mutator: (draft: DemoState) => void) { const next = structuredClone(state); mutator(next); persist(next); }
export function setRole(role: Role) { update(d => { d.role = role; }); }
export function resetDemo() { timers.forEach(clearTimeout); timers.clear(); persist(createSeed()); }
export function changeProject(id: string, mutator: (p: Project) => void) { update(d => {
  const p = d.projects.find(x => x.id === id); if (!p) throw new Error('项目不存在。');
  if (d.role !== 'creator' || p.status === 'review' || p.status === 'selected') throw new Error('当前项目只读，请切换创作者或等待审核反馈。');
  const before = productionSignature(p); mutator(p);
  if (p.assistant?.enabled && before !== productionSignature(p)) {
    p.shots.forEach(s => { const key = `${id}/${s.id}`; clearTimeout(timers.get(key)); timers.delete(key); s.clipStatus = 'idle'; s.selected = false; });
    if (!scriptCurrent(p)) p.script.confirmedBody = '';
  }
  p.updatedAt = new Date().toISOString();
}); }
export function joinTask(id: string): string {
  const task = state.tasks.find(t => t.id === id);
  if (!task || isClosed(task)) throw new Error('征集已截止，请选择其他任务。');
  if (!state.ips.find(i => i.id === task.ipId)?.available) throw new Error('该 IP 尚未开放创作。');
  if (state.role !== 'creator') throw new Error('请切换为演示创作者后参与征集。');
  const project = makeProject(crypto.randomUUID(), id, task.ipId, `${state.ips.find(i => i.id === task.ipId)!.title} · 我的新故事`);
  project.assetIds = [...task.assetIds];
  project.shots.forEach(s => { s.assetIds = s.assetIds.filter(a => project.assetIds.includes(a)); s.duration = task.seconds / project.shots.length; });
  update(d => { d.projects.unshift(project); }); return project.id;
}
export function createAssistantProject(): string {
  if (state.role !== 'creator') throw new Error('请切换为演示创作者后开始新故事。');
  const task = state.tasks.find(t => !isClosed(t) && state.ips.some(ip => ip.id === t.ipId && ip.available && !ip.demoOnly));
  if (!task) throw new Error('暂无开放创作的示例 IP，请稍后再试。');
  const id = crypto.randomUUID();
  const title = '未命名故事';
  const project: Project = {
    id, title, ipId: task.ipId, taskId: task.id, status: 'draft', updatedAt: new Date().toISOString(),
    script: { idea: '', format: '60 秒短片', synopsis: '', characters: '', body: '', confirmedBody: '', revision: 0 },
    assetIds: [], assetNotes: '', shots: [{ id: crypto.randomUUID(), title: '镜头 1', description: '', dialogue: '', duration: task.seconds, camera: '固定中景', assetIds: [], frame: 0, clipStatus: 'idle', selected: false, failOnce: false }],
    canvas: {}, zoom: 1, submission: { title, summary: '', author: '', note: '' },
  };
  update(d => { d.projects.unshift(project); });
  return id;
}
export function confirmScript(id: string) { changeProject(id, p => {
  if (!p.script.body.trim()) throw new Error('请先填写剧本。');
  if (p.script.confirmedBody !== p.script.body) {
    p.shots.forEach(s => { const key = `${id}/${s.id}`; clearTimeout(timers.get(key)); timers.delete(key); });
    p.script.confirmedBody = p.script.body; p.script.revision += 1;
    p.shots.forEach(s => { s.clipStatus = 'idle'; s.selected = false; });
    if (!['review', 'selected'].includes(p.status)) p.status = 'producing';
  }
}); }
export function editShot(projectId: string, shotId: string, patch: Partial<Shot>) {
  const key = `${projectId}/${shotId}`; clearTimeout(timers.get(key)); timers.delete(key);
  changeProject(projectId, p => { const s = p.shots.find(s => s.id === shotId); if (s) { Object.assign(s, patch); s.clipStatus = 'idle'; s.selected = false; } });
}
export function generateShot(projectId: string, shotId: string, forceFail = false) {
  const p = state.projects.find(x => x.id === projectId)!;
  if (!p.script.body.trim() || p.script.body !== p.script.confirmedBody) throw new Error('请先确认当前剧本。');
  const assistantError = assistantProblem(p, state); if (assistantError) throw new Error(assistantError);
  const shot = p.shots.find(x => x.id === shotId)!;
  if (shot.clipStatus === 'queued' || shot.clipStatus === 'running') return;
  const key = `${projectId}/${shotId}`;
  changeProject(projectId, p => { const s = p.shots.find(x => x.id === shotId)!; s.clipStatus = 'queued'; s.selected = false; });
  timers.set(key, setTimeout(() => {
    advanceJob(projectId, shotId, 'queued', 'running');
    timers.set(key, setTimeout(() => {
      advanceJob(projectId, shotId, 'running', forceFail ? 'failed' : 'done'); timers.delete(key);
    }, 1300));
  }, 700));
}
function advanceJob(projectId: string, shotId: string, from: Shot['clipStatus'], to: Shot['clipStatus']) {
  update(d => {
    const p = d.projects.find(x => x.id === projectId), s = p?.shots.find(x => x.id === shotId);
    if (!p || !s || ['review', 'selected'].includes(p.status) || s.clipStatus !== from) return;
    s.clipStatus = assistantProblem(p, d) ? 'failed' : to; s.selected = s.clipStatus === 'done';
  });
}
export function sendSubmission(id: string) { if (state.role !== 'creator') throw new Error('请使用创作者身份投稿。'); persist(submitProject(state, id)); }
export function decide(id: string, decision: 'changes' | 'selected') { persist(reviewSubmission(state, id, decision)); }
export function addReviewNote(id: string, shotId: string, text: string) {
  if (state.role !== 'owner' || !text.trim()) throw new Error('请填写审核意见。');
  update(d => { const s = d.submissions.find(x => x.id === id); if (!s || s.status !== 'pending') throw new Error('该版本已审核。'); s.notes.push({ id: crypto.randomUUID(), shotId, text: text.trim(), createdAt: new Date().toISOString() }); });
}
export function publishTask(task: Omit<Commission, 'id'>) {
  if (state.role !== 'owner') throw new Error('请切换到演示版权方。');
  if (!state.ips.find(i => i.id === task.ipId)?.available) throw new Error('请选择原创示例 IP。');
  if (![task.title, task.brief, task.format, task.rules, task.criteria, task.reward, task.deadline].every(v => v.trim()) || !task.assetIds.length || !Number.isFinite(task.seconds) || task.seconds < 6 || task.seconds > 600) throw new Error('请填写完整资料，选择至少一份资产，时长须为 6–600 秒。');
  if (isClosed({ ...task, id: '' })) throw new Error('截止日期必须是今天或之后。');
  if (task.assetIds.some(id => !state.assets.some(a => a.id === id && a.ipId === task.ipId && a.source === 'ip'))) throw new Error('只能开放该 IP 的示例官方资产。');
  update(d => { d.tasks.unshift({ ...task, id: crypto.randomUUID() }); });
}
