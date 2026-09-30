import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSeed } from './seed';
import { addReviewNote, changeProject, confirmScript, createAssistantProject, editShot, generateShot, getState, initialize, isClosed, joinTask, publishTask, resetDemo, reviewSubmission, setRole, submissionProblem, submitProject, update } from './service';
import { assistantPath, resolveWorkspace } from './workspace-route';
import type { DemoState } from './types';

function ready(state: DemoState, id = 'p-draft') { const p = state.projects.find(p => p.id === id)!; p.script.confirmedBody = p.script.body; p.shots.forEach(s => { s.clipStatus = 'done'; s.selected = true; }); return p; }
describe('submission and version boundaries', () => {
  it('preserves the submitted project, asset versions and task rules after subsequent edits', () => {
    const initial = createSeed(); const p = ready(initial); const submitted = submitProject(initial, p.id); const snapshot = structuredClone(submitted.submissions[0]);
    submitted.projects[0].shots[0].description = 'later edit'; submitted.assets[0].version = '2.0'; submitted.tasks[0].rules = 'later rules';
    expect(submitted.submissions[0]).toEqual(snapshot); expect(initial.submissions.length).toBe(3);
  });
  it('rejects duplicate pending submissions', () => { const state = createSeed(); ready(state); const next = submitProject(state, 'p-draft'); expect(() => submitProject(next, 'p-draft')).toThrow('正在审核'); });
  it('requires specific review feedback before returning a submission', () => { const s = createSeed(); s.role = 'owner'; expect(() => reviewSubmission(s, 'submission-seed-0', 'changes')).toThrow('审核意见'); });
  it('supports return, edit, new version and final selection while preserving old feedback', () => {
    let s = createSeed(); ready(s); s = submitProject(s, 'p-draft'); s.role = 'owner';
    const v1 = s.submissions[0]; v1.notes.push({ id: 'n', shotId: 'shot-5', text: '停顿更自然', createdAt: new Date().toISOString() });
    s = reviewSubmission(s, v1.id, 'changes'); s.projects[0].shots[4].description += ' 停顿。'; s = submitProject(s, 'p-draft');
    expect(s.submissions[0].version).toBe(2); expect(s.submissions.find(x => x.id === v1.id)!.snapshot.shots[4].description).not.toContain('停顿。');
    s = reviewSubmission(s, s.submissions[0].id, 'selected'); expect(s.projects[0].status).toBe('selected'); expect(s.submissions.find(x => x.id === v1.id)!.notes[0].text).toBe('停顿更自然');
  });
  it('blocks closed tasks, unavailable IP, incomplete results, missing references and empty metadata', () => {
    const s = createSeed(), p = ready(s); s.tasks[0].deadline = '2020-01-01'; expect(submissionProblem(s, p)).toContain('截止'); s.tasks[0].deadline = '2099-01-01';
    s.ips[0].available = false; expect(submissionProblem(s, p)).toContain('开放'); s.ips[0].available = true;
    p.shots[0].selected = false; expect(submissionProblem(s, p)).toContain('选用'); p.shots[0].selected = true;
    p.shots[0].assetIds = []; expect(submissionProblem(s, p)).toContain('资产'); p.shots[0].assetIds = ['postoffice'];
    p.submission.author = ' '; expect(submissionProblem(s, p)).toContain('署名');
  });
  it('requires script confirmation and valid total duration', () => { const s = createSeed(), p = ready(s); p.script.body += '新内容'; expect(submissionProblem(s, p)).toContain('确认'); p.script.confirmedBody = p.script.body; p.shots[0].duration = 9; expect(submissionProblem(s, p)).toContain('60 秒'); });
  it('rejects stale repeated review decisions and creator review', () => { const s = createSeed(); expect(() => reviewSubmission(s, 'submission-seed-0', 'selected')).toThrow('版权方'); s.role = 'owner'; const n = reviewSubmission(s, 'submission-seed-0', 'selected'); expect(() => reviewSubmission(n, 'submission-seed-0', 'changes')).toThrow('已处理'); });
});
describe('local service behavior', () => {
  beforeEach(() => { vi.useRealTimers(); resetDemo(); });
  it('starts a blank project in the selected assistant without changing existing projects', () => {
    const original = structuredClone(getState().projects[0]);
    const id = createAssistantProject();
    const project = getState().projects.find(p => p.id === id)!;
    expect(project.script.idea).toBe('');
    expect(project.script.body).toBe('');
    expect(project.assetIds).toEqual([]);
    expect(project.shots).toHaveLength(1);
    expect(project.shots[0].description).toBe('');
    expect(getState().projects.find(p => p.id === original.id)).toEqual(original);
    expect(resolveWorkspace(assistantPath(id, 'writer'), getState().projects)).toEqual({ mode: 'writer', projectId: id });
    expect(resolveWorkspace(assistantPath(id, 'director'), getState().projects)).toEqual({ mode: 'director', projectId: id });
    setRole('owner');
    expect(() => createAssistantProject()).toThrow('创作者');
  });
  it('persists changes into IndexedDB', async () => { await initialize(); changeProject('p-draft', p => { p.title = '持久化测试'; }); const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('imaideo-independent-demo', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); const saved = await new Promise<DemoState>((resolve, reject) => { const r = db.transaction('state').objectStore('state').get('demo'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); expect(saved.projects[0].title).toBe('持久化测试'); db.close(); });
  it('blocks closed task entry and prevents unavailable IP creation', () => { update(s => { s.tasks[0].deadline = '2020-01-01'; }); expect(() => joinTask('letters')).toThrow('截止'); resetDemo(); update(s => { s.ips[0].available = false; }); expect(() => joinTask('letters')).toThrow('开放'); });
  it('creates projects using only assets opened by the commission', () => { update(s => { s.tasks[0].assetIds = ['postoffice']; }); const id = joinTask('letters'); const p = getState().projects.find(p => p.id === id)!; expect(p.assetIds).toEqual(['postoffice']); expect(p.shots.every(s => s.assetIds.every(id => id === 'postoffice'))).toBe(true); });
  it('simulates queue, failure and retry without charging', () => { vi.useFakeTimers(); confirmScript('p-draft'); generateShot('p-draft', 'shot-1', true); expect(getState().projects[0].shots[0].clipStatus).toBe('queued'); vi.advanceTimersByTime(700); expect(getState().projects[0].shots[0].clipStatus).toBe('running'); vi.advanceTimersByTime(1300); expect(getState().projects[0].shots[0].clipStatus).toBe('failed'); generateShot('p-draft', 'shot-1'); vi.advanceTimersByTime(2000); expect(getState().projects[0].shots[0].selected).toBe(true); });
  it('editing a running shot cancels stale results', () => { vi.useFakeTimers(); confirmScript('p-draft'); generateShot('p-draft', 'shot-1'); vi.advanceTimersByTime(800); editShot('p-draft', 'shot-1', { description: '新的镜头' }); vi.advanceTimersByTime(5000); expect(getState().projects[0].shots[0].clipStatus).toBe('idle'); expect(getState().projects[0].shots[0].selected).toBe(false); });
  it('reset cancels outstanding jobs', () => { vi.useFakeTimers(); confirmScript('p-draft'); generateShot('p-draft', 'shot-1'); resetDemo(); vi.advanceTimersByTime(9000); expect(getState().projects[0].shots[0].clipStatus).toBe('idle'); });
  it('publishes a commission only for available IP and authorized demo role', () => { const task = structuredClone(getState().tasks[0]); expect(() => publishTask(task)).toThrow('版权方'); setRole('owner'); publishTask({ ...task, title: '新的征集' }); expect(getState().tasks[0].title).toBe('新的征集'); expect(() => publishTask({ ...task, ipId: 'book' })).toThrow('原创'); expect(() => publishTask({ ...task, assetIds: ['ship'] })).toThrow('该 IP'); });
  it('records feedback for the right snapshot and restores original demo data', () => { setRole('owner'); addReviewNote('submission-seed-0', 'shot-3', '镜头稍慢'); expect(getState().submissions.find(s => s.id === 'submission-seed-0')!.notes[0].shotId).toBe('shot-3'); resetDemo(); expect(getState().role).toBe('creator'); expect(getState().submissions.find(s => s.id === 'submission-seed-0')!.notes).toEqual([]); });
  it('uses an end-of-day China timezone deadline', () => { expect(isClosed({ ...getState().tasks[0], deadline: '2020-01-01' })).toBe(true); expect(isClosed({ ...getState().tasks[0], deadline: '2099-01-01' })).toBe(false); });
});
