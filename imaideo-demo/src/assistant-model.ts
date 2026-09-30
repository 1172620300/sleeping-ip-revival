import type { AssistantData, AssistantCheck, Asset, DemoState, Project } from './types';

export const skillSources = {
  writer: { name: 'Short-Drama Factory', version: '3.2.0', commit: 'edd0df754320c2f3949fb198cea7847c71d0cde0', url: 'https://github.com/lixiaoxiao9888-create/short-drama-factory' },
  director: { name: '漫剧老李', version: '6.9.8 Lite', commit: '079df685f7cf2f0de635362bd359c233db38f9fe', url: 'https://github.com/lixiaoxiao9888-create/manju-laoli-skill' },
};
export function assistantData(p: Project): AssistantData {
  return p.assistant ?? { schema: 1, enabled: false, planning: '', outline: '', ledger: '', style: '', versions: [], storyboardBasis: '', config: { ratio: '16:9', transition: '换机位衔接', template: '通用' }, prompts: {}, promptBasis: '' };
}
export function migrateAssistants(state: DemoState) {
  // Only live projects are upgraded. Historical submissions remain exact snapshots.
  state.projects.forEach(p => { p.assistant ??= assistantData(p); });
  return state;
}
export function writerSignature(p: Project) {
  const a = assistantData(p);
  return JSON.stringify([p.ipId, p.script.idea, p.script.format, p.script.synopsis, p.script.characters, p.script.body, a.planning, a.outline, a.ledger]);
}
export function scriptCurrent(p: Project) {
  const a = assistantData(p), latest = a.versions.at(-1);
  return Boolean(latest && latest.signature === writerSignature(p) && p.script.body.trim() && p.script.confirmedBody === p.script.body);
}
export function projectAssets(p: Project, state: DemoState): Asset[] { return p.assetIds.map(id => state.assets.find(a => a.id === id)).filter((a): a is Asset => Boolean(a)); }
export function validAssets(p: Project, state: DemoState) {
  const task = state.tasks.find(t => t.id === p.taskId);
  return p.assetIds.length > 0 && p.assetIds.every(id => state.assets.some(a => a.id === id && a.ipId === p.ipId && (task?.assetIds.includes(id) || a.source === 'personal')));
}
export function assetSignature(p: Project, state: DemoState) { return JSON.stringify([p.assetIds, projectAssets(p, state), p.assetNotes, assistantData(p).style, state.ips.find(i => i.id === p.ipId)?.rules]); }
export function assetsCurrent(p: Project, state: DemoState) { return validAssets(p, state) && assistantData(p).assetLock?.signature === assetSignature(p, state); }
export function directorBasis(p: Project, state: DemoState) { return JSON.stringify([assistantData(p).versions.at(-1)?.signature, assetSignature(p, state)]); }
export function storyboardCurrent(p: Project, state: DemoState) { return scriptCurrent(p) && assetsCurrent(p, state) && assistantData(p).storyboardBasis === directorBasis(p, state); }
export function shotContent(p: Project) { return p.shots.map(({ clipStatus: _status, selected: _selected, failOnce: _fail, ...shot }) => shot); }
export function promptBasis(p: Project, state: DemoState) { return JSON.stringify([directorBasis(p, state), shotContent(p), assistantData(p).config]); }
export function promptsCurrent(p: Project, state: DemoState) { return storyboardCurrent(p, state) && assistantData(p).promptBasis === promptBasis(p, state) && p.shots.length > 0 && p.shots.every(s => assistantData(p).prompts[s.id]?.trim()); }
export function productionSignature(p: Project) { const a = assistantData(p); return JSON.stringify([writerSignature(p), p.assetIds, p.assetNotes, a.style, a.config, a.prompts, a.assetLock?.signature, a.storyboardBasis, a.promptBasis, shotContent(p)]); }
export function reportBasis(p: Project, state: DemoState) { return JSON.stringify([productionSignature(p), assetSignature(p, state), aState(p), state.tasks.find(t => t.id === p.taskId)?.seconds]); }
function aState(p: Project) { const a = assistantData(p); return [a.versions.at(-1)?.signature, a.assetLock?.signature, a.storyboardBasis, a.promptBasis]; }
export function checkAssistant(p: Project, state: DemoState): AssistantCheck[] {
  const a = assistantData(p), task = state.tasks.find(t => t.id === p.taskId);
  const check = (id: string, ok: boolean, label: string, location: string): AssistantCheck => ({ id, status: ok ? 'pass' : 'fix', label, location });
  return [
    check('body', Boolean(p.script.body.trim()), '剧本正文已填写', '故事与剧本 → 单集剧本'),
    check('writer', scriptCurrent(p), '当前编剧资料已确认', '故事与剧本 → 确认编剧版本'),
    check('planning', [a.planning, a.outline, a.ledger, p.script.characters, p.script.synopsis].every(x => x.trim()), '策划、人物、大纲与连续性记录齐全', '故事与剧本 → 补齐各页签'),
    check('assets', assetsCurrent(p, state), '资产引用有效且版本已确认', '角色与资产 → 检查所属 IP、开放范围与版本，然后确认资产包'),
    check('storyboard', storyboardCurrent(p, state), '分镜对应当前编剧和资产版本', '分镜设计 → 检查现有镜头并确认版本对应'),
    ...p.shots.map((s, i) => check(`shot-${s.id}`, s.assetIds.length > 0 && s.assetIds.every(id => p.assetIds.includes(id) && state.assets.some(a => a.id === id && a.ipId === p.ipId)), `镜头 ${i + 1} 引用了有效资产`, `分镜设计 → 镜头 ${i + 1} → 引用资产`)),
    check('duration', Boolean(task) && p.shots.length > 0 && p.shots.every(s => Number.isFinite(s.duration) && s.duration > 0) && Math.abs(p.shots.reduce((n, s) => n + s.duration, 0) - (task?.seconds ?? 0)) < .01, `总时长符合任务要求（${task?.seconds ?? 0} 秒）`, '分镜设计 → 调整镜头时长'),
    check('prompts', Boolean(promptsCurrent(p, state)), '每个镜头的提示词已填写且对应当前制作资料', '视频制作 → 更新提示词并检查空白项'),
    { id: 'story-quality', status: 'manual', label: '剧情、人物动机与 IP 改编边界', location: '请人工阅读剧本；本地检查不评价故事质量' },
    { id: 'visual-quality', status: 'manual', label: '画面一致性、表演、声音与段落衔接', location: '请人工观看分镜预演；不是模型质量认证' },
  ];
}
export function assistantProblem(p: Project, state: DemoState) {
  if (!p.assistant?.enabled) return null;
  const issue = checkAssistant(p, state).find(c => c.status === 'fix');
  return issue ? `${issue.label}：需要更新。请前往${issue.location}。` : null;
}
export function checkWriter(p: Project, state: DemoState) {
  return checkAssistant(p, state).filter(c => ['body', 'writer', 'planning', 'story-quality'].includes(c.id));
}
export function checkDirector(p: Project, state: DemoState) {
  return checkAssistant(p, state).filter(c => !['body', 'planning', 'story-quality'].includes(c.id));
}
export function exportAssistant(p: Project, state: DemoState, kind: 'writer' | 'director') {
  const a = assistantData(p), source = kind === 'writer' ? skillSources.writer : skillSources.director;
  const header = `# ${p.title} · ${kind === 'writer' ? '编剧资料' : '导演提示词'}\n\n本地演示 / 预置示例与人工编辑 / 未调用模型\n来源：${source.name} ${source.version}\n${source.url}\n提交号：${source.commit}\n编剧版本：v${a.versions.at(-1)?.revision ?? 0}\n`;
  if (kind === 'writer') return header + `\n## 故事策划\n${a.planning}\n## 想法与篇幅\n${p.script.idea}\n${p.script.format}\n## 梗概\n${p.script.synopsis}\n## 人物\n${p.script.characters}\n## 大纲\n${a.outline}\n## 单集剧本\n${p.script.body}\n## 连续性记录\n${a.ledger}\n\n确认状态：${scriptCurrent(p) ? '已确认' : '需要确认'}\n`;
  return header + `\n画幅：${a.config.ratio}；衔接：${a.config.transition}；模板：${a.config.template}（示例，非实际服务）\n提示词状态：${promptsCurrent(p, state) ? '当前' : '需要更新'}\n\n` + p.shots.map((s, i) => `## 镜头 ${i + 1} · ${s.title}\n${a.prompts[s.id] || '尚未填写'}\n`).join('\n') + `\n## 制作检查\n` + checkDirector(p, state).map(c => `- ${c.status === 'pass' ? '通过' : c.status === 'fix' ? '需修改' : '待人工确认'}：${c.label}（${c.location}）`).join('\n');
}
