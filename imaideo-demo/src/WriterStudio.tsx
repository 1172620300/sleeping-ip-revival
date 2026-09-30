import { ArrowLeft, LockKeyhole } from 'lucide-react';
import AssistantPanel from './AssistantPanel';
import { Button, Empty, Status, nav, useDemo } from './ui';
import { assistantPath } from './workspace-route';

export default function WriterStudio({ projectId }: { projectId: string }) {
  const state = useDemo(), p = state.projects.find(p => p.id === projectId);
  if (!p) return <Empty title="找不到这个项目" detail="请返回项目列表。" action="我的项目" onAction={() => nav('/projects')}/>;
  const readOnly = state.role !== 'creator' || p.status === 'review' || p.status === 'selected';
  return <>
    <div className="studio-heading"><div>
      <button className="text-link" onClick={() => nav('/assistants/writer')}><ArrowLeft size={14}/>编剧助手</button>
      <div className="studio-title"><h1>{p.title}</h1><Status status={p.status}/></div>
      <p>{state.ips.find(ip => ip.id === p.ipId)?.title} · 编剧资料 · 本机自动保存</p>
    </div></div>
    {readOnly && <div className="notice-block compact"><LockKeyhole size={17}/><p>当前为只读模式，可以查看编剧资料与确认版本，不能编辑。</p></div>}
    <div className="studio-main writer-workspace"><AssistantPanel project={p} step={0} readOnly={readOnly} onStep={() => nav(assistantPath(p.id, 'director'))}/></div>
    <div className="studio-step-footer"><Button variant="ghost" onClick={() => nav('/projects')}>返回我的项目</Button></div>
  </>;
}
