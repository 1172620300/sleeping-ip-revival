"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, UserPlus } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Brand } from "@/components/AppShell";
import { Button, Field } from "@/components/ui";
import { api } from "@/lib/client";

const initialForm = { name: "", email: "", password: "", role: "DESIGNER", phone: "", purpose: "" };
type FormKey = keyof typeof initialForm;

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [createdEmail, setCreatedEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormKey, string>>>({});
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error || Object.keys(fieldErrors).length) errorRef.current?.focus(); }, [error, fieldErrors]);
  useEffect(() => { if (createdEmail) successRef.current?.focus(); }, [createdEmail]);

  function update(key: FormKey, value: string) { setForm((old) => ({ ...old, [key]: value })); }
  function describedBy(key: FormKey) {
    return [key === "password" ? "password-hint" : "", fieldErrors[key] ? `${key}-error` : ""].filter(Boolean).join(" ") || undefined;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const errors: Partial<Record<FormKey, string>> = {};
    if (form.name.trim().length < 2 || form.name.trim().length > 60) errors.name = "请输入 2–60 个字符的演示姓名。";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || form.email.trim().length > 254) errors.email = "请输入有效的演示邮箱。";
    if (form.password.length < 12) errors.password = "密码至少需要 12 个字符。";
    if (new TextEncoder().encode(form.password).length > 72) errors.password = "密码不能超过 72 个 UTF-8 字节；请缩短密码。";
    if (form.role !== "DESIGNER" && form.role !== "STORE_OWNER") errors.role = "请选择可公开注册的身份。";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setLoading(true);
    try {
      await api("/api/platform/register", { method: "POST", body: JSON.stringify({ ...form, name: form.name.trim(), email: form.email.trim() }) });
      setCreatedEmail(form.email.trim());
      setForm(initialForm);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "注册未完成，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return <div className="auth-page">
    <aside className="auth-aside"><Brand /><div className="auth-message"><h2>创建一个<br />专属演示账户。</h2><p>选择身份，完成注册，再登录查看属于你的账号资料。</p><ul><li>默认状态为待审核 PENDING</li><li>仅开放设计师与实体店经营者注册</li><li>员工与管理员由 Demo Seed 初始化</li></ul></div><p className="auth-foot">姓名、邮箱与选填资料均请使用虚构数据</p></aside>
    <main id="main-content" className="auth-form-wrap" tabIndex={-1}><div className="auth-form"><h1>创建演示账户</h1><p className="auth-form-intro">资料保存在本项目的 Demo 数据库，不会发送给第三方服务。</p>
    {createdEmail ? <div className="registration-success" role="status" ref={successRef} tabIndex={-1}><CheckCircle2 size={30} aria-hidden="true" /><h2>账户已创建</h2><p><strong>{createdEmail}</strong></p><p>当前状态为「待审核」。你现在可以登录，查看自己的账户。本阶段没有真实审批流程，也未开放业务功能。</p><Link href="/login" className="btn btn-primary">前往登录<ArrowRight size={17} aria-hidden="true" /></Link></div> : <form onSubmit={submit} noValidate aria-busy={loading}>
      {error || Object.keys(fieldErrors).length ? <div className="form-error" ref={errorRef} role="alert" tabIndex={-1}><strong>请检查注册信息</strong>{error ? <p>{error}</p> : null}{Object.entries(fieldErrors).length ? <ul>{Object.entries(fieldErrors).map(([key, message]) => <li key={key}><a href={`#${key}`}>{message}</a></li>)}</ul> : null}</div> : null}
      <div className="auth-form-fields"><Field label="演示姓名" htmlFor="name" required error={fieldErrors.name}><input id="name" name="name" className="text-input" value={form.name} onChange={(event) => update("name", event.target.value)} required minLength={2} maxLength={60} autoComplete="off" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={describedBy("name")} disabled={loading} /></Field>
      <Field label="演示邮箱" htmlFor="email" required error={fieldErrors.email}><input id="email" name="email" className="text-input" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required maxLength={254} autoComplete="username" spellCheck={false} autoCapitalize="none" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={describedBy("email")} disabled={loading} /></Field>
      <Field label="身份" htmlFor="role" required error={fieldErrors.role}><select id="role" name="role" className="text-input" value={form.role} onChange={(event) => update("role", event.target.value)} aria-invalid={Boolean(fieldErrors.role)} aria-describedby={describedBy("role")} disabled={loading}><option value="DESIGNER">设计师</option><option value="STORE_OWNER">实体店经营者</option></select></Field>
      <Field label="演示密码" htmlFor="password" hint="至少 12 个字符，最多 72 个 UTF-8 字节（一个汉字通常为 3 字节）。请勿使用常用密码。" required error={fieldErrors.password}><input id="password" name="password" className="text-input" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} required minLength={12} maxLength={72} autoComplete="new-password" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={describedBy("password")} disabled={loading} /></Field>
      <details className="optional-fields"><summary>补充演示资料（选填）</summary><p>以下字段仅用于结构演示，请勿填写真实联系方式或商业信息。</p><Field label="演示联系方式" htmlFor="phone"><input id="phone" name="phone" className="text-input" value={form.phone} onChange={(event) => update("phone", event.target.value)} maxLength={30} autoComplete="off" disabled={loading} /></Field><Field label="演示用途" htmlFor="purpose"><textarea id="purpose" name="purpose" className="text-input text-area" value={form.purpose} onChange={(event) => update("purpose", event.target.value)} maxLength={300} rows={3} disabled={loading} /></Field></details>
      <Button type="submit" disabled={loading} className="auth-form-submit"><UserPlus size={18} aria-hidden="true" />{loading ? "正在创建…" : "创建账户"}</Button></div>
    </form>}
    <p className="auth-switch">已有账号？<Link href="/login">返回登录<ArrowRight size={15} aria-hidden="true" /></Link></p><p className="auth-legal">本环境没有邮箱验证或密码找回。请记住专用测试密码，不要输入真实用户数据。</p></div></main>
  </div>;
}
