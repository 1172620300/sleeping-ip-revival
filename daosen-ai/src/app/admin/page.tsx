import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { UserDirectory } from "@/components/UserDirectory";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" || user.status !== "APPROVED") redirect("/account");

  return <div><PageHeader title="账号目录" description="仅已通过状态的管理员可读取 Demo 账号列表。此页只读，不提供审核、角色编辑或真实用户管理。" /><UserDirectory /></div>;
}
