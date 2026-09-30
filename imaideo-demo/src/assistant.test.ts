import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assistantData, assetsCurrent, checkAssistant, exportAssistant, migrateAssistants, promptsCurrent, scriptCurrent, storyboardCurrent } from './assistant-model';
import { applyWriterAiResult, confirmAssets, confirmStoryboard, confirmWriter, editDirector, editPrompt, editWriter, loadStoryboardExample, loadStyleExample, loadWriterExample, preparePrompts, runAssistantChecks } from './assistant-service';
import { changeProject, editShot, generateShot, getState, initialize, joinTask, resetDemo, setRole, submissionProblem, submitProject, update } from './service';
import { createSeed } from './seed';
import type { DemoState } from './types';

function project(id = 'p-draft') { return getState().projects.find(p => p.id === id)!; }
function prepare(id = 'p-draft') { loadWriterExample(id); confirmWriter(id); loadStyleExample(id); confirmAssets(id); loadStoryboardExample(id); confirmStoryboard(id); preparePrompts(id); }
describe('skill demo workflow', () => {
  beforeEach(() => { vi.useRealTimers(); resetDemo(); });
  it('stores each structured writer result on the active project', () => {
    applyWriterAiResult('p-draft', 'planning', { theme: '希望', genre: '温情', world: '云山', tone: '克制', coreConflict: '等待与行动', logline: '寻找一封信', summary: '故事梗概' });
    applyWriterAiResult('p-draft', 'characters', { characters: [{ name: '阿遥', role: '主角', age: '22', appearance: '短发', personality: '可靠', background: '邮差', motivation: '送信', conflict: '害怕改变', relationship: '林婆婆的朋友' }] });
    applyWriterAiResult('p-draft', 'outline', { acts: ['开始', '选择'], outline: ['发现线索'], keyEvents: ['抵达'], ending: '重新出发' });
    applyWriterAiResult('p-draft', 'script', { body: '场景：旧屋\n人物：阿遥\n动作：打开门\n对白：你好。' });
    applyWriterAiResult('p-draft', 'continuity', { characterStates: ['阿遥：主动'], relationships: ['阿遥与林婆婆：信任'], props: ['旧信'], locations: ['旧屋'], events: ['发现线索'], openThreads: ['信的来历'], timeline: ['清晨'] });
    applyWriterAiResult('p-draft', 'review', { summary: '通过', issues: [] });
    const p = project();
    expect(p.script.synopsis).toBe('故事梗概'); expect(p.script.characters).toContain('阿遥'); expect(p.script.body).toContain('场景'); expect(p.assistant?.planning).toContain('希望'); expect(p.assistant?.outline).toContain('发现线索'); expect(p.assistant?.ledger).toContain('旧信'); expect(p.assistant?.scriptReview).toContain('通过');
  });
  it.each([['cloud', 'letters'], ['sea', 'voyage'], ['lantern', 'warmth']])('keeps %s samples and assets in their own IP', (ip, task) => {
    const id = joinTask(task); prepare(id); const p = project(id);
    expect(p.ipId).toBe(ip); expect(promptsCurrent(p, getState())).toBe(true);
    expect(p.shots.every(s => s.assetIds.every(id => getState().assets.find(a => a.id === id)?.ipId === ip))).toBe(true);
    if (ip !== 'cloud') {
      expect(JSON.stringify(p.assistant) + JSON.stringify(p.script) + p.submission.note).not.toMatch(/阿遥|林婆婆|云山邮局|迟到四十年的信/);
    }
    expect(checkAssistant(p, getState()).filter(c => c.status === 'fix')).toEqual([]);
  });
  it('preserves user idea, snapshots, shots and edited prompts when writer input changes', () => {
    editWriter('p-draft', 'idea', '我的想法'); prepare(); expect(project().script.idea).toBe('我的想法');
    const originalVersion = structuredClone(project().assistant!.versions[0]);
    editPrompt('p-draft', 'shot-1', '手工提示词'); const oldShots = project().shots.map(s => s.description);
    editWriter('p-draft', 'ledger', '人工修改道具台账');
    expect(scriptCurrent(project())).toBe(false); expect(storyboardCurrent(project(), getState())).toBe(false);
    expect(project().assistant!.prompts['shot-1']).toBe('手工提示词'); expect(project().shots.map(s => s.description)).toEqual(oldShots);
    expect(project().assistant!.versions[0]).toEqual(originalVersion);
    confirmWriter('p-draft'); expect(project().assistant!.versions).toHaveLength(2); expect(storyboardCurrent(project(), getState())).toBe(false);
    expect(() => preparePrompts('p-draft')).toThrow('分镜');
  });
  it('requires human storyboard confirmation after loading fixed fixtures', () => {
    prepare(); loadStoryboardExample('p-draft'); expect(storyboardCurrent(project(), getState())).toBe(false);
    expect(() => preparePrompts('p-draft')).toThrow('分镜'); confirmStoryboard('p-draft'); preparePrompts('p-draft'); expect(promptsCurrent(project(), getState())).toBe(true);
  });
  it('invalidates prompt and generated results after shot, config, or asset changes', () => {
    vi.useFakeTimers(); prepare(); generateShot('p-draft', 'shot-1');
    editShot('p-draft', 'shot-1', { sound: '新声音' }); vi.advanceTimersByTime(5000);
    expect(project().shots[0].clipStatus).toBe('idle'); expect(promptsCurrent(project(), getState())).toBe(false);
    preparePrompts('p-draft'); editDirector('p-draft', { config: { ...project().assistant!.config, ratio: '9:16' } });
    expect(promptsCurrent(project(), getState())).toBe(false);
    update(s => { s.assets[0].version = '2.0'; }); expect(assetsCurrent(project(), getState())).toBe(false);
    expect(() => generateShot('p-draft', 'shot-1')).toThrow('资产');
  });
  it('checks missing text, invalid assets, duration and empty prompts with locations', () => {
    prepare(); editPrompt('p-draft', 'shot-2', ' '); expect(checkAssistant(project(), getState()).find(c => c.id === 'prompts')?.status).toBe('fix');
    editShot('p-draft', 'shot-1', { assetIds: ['ship'], duration: 0 }); const checks = checkAssistant(project(), getState());
    expect(checks.find(c => c.id === 'shot-shot-1')?.status).toBe('fix'); expect(checks.find(c => c.id === 'duration')?.status).toBe('fix');
    expect(checks.filter(c => c.status === 'manual')).toHaveLength(2);
    editWriter('p-draft', 'body', ''); expect(() => confirmWriter('p-draft')).toThrow('补齐'); expect(checkAssistant(project(), getState()).find(c => c.id === 'body')?.location).toContain('单集剧本');
  });
  it('blocks all assistant writes in owner, review and selected modes', () => {
    setRole('owner'); expect(() => loadWriterExample('p-draft')).toThrow('只读'); setRole('creator');
    expect(() => editWriter('p-review', 'body', 'x')).toThrow('只读'); expect(() => editPrompt('p-selected', 'shot-1', 'x')).toThrow('只读');
    expect(() => changeProject('p-review', p => { p.assetNotes = 'x'; })).toThrow('只读');
  });
  it('does not let catalog IP enter fixtures', () => { update(s => { s.projects[0].ipId = 'pokemon'; }); expect(() => loadWriterExample('p-draft')).toThrow('示例'); });
  it('migrates old live projects without altering scripts, shots or prior submissions', () => {
    const state = createSeed(), before = structuredClone(state); migrateAssistants(state);
    expect(state.submissions).toEqual(before.submissions); expect(state.projects[0].script).toEqual(before.projects[0].script); expect(state.projects[0].shots).toEqual(before.projects[0].shots);
    expect(state.projects[0].assistant?.enabled).toBe(false); expect(migrateAssistants(state)).toEqual(state);
  });
  it('preserves complete assistant data in a submitted version', () => {
    vi.useFakeTimers(); prepare(); runAssistantChecks('p-draft'); project().shots.forEach(s => generateShot('p-draft', s.id)); vi.advanceTimersByTime(2100);
    expect(submissionProblem(getState(), project())).toBeNull(); const sent = submitProject(getState(), 'p-draft'), snapshot = structuredClone(sent.submissions[0]);
    sent.projects[0].assistant!.prompts['shot-1'] = 'later edit'; expect(sent.submissions[0]).toEqual(snapshot); expect(snapshot.snapshot.assistant?.versions).toHaveLength(1);
  });
  it('persists assistant state and restores it without losing user edits', async () => {
    await initialize(); prepare(); editPrompt('p-draft', 'shot-1', '持久化的手工提示词'); runAssistantChecks('p-draft');
    const db = await new Promise<IDBDatabase>(resolve => { const r = indexedDB.open('imaideo-independent-demo', 1); r.onsuccess = () => resolve(r.result); });
    const saved = await new Promise<DemoState>(resolve => { const r = db.transaction('state').objectStore('state').get('demo'); r.onsuccess = () => resolve(r.result); }); db.close();
    const restored = migrateAssistants(saved).projects.find(p => p.id === 'p-draft')!;
    expect(restored.assistant).toEqual(project().assistant); expect(restored.assistant!.prompts['shot-1']).toBe('持久化的手工提示词');
  });
  it('exports source, version and demo provenance with editable content', () => { prepare(); const p = project(); expect(exportAssistant(p, getState(), 'writer')).toContain('edd0df754'); expect(exportAssistant(p, getState(), 'director')).toContain('未调用模型'); expect(assistantData(p).config.template).toBe('通用'); });
  it('lets already queued jobs finish when the demo role changes', () => { vi.useFakeTimers(); prepare(); generateShot('p-draft', 'shot-1'); setRole('owner'); vi.advanceTimersByTime(2100); expect(project().shots[0].clipStatus).toBe('done'); });
});
