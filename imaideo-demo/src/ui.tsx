import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, ChevronLeft, X, Play, Pause, RotateCcw, VolumeX, Film, CheckCircle2, Circle } from 'lucide-react';
import { getState, subscribe } from './service';
import type { Project, ProjectStatus } from './types';

export const useDemo = () => useSyncExternalStore(subscribe, getState);
export const NoticeContext = createContext<(text: string) => void>(() => {});
export const useNotice = () => useContext(NoticeContext);
export function nav(path: string) { window.location.hash = path; window.scrollTo(0, 0); }
export function useRoute() { const [path, setPath] = useState(location.hash.slice(1) || '/'); useEffect(() => { const f = () => setPath(location.hash.slice(1) || '/'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []); return path; }
export const assetUrl = (name: string) => `${import.meta.env.BASE_URL}assets/${name}.png`;
export function Artwork({ cover, frame, className = '', title = '' }: { cover: string; frame?: number; className?: string; title?: string }) {
  const original = ['cloud', 'sea', 'lantern'].includes(cover);
  const style: CSSProperties = original ? frame !== undefined && cover === 'cloud' ? { backgroundImage: `url("${assetUrl('storyboard')}")`, backgroundSize: '300% 200%', backgroundPosition: `${(frame % 3) * 50}% ${Math.floor(frame / 3) * 100}%` } : { backgroundImage: `url("${assetUrl(cover)}")` } : {};
  const palette = ['haier', 'hululu', 'blackcat', 'bighead', 'digimon', 'ultraman'].includes(cover) ? 'abstract-childhood' : ['nezha', 'pleasant-goat', 'boonie', 'little-carp', 'journey-west', 'new-journey', 'book', 'deer', 'snow'].includes(cover) ? 'abstract-guoman' : ['seer', 'roc', 'mole', 'aobi', 'genshin', 'honor'].includes(cover) ? 'abstract-game' : 'abstract-international';
  const characters: Record<string, string> = { book: '奇', deer: '善', snow: '雪', haier: '海', hululu: '葫', blackcat: '警', bighead: '家', digimon: '数', ultraman: '光', nezha: '哪', 'pleasant-goat': '喜', boonie: '熊', 'little-carp': '鱼', 'journey-west': '天', 'new-journey': '游', seer: '赛', roc: '洛', mole: '摩', aobi: '岛', genshin: '原', honor: '王', pokemon: '宝', doraemon: '梦', 'tom-jerry': '猫', transformers: '变', spongebob: '海', minecraft: '方' };
  return <div role={title ? 'img' : undefined} aria-label={title || undefined} className={`artwork ${original ? 'original' : `abstract ${palette} abstract-${cover}`} ${className}`} style={style}>{!original && <><div className="abstract-orbit"/><div className="abstract-line"/><span className="abstract-character">{characters[cover] || 'IP'}</span></>}</div>;
}
export function Button({ children, onClick, variant = 'primary', disabled = false, type = 'button', className = '', title }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; type?: 'button' | 'submit'; className?: string; title?: string }) { return <button type={type} title={title} disabled={disabled} onClick={onClick} className={`btn ${variant} ${className}`}>{children}</button>; }
export function IconButton({ label, children, onClick, disabled = false }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean }) { return <button className="icon-button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>; }
export function SectionHead({ title, detail, action, onAction }: { title: string; detail?: string; action?: string; onAction?: () => void }) { return <div className="section-head"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action && <button className="text-link" onClick={onAction}>{action}<ArrowRight size={15}/></button>}</div>; }
export function PageHead({ title, detail, children, back }: { title: string; detail: string; children?: ReactNode; back?: string }) { return <header className="page-head">{back && <button className="text-link back" onClick={() => nav(back)}><ChevronLeft size={16}/>返回</button>}<div className="page-head-row"><div><h1>{title}</h1><p>{detail}</p></div><div className="head-actions">{children}</div></div></header>; }
export function Empty({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) { return <div className="empty"><Film size={32}/><h3>{title}</h3><p>{detail}</p>{action && <Button onClick={onAction}>{action}<ArrowRight size={15}/></Button>}</div>; }
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Tag({ children, tone = '' }: { children: ReactNode; tone?: string }) { return <span className={`tag ${tone}`}>{children}</span>; }
export const statusLabels: Record<ProjectStatus, string> = { draft: '草稿', producing: '制作中', review: '待审核', changes: '需修改', selected: '已入选' };
export function Status({ status }: { status: ProjectStatus }) { return <Tag tone={status}>{status === 'selected' ? <CheckCircle2 size={12}/> : <Circle size={7} fill="currentColor"/>}{statusLabels[status]}</Tag>; }
export function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => { dialog.close(); }; }, []);
  return <dialog ref={ref} className={`dialog ${wide ? 'wide' : ''}`} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) onClose(); }}><div className="dialog-heading"><h2>{title}</h2><IconButton label="关闭弹窗" onClick={onClose}><X size={20}/></IconButton></div>{children}</dialog>;
}
export function downloadJson(name: string, data: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `${name}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function formatDate(date: string) { return new Date(date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }); }
export function Animatic({ project, onClose }: { project: Project; onClose: () => void }) {
  const { ips } = useDemo(); const ip = ips.find(i => i.id === project.ipId)!;
  const [playing, setPlaying] = useState(false), [elapsed, setElapsed] = useState(0);
  const total = project.shots.reduce((n, s) => n + s.duration, 0);
  useEffect(() => { if (!playing) return; const t = setInterval(() => setElapsed(v => Math.min(v + 0.1, total)), 100); return () => clearInterval(t); }, [playing, total]);
  useEffect(() => { if (elapsed >= total) setPlaying(false); }, [elapsed, total]);
  let acc = 0; const index = project.shots.findIndex(s => { acc += s.duration; return elapsed < acc; });
  const shot = project.shots[index < 0 ? project.shots.length - 1 : index];
  return <Dialog title={project.submission.title || project.title} onClose={onClose} wide><div className="player">
    <div className="player-screen"><Artwork key={shot.id} cover={ip.cover} frame={project.ipId === 'cloud' ? shot.frame : undefined} className={playing ? 'playing-frame' : ''}/><span className="player-watermark">imaideo / 分镜预演 · 演示素材</span><span className="player-shot">{String((index < 0 ? project.shots.length - 1 : index) + 1).padStart(2, '0')} / {String(project.shots.length).padStart(2, '0')}</span>{shot.dialogue && <div className="subtitles">{shot.dialogue}</div>}</div>
    <div className="player-controls"><IconButton label={playing ? '暂停' : '播放分镜预演'} onClick={() => { if (elapsed >= total) setElapsed(0); setPlaying(!playing); }}>{playing ? <Pause size={18}/> : <Play size={18}/>}</IconButton><IconButton label="从头播放" onClick={() => { setElapsed(0); setPlaying(true); }}><RotateCcw size={16}/></IconButton><span>{Math.floor(elapsed).toString().padStart(2, '0')} / {total} 秒</span><input aria-label="预演进度" type="range" min="0" max={total} step="0.1" value={elapsed} onChange={e => setElapsed(Number(e.target.value))}/><VolumeX size={16}/></div>
    <p className="muted player-caption">原创静帧与镜头运动组成的无声分镜预演，字幕展示对白。预置示例，非实时 AI 生成视频。</p>
    <div className="player-strip">{project.shots.map((s, i) => <button key={s.id} className={shot.id === s.id ? 'active' : ''} onClick={() => setElapsed(project.shots.slice(0, i).reduce((n, x) => n + x.duration, 0))}><Artwork cover={ip.cover} frame={ip.id === 'cloud' ? s.frame : undefined}/><span>{i + 1}. {s.title}</span></button>)}</div>
  </div></Dialog>;
}
