import { FileText, Image, Film, Workflow } from 'lucide-react';
import { PageHead, Tag } from './ui';
import './assistant.css';

// Static demo: deliberately has no project, store, generation or persistence dependency.
export default function CanvasDemo() {
  return <>
    <PageHead title="画布创作" detail="独立自由创作空间，用节点组织灵感与画面。"><Tag>演示界面，实际功能待接入</Tag></PageHead>
    <p className="canvas-demo-note">以下为固定布局示例。拖动、编辑、生成和草稿保存尚未开放；这里不读取或同步助手项目。</p>
    <section className="canvas-demo" aria-label="独立画布演示">
      <div className="canvas-demo-toolbar"><span><Workflow size={16}/>自由创作 · 示例画布</span><Tag>仅展示</Tag></div>
      <div className="canvas-demo-nodes">
        <article><span><FileText size={18}/>灵感笔记</span><h2>雨后的城市</h2><p>一位旅人沿着倒映天空的街道，寻找记忆中的一扇窗。</p><small>文字节点 · 预置示例</small></article>
        <div className="canvas-demo-link" aria-hidden="true"/>
        <article><span><Image size={18}/>视觉参考</span><div className="canvas-demo-art" role="img" aria-label="蓝灰色城市抽象示意"/><p>蓝灰暮色 · 暖色窗灯 · 湿润街面</p><small>图像节点 · 抽象占位</small></article>
        <div className="canvas-demo-link" aria-hidden="true"/>
        <article><span><Film size={18}/>镜头构想</span><h2>沿街缓慢推进</h2><p>从水面倒影抬起视线，让窗灯逐渐进入画面。</p><small>视频节点 · 尚未接入生成</small></article>
      </div>
    </section>
  </>;
}
