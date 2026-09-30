import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { getState, resetDemo, setRole } from './service';
import { checkDirector, checkWriter } from './assistant-model';
import { confirmWriter, editWriter, loadWriterExample, runDirectorChecks, runWriterChecks } from './assistant-service';
import { assistantPath, resolveWorkspace } from './workspace-route';
import WriterStudio from './WriterStudio';
import DirectorStudio from './Studio';
import CanvasDemo from './CanvasDemo';

vi.mock('./ui', async importOriginal => {
  const original = await importOriginal<typeof import('./ui')>();
  return { ...original, useDemo: () => getState() };
});
describe('separate creative workspaces', () => {
  beforeEach(() => resetDemo());
  it('resolves direct and legacy links without changing project data', () => {
    const state = structuredClone(getState());
    expect(resolveWorkspace(assistantPath('p-draft', 'director'), state.projects)).toEqual({ mode: 'director', projectId: 'p-draft' });
    expect(resolveWorkspace('/studio/p-review?assistant=writer', state.projects)?.mode).toBe('writer');
    expect(resolveWorkspace('/studio/p-draft?assistant=director', state.projects)?.mode).toBe('director');
    expect(resolveWorkspace('/studio/p-draft', state.projects)?.mode).toBe('writer');
    expect(resolveWorkspace('/studio/p-producing', state.projects)?.mode).toBe('director');
    expect(resolveWorkspace('/canvas', state.projects)).toBeNull();
    expect(getState()).toEqual(state);
  });
  it('renders only writing tools in writer workspace', () => {
    const html = renderToStaticMarkup(<WriterStudio projectId="p-draft"/>);
    for (const text of ['故事策划', '人物设定', '单集剧本', '连续性记录', '交给导演助手']) expect(html).toContain(text);
    for (const text of ['分镜预演', '自由画布', '导出导演', '确认资产包', '视频制作', '制作进度', '预置示例', '本地演示', '载入编剧示例']) expect(html).not.toContain(text);
    expect(html).toMatch(/disabled=""[^>]*>交给导演助手/);
    loadWriterExample('p-draft'); confirmWriter('p-draft');
    expect(renderToStaticMarkup(<WriterStudio projectId="p-draft"/>)).not.toMatch(/disabled=""[^>]*>交给导演助手/);
  });
  it('renders director tools and a readonly script handoff, never writing or canvas editors', () => {
    loadWriterExample('p-draft'); confirmWriter('p-draft');
    const html = renderToStaticMarkup(<DirectorStudio projectId="p-draft"/>);
    for (const text of ['角色与资产', '分镜设计', '视频制作', '作品投稿', '查看确认版本', '修改剧本']) expect(html).toContain(text);
    for (const text of ['载入编剧示例', '载入外观示例', '载入分镜示例', '演示生成', '预置示例', '本地演示', '导出编剧', '你的故事想法', '自由画布']) expect(html).not.toContain(text);
    editWriter('p-draft', 'body', '已修改的剧本');
    expect(renderToStaticMarkup(<DirectorStudio projectId="p-draft"/>)).toContain('上游编剧内容已修改');
  });
  it('keeps stage checks separate and submission checking unchanged', () => {
    loadWriterExample('p-draft'); confirmWriter('p-draft');
    const state = getState(), p = state.projects[0];
    expect(checkWriter(p, state).some(c => c.status === 'fix')).toBe(false);
    expect(checkDirector(p, state).some(c => c.id === 'assets' && c.status === 'fix')).toBe(true);
    expect(checkWriter(p, state).some(c => c.id === 'prompts')).toBe(false);
    runWriterChecks(p.id); runDirectorChecks(p.id);
    expect(getState().projects[0].assistant?.writerCheckReport?.items).toEqual(checkWriter(p, state));
    expect(getState().projects[0].assistant?.directorCheckReport?.items).toEqual(checkDirector(p, state));
  });
  it('keeps new check operations readonly for owners and submitted projects', () => {
    expect(() => runWriterChecks('p-review')).toThrow('只读');
    setRole('owner');
    expect(() => runDirectorChecks('p-draft')).toThrow('只读');
    expect(renderToStaticMarkup(<WriterStudio projectId="p-draft"/>)).toContain('当前为只读模式');
    expect(renderToStaticMarkup(<DirectorStudio projectId="p-draft"/>)).toContain('版权方查看模式');
  });
  it('renders a project-independent canvas without actions or storage changes', () => {
    const before = structuredClone(getState());
    const html = renderToStaticMarkup(<CanvasDemo/>);
    expect(html).toContain('演示界面，实际功能待接入');
    expect(html).not.toContain('云山邮局');
    expect(html).not.toMatch(/<button|<input|<textarea/);
    expect(getState()).toEqual(before);
    expect(getState().submissions).toEqual(before.submissions);
  });
});
