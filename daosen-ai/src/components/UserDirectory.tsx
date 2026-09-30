"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getUsers, type SafeUser } from "@/lib/client";
import { Button, PageSkeleton, StatusLabel, roleLabels } from "./ui";

export function UserDirectory() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setUsers([]);
    getUsers(controller.signal).then((result) => setUsers(result.users)).catch((reason) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "无法读取账号目录，请重试。");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  return <section className="directory" aria-label="Demo 账号列表"><div className="directory-toolbar"><p>{loading ? "正在读取账号目录…" : error ? "账号目录暂不可用" : `当前显示 ${users.length} 个演示账号`}</p><Button variant="secondary" disabled={loading} onClick={() => setReload((value) => value + 1)}><RefreshCw size={17} aria-hidden="true" />刷新列表</Button></div>
    {loading ? <PageSkeleton label="正在读取账号目录…" /> : error ? <div ref={errorRef} className="form-error" role="alert" tabIndex={-1}><strong>未能读取账号目录</strong><p>{error}</p><p>权限已变化时，请重新登录；服务暂不可用时，可重试刷新。</p><div className="page-actions"><Link href="/account" className="text-link">返回我的账户</Link><Link href="/login" className="text-link">重新登录</Link></div></div> : users.length ? <div className="directory-table-wrap"><table className="directory-table"><caption className="sr-only">演示账号的姓名、邮箱、角色和状态</caption><thead><tr><th scope="col">账户</th><th scope="col">角色</th><th scope="col">状态</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><span className="directory-email">{user.email}</span></td><td>{roleLabels[user.role]}<span className="table-code">{user.role}</span></td><td><StatusLabel status={user.status} /></td></tr>)}</tbody></table></div> : <div className="empty-state"><h2>暂时没有演示账号</h2><p>请确认 Demo 数据库已完成 Seed 初始化，再刷新列表。</p></div>}
  </section>;
}
