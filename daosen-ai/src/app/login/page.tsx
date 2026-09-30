"use client";

import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { signIn } from "next-auth/react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Brand } from "@/components/AppShell";
import { Button, Field } from "@/components/ui";

const demoAccounts = [
  ["designer@demo.daosen.ai", "设计师 · 已通过"],
  ["store@demo.daosen.ai", "实体店经营者 · 已通过"],
  ["staff@demo.daosen.ai", "道森员工 · 已通过"],
  ["admin@demo.daosen.ai", "管理员 · 已通过"],
  ["pending@demo.daosen.ai", "设计师 · 待审核"],
  ["rejected@demo.daosen.ai", "设计师 · 已驳回"],
  ["disabled@demo.daosen.ai", "设计师 · 已停用（验证登录拦截）"],
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoEmail, setDemoEmail] = useState(demoAccounts[0][0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", { email: email.trim(), password, redirect: false, callbackUrl: "/account" });
      if (!result?.ok || result.error) {
        setError("登录未成功。请确认邮箱、密码及账号状态；多次失败后请稍后重试。");
        return;
      }
      window.location.assign("/account");
    } catch {
      setError("无法连接登录服务，请检查网络后重试。");
    } finally {
      setLoading(false);
    }
  }

  return <div className="auth-page">
    <aside className="auth-aside"><Brand /><div className="auth-message"><h2>账户清晰，<br />权限有界。</h2><p>道森 AI 平台的第一步：验证登录、账户状态与角色边界。</p><ul><li>当前仅为 Phase 1 Demo</li><li>普通账户仅查看自身资料</li><li>第三方服务未连接</li></ul></div><p className="auth-foot">只使用虚构资料与演示专用密码</p></aside>
    <main id="main-content" className="auth-form-wrap" tabIndex={-1}><div className="auth-form"><h1>登录道森 AI</h1><p className="auth-form-intro">进入你的演示账户，查看角色和账号状态。</p><form onSubmit={submit} aria-busy={loading}>
      {error ? <div className="form-error" ref={errorRef} role="alert" tabIndex={-1}><strong>登录未完成</strong><p>{error}</p></div> : null}
      <div className="auth-form-fields"><Field label="邮箱" htmlFor="email" required><input id="email" name="email" className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="username" spellCheck={false} autoCapitalize="none" disabled={loading} /></Field><Field label="密码" htmlFor="password" required><input id="password" name="password" className="text-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" disabled={loading} /></Field><Button type="submit" disabled={loading} className="auth-form-submit"><KeyRound size={18} aria-hidden="true" />{loading ? "正在验证…" : "登录"}</Button></div>
    </form><p className="auth-switch">还没有账号？<Link href="/register">创建演示账户<ArrowRight size={15} aria-hidden="true" /></Link></p>
    <details className="demo-accounts"><summary>使用演示测试账号</summary><p>以下均为数据库 Seed 中的虚构账户，通用密码为 <code>Daosen@2026!</code>。填入后由你点击登录。</p><Field label="演示身份" htmlFor="demo-account"><select id="demo-account" className="text-input" value={demoEmail} onChange={(event) => setDemoEmail(event.target.value)} disabled={loading}>{demoAccounts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Button variant="secondary" disabled={loading} onClick={() => { setEmail(demoEmail); setPassword("Daosen@2026!"); setError(""); }}>填入演示账号</Button></details>
    <p className="auth-legal">待审核和已驳回账号可以登录查看自身状态。停用账号不能登录。本阶段不包含真实审批或密码找回。</p></div></main>
  </div>;
}
