import { useEffect, useState } from 'react';
import { Play, RefreshCw, Sparkles } from 'lucide-react';
import { Button, Field, Tag, useNotice, useDemo } from './ui';
import { changeProject } from './service';
import { getSeedanceVideo, listSeedanceModels, seedanceStatus, submitSeedanceVideo } from './seedance-client';
import { assistantData, promptsCurrent } from './assistant-model';

export default function SeedancePanel({ projectId, readOnly = false }: { projectId: string; readOnly?: boolean }) {
  const state = useDemo(), project = state.projects.find(p => p.id === projectId), notify = useNotice();
  const [models, setModels] = useState<string[]>([]), [model, setModel] = useState(''), [configured, setConfigured] = useState(false), [configuredOnly, setConfiguredOnly] = useState(false), [loading, setLoading] = useState(false), [shotId, setShotId] = useState('');
  const shots = project?.shots || [], active = shots.find(s => s.id === shotId) || shots[0];
  useEffect(() => { seedanceStatus().then(s => setConfigured(s.configured)).catch(() => setConfigured(false)); listSeedanceModels().then(r => { setModels(r.models); setConfiguredOnly(r.configuredOnly); setModel(r.configuredModel || r.models[0] || ''); }).catch(() => undefined); }, []);
  if (!project || !active) return null;
  const a = assistantData(project), prompt = a.prompts[active.id] || '';
  const submit = async () => {
    if (!model) return notify('尚未发现可用的 Seedance 模型，请检查后端配置。');
    if (!promptsCurrent(project, state) || !prompt.trim()) return notify('请先完成当前分镜和提示词检查。');
    setLoading(true);
    try {
      const task = await submitSeedanceVideo(model, prompt);
      changeProject(project.id, p => { const s = p.shots.find(x => x.id === active.id)!; s.videoProvider = 'seedance'; s.videoTaskId = task.taskId; s.videoUrl = ''; s.videoError = ''; s.clipStatus = 'queued'; s.selected = false; });
      notify('Seedance 任务已提交，正在等待结果。');
    } catch (error) { notify((error as Error).message); } finally { setLoading(false); }
  };
  const poll = async () => {
    if (!active.videoTaskId) return;
    setLoading(true);
    try {
      const task = await getSeedanceVideo(active.videoTaskId); const status = task.status.toLowerCase();
      changeProject(project.id, p => { const s = p.shots.find(x => x.id === active.id)!; s.clipStatus = status === 'completed' ? 'done' : status === 'failed' ? 'failed' : 'running'; s.videoUrl = task.videoUrl || s.videoUrl; s.videoError = task.error ? String(task.error) : ''; s.selected = status === 'completed'; });
      if (status === 'completed') notify('Seedance 视频已完成。'); else if (status === 'failed') notify('Seedance 生成失败，请查看错误并重试。');
    } catch (error) { notify((error as Error).message); } finally { setLoading(false); }
  };
  return <section className="seedance-panel"><div className="editor-section-head"><div><h3><Sparkles size={16}/> Seedance 2.0 实际生成</h3><p>通过服务端异步任务生成视频，结果会保存到当前镜头。</p></div><Tag>{configured ? configuredOnly ? '已配置 / 待授权' : '已连接' : '待配置'}</Tag></div><div className="form-grid"><Field label="模型"><select value={model} onChange={e => setModel(e.target.value)} disabled={readOnly || !models.length}><option value="">{models.length ? '选择 Seedance 模型' : '未发现模型'}</option>{models.map(item => <option key={item}>{item}</option>)}</select></Field><Field label="镜头"><select value={active.id} onChange={e => setShotId(e.target.value)} disabled={readOnly}>{shots.map((s, i) => <option key={s.id} value={s.id}>镜头 {i + 1} · {s.title}</option>)}</select></Field></div><p className="assistant-caption">当前提示词：{prompt ? '已准备' : '尚未填写'}；API 密钥只保存在服务端。{configuredOnly ? '当前 Key 的模型列表未返回该视频模型，提交前请确认账号已开通 Seedance 权限。' : ''}</p><div className="assistant-actions"><Button disabled={readOnly || loading || !configured || !model} onClick={submit}><Play size={14}/>{loading ? '提交中…' : '提交 Seedance 任务'}</Button><Button variant="secondary" disabled={readOnly || loading || !active.videoTaskId} onClick={poll}><RefreshCw size={14}/>查询任务状态</Button>{active.videoUrl && <a className="btn secondary" href={active.videoUrl} target="_blank" rel="noreferrer">打开视频</a>}</div>{active.videoError && <p className="validation-message">{active.videoError}</p>} {!configured && <p className="assistant-caption">演示环境尚未配置沧元算力。复制 .env.example 为 .env，填写密钥后启动 npm run api。</p>}</section>;
}
