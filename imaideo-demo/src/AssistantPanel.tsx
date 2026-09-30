import { useEffect, useState } from 'react';
import { ArrowRight, Check, Download, FileText } from 'lucide-react';
import { Button, Dialog, Field, nav, useDemo, useNotice } from './ui';
import { assistantData, assetsCurrent, checkWriter, checkDirector, writerSignature, exportAssistant, promptsCurrent, reportBasis, scriptCurrent, skillSources, storyboardCurrent } from './assistant-model';
import { applyWriterAiResult, confirmAssets, confirmStoryboard, confirmWriter, editDirector, editPrompt, editWriter, preparePrompts, runWriterChecks, runDirectorChecks } from './assistant-service';
import { generateWriterStage, listWriterModels } from './writer-client';
import type { WriterStage } from './prompts/writer';
import type { AssistantData, Project } from './types';
import './assistant.css';
import { assistantPath } from './workspace-route';

const writerTabs = ['故事策划', '人物设定', '故事大纲', '单集剧本', '连续性记录', '剧本检查'];
function downloadMarkdown(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `${name}.md`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function AssistantPanel({ project: p, step, readOnly, onStep }: { project: Project; step: number; readOnly: boolean; onStep: (step: number) => void }) {
  const state = useDemo(), notify = useNotice(), a = assistantData(p);
  const [tab, setTab] = useState(0), [showVersion, setShowVersion] = useState(false), [aiLoading, setAiLoading] = useState<WriterStage | null>(null), [writerModels, setWriterModels] = useState<string[]>([]), [writerModel, setWriterModel] = useState('');
  const isWriter = step === 0;
  useEffect(() => { if (isWriter) listWriterModels().then(result => { const models = result.textModels.length ? result.textModels : result.models; setWriterModels(models); setWriterModel(result.configuredTextModel || models[0] || ''); }).catch(() => undefined); }, [isWriter]);
  const writerReady = scriptCurrent(p), assetsReady = assetsCurrent(p, state), shotsReady = storyboardCurrent(p, state), promptsReady = Boolean(promptsCurrent(p, state));
  const checks = isWriter ? checkWriter(p, state) : checkDirector(p, state);
  const savedReport = isWriter ? a.writerCheckReport : a.directorCheckReport;
  const basis = isWriter ? writerSignature(p) + scriptCurrent(p) : reportBasis(p, state);
  const stages = [assetsReady, shotsReady, promptsReady];
  const next = stages.findIndex(done => !done), nextStep = next === -1 ? 3 : next + 1;
  const attempt = (action: () => void, message?: string) => { try { action(); if (message) notify(message); } catch (e) { notify((e as Error).message); } };
  const source = step === 0 ? skillSources.writer : skillSources.director;
  const exportFile = (kind: 'writer' | 'director') => downloadMarkdown(`${p.title}-${kind === 'writer' ? '编剧资料' : '导演提示词'}`, exportAssistant(p, state, kind));
  const edit = (field: Parameters<typeof editWriter>[1], value: string) => attempt(() => editWriter(p.id, field, value));
  const generateWriter = async (stage: WriterStage) => {
    setAiLoading(stage);
    try {
      const result = await generateWriterStage(stage, { idea: p.script.idea, format: p.script.format, synopsis: p.script.synopsis, characters: p.script.characters, planning: a.planning, outline: a.outline, body: p.script.body, ledger: a.ledger, ipTitle: state.ips.find(ip => ip.id === p.ipId)?.title || '', ipRules: state.ips.find(ip => ip.id === p.ipId)?.rules || '' }, writerModel);
      applyWriterAiResult(p.id, stage, result); notify('AI 编剧结果已生成并保存。');
    } catch (error) { notify((error as Error).message); } finally { setAiLoading(null); }
  };
  const aiButton = (stage: WriterStage, label: string) => <Button variant="secondary" disabled={readOnly || aiLoading !== null} onClick={() => void generateWriter(stage)}>{aiLoading === stage ? 'AI 生成中…' : label}</Button>;
  const config = (patch: Partial<AssistantData['config']>) => attempt(() => editDirector(p.id, { config: { ...a.config, ...patch } }));
  const report = <div className="assistant-checks"><p className="assistant-caption">结构与引用检查 · 结果需要结合人工判断。</p>{savedReport && <p className="assistant-caption">上次检查：{new Date(savedReport.at).toLocaleString('zh-CN')} · {savedReport.basis === basis ? '检查记录对应当前资料' : '资料已变动，需要重新检查'}</p>}{checks.map(c => <div key={c.id} className={`assistant-check ${c.status}`}><span>{c.status === 'pass' ? '通过' : c.status === 'fix' ? '需修改' : '待人工确认'}</span><div><strong>{c.label}</strong><small>{c.location}</small></div></div>)}<Button variant="secondary" disabled={readOnly} onClick={() => attempt(() => (isWriter ? runWriterChecks : runDirectorChecks)(p.id), '本地检查记录已保存。')}>运行本地检查并保存</Button></div>;
  return <section className="assistant-panel" aria-label={step === 0 ? '编剧助手' : '导演助手'}>
    <header className="assistant-heading"><div><span className="assistant-eyebrow">{step === 0 ? 'WRITER / 编剧助手' : 'DIRECTOR / 导演助手'}</span><h2>{step === 0 ? '从故事想法，到确认剧本' : ['','锁定这个世界的样子','从确认剧本，到镜头语言','为每个镜头准备制作资料','制作资料随作品一起送审'][step]}</h2></div></header>
    <p className="assistant-caption">参考 <a href={source.url} target="_blank" rel="noreferrer">{source.name} {source.version}</a> · 已适配 IP 共创流程</p>
    {isWriter ? <>
      <ol className="assistant-progress writer-progress">{[
        { label: '故事策划', done: Boolean(a.planning.trim() && p.script.synopsis.trim()), tab: 0 },
        { label: '人物设定', done: Boolean(p.script.characters.trim()), tab: 1 },
        { label: '故事大纲', done: Boolean(a.outline.trim()), tab: 2 },
        { label: '单集剧本', done: Boolean(p.script.body.trim()), tab: 3 },
        { label: '连续性记录', done: Boolean(a.ledger.trim()), tab: 4 },
        { label: '版本确认', done: writerReady, tab: 5 },
      ].map(item => <li key={item.label} className={item.done ? 'done' : ''}><button onClick={() => setTab(item.tab)}>{item.label}<small>{item.done ? item.tab === 5 ? '已确认' : '已填写' : '待完成'}</small></button></li>)}</ol>
      <p className="assistant-caption">{writerReady ? '当前编剧版本已确认，可以交接。' : '下一步：补齐编剧资料，检查并确认版本。'}</p>
    </> : <>
      <div className="notice-block compact"><FileText size={17}/><p>{writerReady ? `正在使用已确认编剧版本 v${a.versions.at(-1)?.revision}。` : a.versions.length ? '上游编剧内容已修改，当前导演内容基于旧版本，需要更新。已有编辑会保留。' : '尚未确认编剧版本。请先在编剧助手中确认；已有制作资料会保留。'}</p><Button variant="ghost" onClick={() => nav(assistantPath(p.id, 'writer'))}>{writerReady ? '修改剧本' : '前往编剧助手'}</Button></div>
      <ol className="assistant-progress director-progress">{['资产确认', '分镜对应', '提示词就绪'].map((label, i) => <li key={label} className={stages[i] ? 'done' : ''}><button onClick={() => onStep(i + 1)}><span>{stages[i] ? <Check size={12}/> : i + 1}</span>{label}<small>{stages[i] ? '已完成' : a.enabled ? '待完成 / 更新' : '待体验'}</small></button></li>)}</ol>
      <div className="assistant-next"><span>{!writerReady ? '下一步：等待编剧确认版本' : next === -1 ? '资料已就绪：运行制作检查，随后生成镜头。' : `下一步：${['确认资产包与风格', '核对分镜与确认剧本', '更新视频提示词'][next]}`}</span>{writerReady && <button className="text-link" onClick={() => onStep(nextStep)}>前往<ArrowRight size={14}/></button>}</div>
    </>}
    <div className="assistant-actions"><Button variant="ghost" onClick={() => exportFile(isWriter ? 'writer' : 'director')}><Download size={14}/>{isWriter ? '导出编剧 Markdown' : '导出导演 Markdown'}</Button>{a.versions.length > 0 && <Button variant="ghost" onClick={() => setShowVersion(true)}><FileText size={14}/>查看确认版本 v{a.versions.at(-1)!.revision}</Button>}</div>
    {step === 0 && <>
      <div className="assistant-tabs" aria-label="编剧资料分类">{writerTabs.map((label, i) => <button key={label} aria-pressed={tab === i} className={tab === i ? 'active' : ''} onClick={() => setTab(i)}>{label}</button>)}</div>{writerModels.length > 1 && <div className="assistant-model-picker"><label>编剧模型<select value={writerModel} onChange={e => setWriterModel(e.target.value)} disabled={aiLoading !== null}>{writerModels.map(model => <option key={model}>{model}</option>)}</select></label><span>可按阶段切换，默认使用 .env 第一项。</span></div>}
      <fieldset disabled={readOnly}>
        {tab === 0 && <><Field label="你的故事想法"><textarea rows={3} value={p.script.idea} onChange={e => edit('idea', e.target.value)}/></Field><Field label="创作篇幅"><select value={p.script.format} onChange={e => edit('format', e.target.value)}><option>60 秒短片</option><option>90 秒漫剧</option><option>3 分钟故事</option></select></Field><Field label="故事策划"><textarea rows={6} value={a.planning} onChange={e => edit('planning', e.target.value)} placeholder="主题、情感承诺、冲突、转折与结尾"/></Field><Field label="故事梗概"><textarea rows={3} value={p.script.synopsis} onChange={e => edit('synopsis', e.target.value)}/></Field><div className="assistant-actions">{aiButton('planning', 'AI 生成故事策划')}</div></>}
        {tab === 1 && <><Field label="人物设定"><textarea rows={10} value={p.script.characters} onChange={e => edit('characters', e.target.value)}/></Field><div className="assistant-actions">{aiButton('characters', 'AI 生成人物设定')}</div></>}
        {tab === 2 && <><Field label="故事大纲"><textarea rows={12} value={a.outline} onChange={e => edit('outline', e.target.value)}/></Field><div className="assistant-actions">{aiButton('outline', 'AI 生成故事大纲')}</div></>}
        {tab === 3 && <><Field label="单集剧本"><textarea rows={19} value={p.script.body} onChange={e => edit('body', e.target.value)}/></Field><div className="assistant-actions">{aiButton('script', 'AI 生成单集剧本')}</div></>}
        {tab === 4 && <><Field label="连续性记录"><textarea rows={12} value={a.ledger} onChange={e => edit('ledger', e.target.value)} placeholder="伏笔、人物、道具状态、世界规则"/></Field><div className="assistant-actions">{aiButton('continuity', 'AI 更新连续性记录')}</div></>}
      </fieldset>
      {tab === 5 && <><div className="assistant-actions">{aiButton('review', 'AI 检查剧本')}</div>{a.scriptReview && <pre className="assistant-version">{a.scriptReview}</pre>}{report}</>}
      <div className="assistant-actions"><Button disabled={readOnly || writerReady} onClick={() => attempt(() => confirmWriter(p.id), '编剧版本已保存，导演助手将读取此快照。')}><Check size={15}/>{writerReady ? `编剧 v${p.script.revision} 已确认` : '确认编剧版本'}</Button></div>
    </>}
    {step === 0 && <div className="assistant-actions"><Button disabled={!writerReady} onClick={() => nav(assistantPath(p.id, 'director'))}>交给导演助手<ArrowRight size={15}/></Button></div>}
    {step === 1 && <><Field label="外观与风格设定"><textarea disabled={readOnly} rows={4} value={a.style} onChange={e => attempt(() => editDirector(p.id, { style: e.target.value }))}/></Field><div className="assistant-actions"><Button disabled={readOnly || !writerReady || assetsReady} onClick={() => attempt(() => confirmAssets(p.id), '资产版本与外观设定已锁定。')}>确认资产包</Button></div><p className="assistant-caption">在下方选择本 IP 开放的资产；修改选用项或版本后需要重新确认。</p>{a.assetLock && <details><summary>已确认资产版本（{a.assetLock.assets.length} 份）</summary>{a.assetLock.assets.map(asset => <p className="assistant-caption" key={asset.id}>{asset.kind} · {asset.name} · v{asset.version}</p>)}</details>}</>}
    {step === 2 && <><p className="assistant-caption">请展开“查看确认版本”，人工核对下方镜头与已确认剧本，再确认对应关系。</p><div className="assistant-actions"><Button disabled={readOnly || !writerReady || !assetsReady || shotsReady} onClick={() => attempt(() => confirmStoryboard(p.id), '已记录分镜对应的编剧与资产版本。')}>确认分镜对应</Button></div></>}
    {step === 3 && <><fieldset disabled={readOnly}><div className="form-grid three"><Field label="画幅"><select value={a.config.ratio} onChange={e => config({ ratio: e.target.value as AssistantData['config']['ratio'] })}>{['16:9', '9:16', '21:9'].map(x => <option key={x}>{x}</option>)}</select></Field><Field label="段落衔接"><select value={a.config.transition} onChange={e => config({ transition: e.target.value as AssistantData['config']['transition'] })}>{['换机位衔接', '末态延续', '空镜过渡'].map(x => <option key={x}>{x}</option>)}</select></Field><Field label="提示词模板"><select value={a.config.template} onChange={e => config({ template: e.target.value as AssistantData['config']['template'] })}>{['通用', 'Seedance', 'H3'].map(x => <option key={x}>{x}</option>)}</select></Field></div></fieldset><p className="assistant-caption">记录提示词格式与画幅，供后续制作服务使用。</p><Button disabled={readOnly || !shotsReady} variant="secondary" onClick={() => attempt(() => preparePrompts(p.id), '已根据当前制作资料更新提示词。')}>更新全部提示词</Button><div className="assistant-prompt-list">{p.shots.map((s, i) => <details key={s.id}><summary>镜头 {i + 1} · {s.title}<span>{a.prompts[s.id]?.trim() ? promptsReady ? '当前资料' : '需检查 / 更新' : '尚未填写'}</span></summary><Field label={`镜头 ${i + 1} 提示词`}><textarea rows={12} disabled={readOnly} value={a.prompts[s.id] || ''} onChange={e => attempt(() => editPrompt(p.id, s.id, e.target.value))}/></Field></details>)}</div>{report}</>}
    {step === 4 && <details><summary>随投稿保存的制作检查与助手资料</summary>{report}</details>}
    {showVersion && <Dialog title="已确认编剧版本" onClose={() => setShowVersion(false)} wide>{a.versions.slice().reverse().map(v => <details key={v.revision} open={v === a.versions.at(-1)}><summary>v{v.revision} · {new Date(v.confirmedAt).toLocaleString('zh-CN')}</summary><pre className="assistant-version">{`${v.planning}\n\n${v.script.characters}\n\n${v.outline}\n\n${v.script.body}\n\n${v.ledger}`}</pre></details>)}</Dialog>}
  </section>;
}
