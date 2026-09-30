import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check, CircleAlert } from "lucide-react";

export function Button({
  children, variant = "primary", className = "", type = "button", ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <button type={type} className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-header">
    <div><h1>{title}</h1>{description ? <p className="page-description">{description}</p> : null}</div>
    {actions ? <div className="page-actions">{actions}</div> : null}
  </header>;
}

const statusLabels: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "待审核", tone: "warning" },
  APPROVED: { label: "已通过", tone: "success" },
  REJECTED: { label: "已驳回", tone: "danger" },
  DISABLED: { label: "已停用", tone: "neutral" },
};

export const roleLabels: Record<string, string> = {
  DESIGNER: "设计师", STORE_OWNER: "实体店经营者", STAFF: "道森员工", ADMIN: "管理员",
};

export function StatusLabel({ status }: { status: string }) {
  const { label, tone } = statusLabels[status] ?? { label: status, tone: "neutral" };
  return <span className={`status-pill status-${tone}`}><span className="status-dot" aria-hidden="true" />{label}</span>;
}

export function NoticeBanner({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "success" }) {
  return <div className={`notice-banner notice-${tone}`}>
    {tone === "success" ? <Check size={18} aria-hidden="true" /> : <CircleAlert size={18} aria-hidden="true" />}
    <div>{children}</div>
  </div>;
}

export function Field({ label, htmlFor, hint, error, children, required = false }: {
  label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode; required?: boolean;
}) {
  return <div className="field">
    <label className="field-label" htmlFor={htmlFor}>{label}{required ? <span className="field-required">（必填）</span> : null}</label>
    {children}
    {hint ? <p className="field-hint" id={`${htmlFor}-hint`}>{hint}</p> : null}
    {error ? <p className="field-error" id={`${htmlFor}-error`}>{error}</p> : null}
  </div>;
}

export function PageSkeleton({ label = "正在读取账户信息…" }: { label?: string }) {
  return <div className="page-skeleton" role="status" aria-live="polite">
    <span className="sr-only">{label}</span>
    <div className="skeleton-line skeleton-heading" aria-hidden="true" />
    <div className="skeleton-line" aria-hidden="true" />
    <div className="skeleton-block" aria-hidden="true" />
  </div>;
}
