import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { currentUser } from "@/server/auth";
import { NoticeBanner, PageHeader, Panel, StatusLabel, roleLabels } from "@/components/ui";

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  APPROVED: "账号状态为已通过。当前可查看自己的资料；已通过的管理员还可访问只读账号目录。",
  PENDING: "账号处于待审核状态。你可以登录、查看自己的账户并退出；本阶段没有真实审批流程。",
  REJECTED: "账号处于已驳回状态。你仍可查看自己的资料与状态；本阶段没有重新提交审批功能。",
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return <div>
    <PageHeader title="我的账户" description="这里只显示当前登录账户的资料。角色与状态由服务端读取，你无法在前端修改权限。" />
    <Panel className="account-panel"><div className="account-summary"><span className="account-avatar" aria-hidden="true">{user.name.slice(0, 1)}</span><div><h2>{user.name}</h2><p>{user.email}</p><div className="account-summary-meta"><span className="role-chip">{roleLabels[user.role]}</span><StatusLabel status={user.status} /></div></div></div><dl className="account-details"><div><dt>用户 ID</dt><dd><code>{user.id}</code></dd></div><div><dt>角色代码</dt><dd><code>{user.role}</code></dd></div><div><dt>状态代码</dt><dd><code>{user.status}</code></dd></div>{user.reviewNote ? <div><dt>状态备注</dt><dd>{user.reviewNote}</dd></div> : null}</dl></Panel>
    <div className="account-status-note"><NoticeBanner tone={user.status === "APPROVED" ? "success" : "warning"}>{statusMessages[user.status] || "当前账号不可用于访问受保护内容。"}</NoticeBanner></div>
    <section aria-labelledby="permissions-heading"><div className="section-heading"><h2 id="permissions-heading">Phase 1 权限边界</h2><p>这些是当前可验证的权限，不代表后续业务功能已实现。</p></div><div className="permission-table-wrap"><table className="permission-table"><caption className="sr-only">四种角色的演示权限</caption><thead><tr><th scope="col">角色</th><th scope="col">自己的账户</th><th scope="col">全部账号目录</th><th scope="col">公开注册</th></tr></thead><tbody>{[["DESIGNER", "可查看", "不可查看", "支持"], ["STORE_OWNER", "可查看", "不可查看", "支持"], ["STAFF", "可查看", "不可查看", "仅 Seed"], ["ADMIN", "可查看", "已通过时可查看", "仅 Seed"]].map(([role, own, all, registration]) => <tr key={role}><th scope="row">{roleLabels[role]}<span className="table-code">{role}</span></th><td>{own}</td><td>{all}</td><td>{registration}</td></tr>)}</tbody></table></div><p className="table-note">停用账号不能登录；待审核与已驳回账号只可读取自身信息。账号目录仅为只读演示，不提供状态或角色修改。</p></section>
    {user.role === "ADMIN" && user.status === "APPROVED" ? <div className="account-admin-link"><Link href="/admin" className="btn btn-secondary">查看账号目录<ArrowRight size={17} aria-hidden="true" /></Link></div> : null}
  </div>;
}
