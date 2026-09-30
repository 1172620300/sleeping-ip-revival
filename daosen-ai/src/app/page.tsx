"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getSession, type SafeUser } from "@/lib/client";
import { Button, NoticeBanner, Panel, StatusLabel, roleLabels } from "@/components/ui";

export default function HomePage() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getSession(controller.signal).then((result) => setUser(result.user)).catch((reason) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "登录状态读取失败。");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  return <div className="overview">
    <section className="welcome-panel">
      <div className="welcome-copy"><h1>道森 AI 平台<br />从一个可信账户开始。</h1><p>Phase 1 演示已开放注册、登录与账户查看。在这里验证身份和角色边界，后续业务功能尚未启用。</p><div className="page-actions"><Link href={user ? "/account" : "/login"} className="btn btn-primary">{user ? "查看我的账户" : "登录演示账号"}<ArrowRight size={17} aria-hidden="true" /></Link>{!user ? <Link href="/register" className="btn btn-secondary">创建演示账户</Link> : null}</div></div>
      <div className="welcome-account"><ShieldCheck size={25} aria-hidden="true" /><h2>当前访问身份</h2>{loading ? <div role="status"><div className="skeleton-line" aria-hidden="true" /><span className="sr-only">正在读取登录状态…</span></div> : error ? <div className="welcome-error" role="alert"><p>{error}</p><Button variant="secondary" onClick={() => setRetry((value) => value + 1)}>重试</Button></div> : user ? <><p className="welcome-user">{user.name}</p><p>{roleLabels[user.role]}</p><StatusLabel status={user.status} /></> : <><p className="welcome-user">访客</p><p>登录后可查看自己的账号资料与状态。</p></>}</div>
    </section>

    <section className="overview-scope" aria-labelledby="scope-heading"><div className="section-heading"><h2 id="scope-heading">本阶段可以体验什么</h2><p>仅交付账号与权限基础，不包含 AI 或业务模块。</p></div><dl className="feature-list"><div><dt>创建账户</dt><dd>选择设计师或实体店经营者身份，注册结果保存到 Demo 数据库，默认状态为待审核。</dd></div><div><dt>登录与退出</dt><dd>使用邮箱和密码登录。待审核、已驳回账号仍可查看自身状态；停用账号不能登录。</dd></div><div><dt>角色边界</dt><dd>四种角色各有独立代码；仅已通过状态的管理员可查看只读账号目录。</dd></div><div><dt>数据隔离</dt><dd>普通账号只能读取自己的资料；数据库和第三方配置均限于演示环境。</dd></div></dl></section>

    <Panel className="start-panel"><div><h2>第一次使用？</h2><p>登录页提供虚构测试账号。也可以创建一个新账户，验证「注册 → 登录 → 查看状态 → 退出」完整流程。</p></div><Link href="/login" className="text-link">查看演示账号<ArrowRight size={17} aria-hidden="true" /></Link></Panel>
    <NoticeBanner>请仅使用虚构姓名、演示邮箱和专用测试密码。当前不提供真实审批、邮件验证、AI 调用或生产数据迁移。</NoticeBanner>
  </div>;
}
