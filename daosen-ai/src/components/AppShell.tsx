"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { ChevronRight, Home, LogOut, Menu, Users, UserRound, X } from "lucide-react";
import { getSession, type SafeUser } from "@/lib/client";
import { Button, NoticeBanner, roleLabels } from "./ui";

const nav = [
  { href: "/", label: "总览", icon: Home },
  { href: "/account", label: "我的账户", icon: UserRound },
];

export function Brand({ className = "" }: { className?: string }) {
  return <Link href="/" className={`brand-lockup ${className}`} aria-label="道森 AI，返回总览">
    <span className="brand-symbol" aria-hidden="true"><i /><i /><i /></span>
    <span><strong>道森<span>AI</span></strong><small>账号与权限演示</small></span>
  </Link>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  // The server-rendered menu must not accept clicks before React attaches handlers.
  useEffect(() => { setInteractive(true); }, []);

  useEffect(() => {
    if (isAuthRoute) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getSession(controller.signal)
      .then((result) => setUser(result.user))
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setUser(null);
        setError(reason instanceof Error ? reason.message : "无法读取登录状态，请重试。");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [isAuthRoute, pathname, retry]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function handleSignOut() {
    setSigningOut(true);
    setError("");
    try {
      const result = await signOut({ redirect: false, callbackUrl: "/" });
      if (!result?.url) throw new Error("退出未完成，请重试。");
      window.location.assign("/");
    } catch {
      setError("退出未完成，请检查连接后重试。");
      setSigningOut(false);
    }
  }

  if (isAuthRoute) return <><a href="#main-content" className="skip-link">跳到主要内容</a>{children}</>;

  const isAdmin = user?.role === "ADMIN" && user.status === "APPROVED";
  const title = pathname === "/account" ? "我的账户" : pathname === "/admin" ? "账号目录" : "总览";

  return <div className="app-frame">
    <a href="#main-content" className="skip-link">跳到主要内容</a>
    <aside className={`app-sidebar ${mobileOpen ? "mobile-open" : ""}`} onKeyDown={(event) => {
      if (event.key === "Escape" && mobileOpen) { setMobileOpen(false); menuButton.current?.focus(); }
    }}>
      <div className="sidebar-brand-row"><Brand /><button ref={menuButton} type="button" className="mobile-menu" disabled={!interactive} aria-label={mobileOpen ? "关闭导航" : "打开导航"} aria-expanded={mobileOpen} aria-controls="main-navigation" onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}</button></div>
      <nav id="main-navigation" className="sidebar-nav" aria-label="主导航">
        {nav.map((item) => <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`} aria-current={pathname === item.href ? "page" : undefined}><item.icon size={19} aria-hidden="true" /><span>{item.label}</span></Link>)}
        {isAdmin ? <Link href="/admin" className={`nav-item ${pathname === "/admin" ? "active" : ""}`} aria-current={pathname === "/admin" ? "page" : undefined}><Users size={19} aria-hidden="true" /><span>账号目录</span></Link> : null}
      </nav>
      <div className="sidebar-bottom">
        <div className="demo-note"><strong>仅限 Demo 环境</strong><p>不连接真实 AI 或第三方服务；请勿输入真实个人或商业数据。</p></div>
        {loading ? <div className="sidebar-user" role="status"><span className="avatar avatar-placeholder" aria-hidden="true" /><span>读取账户…</span></div> : error ? <p className="sidebar-status">登录状态暂不可用</p> : <Link href={user ? "/account" : "/login"} className="sidebar-user"><span className="avatar" aria-hidden="true">{user?.name.slice(0, 1) || "访"}</span><span><strong>{user?.name || "访客"}</strong><small>{user ? roleLabels[user.role] : "登录演示账号"}</small></span><ChevronRight size={16} aria-hidden="true" /></Link>}
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar"><span className="topbar-context">{title}</span><div className="topbar-actions"><span className="demo-label">Phase 1 · Demo</span>{loading ? <span className="topbar-account-loading" aria-hidden="true" /> : user ? <Button variant="ghost" onClick={handleSignOut} disabled={signingOut}><LogOut size={17} aria-hidden="true" />{signingOut ? "正在退出…" : "退出登录"}</Button> : <Link href="/login" className="btn btn-secondary">登录</Link>}</div></header>
      <main id="main-content" className="app-content" tabIndex={-1}>
        {error ? <div role="alert" className="shell-feedback"><NoticeBanner tone="warning"><p>{error}</p><Button variant="secondary" onClick={() => setRetry((value) => value + 1)}>重新读取登录状态</Button></NoticeBanner></div> : null}
        {children}
      </main>
    </div>
  </div>;
}
