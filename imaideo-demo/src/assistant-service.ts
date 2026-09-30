import { changeProject, getState } from './service';
import { assistantData, assetSignature, assetsCurrent, checkAssistant, checkWriter, checkDirector, directorBasis, projectAssets, promptBasis, reportBasis, scriptCurrent, storyboardCurrent, validAssets, writerSignature } from './assistant-model';
import { assistantSamples, sampleShots } from './assistant-samples';
import type { AssistantData, Project } from './types';
import type { WriterStage } from './prompts/writer';

function mutate(id: string, fn: (p: Project, a: AssistantData) => void) {
  changeProject(id, p => { p.assistant ??= assistantData(p); p.assistant.enabled = true; fn(p, p.assistant); });
}
export function editWriter(id: string, field: 'planning' | 'outline' | 'ledger' | 'idea' | 'format' | 'synopsis' | 'characters' | 'body', value: string) {
  mutate(id, (p, a) => { if (field === 'planning' || field === 'outline' || field === 'ledger') a[field] = value; else p.script[field] = value; p.script.confirmedBody = ''; });
}
function asText(value: unknown) { return typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value, null, 2); }
export function applyWriterAiResult(id: string, stage: WriterStage, result: Record<string, unknown>) {
  mutate(id, (p, a) => {
    if (stage === 'planning') {
      a.storyPlan = JSON.stringify(result);
      a.planning = [`主题：${asText(result.theme)}`, `类型：${asText(result.genre)}`, `世界观：${asText(result.world)}`, `语气：${asText(result.tone)}`, `核心冲突：${asText(result.coreConflict)}`, `故事主线：${asText(result.logline)}`].join('\n');
      p.script.synopsis = asText(result.summary || result.logline);
    } else if (stage === 'characters') {
      a.characterData = JSON.stringify(result);
      p.script.characters = Array.isArray(result.characters) ? result.characters.map((c: Record<string, unknown>, i) => `人物 ${i + 1}｜${asText(c.name)}（${asText(c.role)}）\n年龄：${asText(c.age)}\n外观：${asText(c.appearance)}\n性格：${asText(c.personality)}\n背景：${asText(c.background)}\n动机：${asText(c.motivation)}\n冲突：${asText(c.conflict)}\n关系：${asText(c.relationship)}`).join('\n\n') : asText(result.characters);
    } else if (stage === 'outline') {
      a.outlineData = JSON.stringify(result);
      const outline = Array.isArray(result.outline) ? result.outline : [];
      const acts = Array.isArray(result.acts) ? result.acts : [];
      const events = Array.isArray(result.keyEvents) ? result.keyEvents : [];
      a.outline = [...acts.map((x, i) => `阶段 ${i + 1}：${asText(x)}`), ...outline.map((x, i) => `${i + 1}. ${asText(x)}`), events.length ? `关键事件：${events.map(asText).join('；')}` : '', `结尾：${asText(result.ending)}`].filter(Boolean).join('\n');
    } else if (stage === 'script') {
      p.script.body = asText(result.body || result.script); p.script.confirmedBody = '';
    } else if (stage === 'continuity') {
      a.ledger = [`人物状态：${asText(result.characterStates)}`, `人物关系：${asText(result.relationships)}`, `重要道具：${asText(result.props)}`, `地点：${asText(result.locations)}`, `已发生事件：${asText(result.events)}`, `未解决伏笔：${asText(result.openThreads)}`, `时间线：${asText(result.timeline)}`].join('\n');
    } else if (stage === 'review') {
      a.scriptReview = JSON.stringify(result);
    }
  });
}
export function loadWriterExample(id: string) {
  mutate(id, (p, a) => {
    const s = assistantSamples[p.ipId]; if (!s) throw new Error('这个 IP 没有完整创作示例。');
    a.planning = s.planning; a.outline = s.scenes.map((scene, i) => `${i + 1}. ${scene[0]}：${scene[1]}`).join('\n'); a.ledger = s.ledger;
    // Keep the user's idea and requested format; a fixture never pretends to respond to them.
    p.script.synopsis = s.synopsis; p.script.characters = s.characters;
    p.script.body = sampleShots(p.ipId).map((shot, i) => `第 ${i + 1} 场 · ${shot.title}（${shot.duration} 秒）\n${shot.description}\n${shot.dialogue || '无对白，保留环境声。'}`).join('\n\n'); p.script.confirmedBody = '';
  });
}
export function confirmWriter(id: string) {
  mutate(id, (p, a) => {
    if (![p.script.body, p.script.synopsis, p.script.characters, a.planning, a.outline, a.ledger].every(x => x.trim())) throw new Error('请补齐策划、梗概、人物、大纲、剧本和连续性记录。');
    if (scriptCurrent(p)) return;
    p.script.confirmedBody = p.script.body; p.script.revision += 1;
    a.versions.push({ revision: p.script.revision, confirmedAt: new Date().toISOString(), signature: writerSignature(p), script: structuredClone(p.script), planning: a.planning, outline: a.outline, ledger: a.ledger });
    p.status = 'producing';
  });
}
export function editDirector(id: string, patch: Partial<Pick<AssistantData, 'style' | 'config'>>) { mutate(id, (_p, a) => Object.assign(a, patch)); }
export function loadStyleExample(id: string) { mutate(id, (p, a) => { a.style = assistantSamples[p.ipId]?.style ?? ''; }); }
export function confirmAssets(id: string) {
  mutate(id, (p, a) => {
    if (!scriptCurrent(p)) throw new Error('请先确认编剧版本。');
    if (!validAssets(p, getState()) || !a.style.trim()) throw new Error('请选择本 IP 可用资产，并填写外观与风格设定。');
    a.assetLock = { signature: assetSignature(p, getState()), assets: structuredClone(projectAssets(p, getState())) };
  });
}
function requireDirector(p: Project) {
  if (!scriptCurrent(p)) throw new Error('请先确认当前编剧版本。');
  if (!assetsCurrent(p, getState())) throw new Error('请先确认当前资产包和外观设定。');
}
export function loadStoryboardExample(id: string) {
  mutate(id, (p, a) => {
    requireDirector(p);
    p.shots = sampleShots(p.ipId).map(s => ({ ...s, assetIds: s.assetIds.filter(id => p.assetIds.includes(id)) }));
    // Fixtures must be reviewed against the actual confirmed script before binding.
    a.storyboardBasis = ''; a.promptBasis = '';
  });
}
export function confirmStoryboard(id: string) {
  mutate(id, (p, a) => { requireDirector(p); if (!p.shots.length) throw new Error('请先添加分镜。'); a.storyboardBasis = directorBasis(p, getState()); });
}
export function preparePrompts(id: string) {
  mutate(id, (p, a) => {
    if (!storyboardCurrent(p, getState())) throw new Error('请先检查分镜并确认它与当前编剧版本对应。');
    const version = a.versions.at(-1)!;
    a.prompts = Object.fromEntries(p.shots.map(s => {
      const refs = a.assetLock!.assets.filter(x => s.assetIds.includes(x.id)).map(x => `${x.name} v${x.version}：${x.description}`).join('\n');
      const common = `画幅：${a.config.ratio}\n风格：${a.style}\n参考资产：\n${refs}\n景别：${s.framing || '待补充'}；运镜：${s.camera}；时长：${s.duration}秒\n画面：${s.description}\n动作：${s.action || s.description}\n对白（${s.tone || '自然'}）：${s.dialogue || '无'}\n声音：${s.sound || '环境声'}\n接续状态：${s.continuity || '待补充'}\n衔接方式：${a.config.transition}`;
      const content = a.config.template === 'H3' ? `【H3 格式改编示例·非接口载荷】\n[Shot 1]\n${common}` : a.config.template === 'Seedance' ? `【Seedance 格式改编示例·非接口载荷】\n【画幅风格】${a.config.ratio} / ${a.style}\n【核心人物】${version.script.characters}\n【参考资产】${refs}\n【时间轴分镜】${common}\n【接续状态】${s.continuity || '待补充'}\n【音效】${s.sound || '环境声'}\n【强制禁止项】水印、标志、肢体变形` : common;
      return [s.id, `预置示例素材 + 当前编辑字段拼装；不是实时 AI 输出\n依据已确认剧本 v${version.revision}\n${content}`];
    }));
    a.promptBasis = promptBasis(p, getState());
  });
}
export function editPrompt(id: string, shotId: string, value: string) { mutate(id, (p, a) => { if (!p.shots.some(s => s.id === shotId)) throw new Error('镜头不存在。'); a.prompts[shotId] = value; }); }
export function runAssistantChecks(id: string) { mutate(id, (p, a) => { a.checkReport = { at: new Date().toISOString(), basis: reportBasis(p, getState()), items: checkAssistant(p, getState()) }; }); }
export function runWriterChecks(id: string) { mutate(id, (p, a) => { a.writerCheckReport = { at: new Date().toISOString(), basis: writerSignature(p) + scriptCurrent(p), items: checkWriter(p, getState()) }; }); }
export function runDirectorChecks(id: string) { mutate(id, (p, a) => { a.directorCheckReport = { at: new Date().toISOString(), basis: reportBasis(p, getState()), items: checkDirector(p, getState()) }; }); }
