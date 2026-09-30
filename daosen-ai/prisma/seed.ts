import "dotenv/config";
import { PrismaClient, RoleCode, AccountStatusCode } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();
const DEMO_PASSWORD = "Daosen@2026!";

async function main() {
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Demo seed is disabled. Set ALLOW_DEMO_SEED=true only for this isolated Demo database.");
  }

  const roles = [
    { code: RoleCode.DESIGNER, label: "设计师", description: "Phase 1：登录后查看自己的账号状态。" },
    { code: RoleCode.STORE_OWNER, label: "实体店经营者", description: "Phase 1：登录后查看自己的账号状态。" },
    { code: RoleCode.STAFF, label: "道森员工", description: "仅通过 Demo 初始化授予，Phase 1 不含业务管理权限。" },
    { code: RoleCode.ADMIN, label: "管理员", description: "已通过账号可以只读查看 Demo 用户列表。" },
  ];
  const statuses = [
    { code: AccountStatusCode.PENDING, label: "待审核", description: "允许登录查看自身状态，不允许进入受保护业务。" },
    { code: AccountStatusCode.APPROVED, label: "已通过", description: "允许访问角色授权的功能。" },
    { code: AccountStatusCode.REJECTED, label: "已驳回", description: "允许登录查看自身状态，不允许进入受保护业务。" },
    { code: AccountStatusCode.DISABLED, label: "已停用", description: "拒绝登录，已有会话在下次请求时失效。" },
  ];
  const users = [
    { email: "designer@demo.daosen.ai", name: "林设计师", role: RoleCode.DESIGNER, status: AccountStatusCode.APPROVED },
    { email: "store@demo.daosen.ai", name: "道森店主", role: RoleCode.STORE_OWNER, status: AccountStatusCode.APPROVED },
    { email: "staff@demo.daosen.ai", name: "道森专员", role: RoleCode.STAFF, status: AccountStatusCode.APPROVED },
    { email: "admin@demo.daosen.ai", name: "平台管理员", role: RoleCode.ADMIN, status: AccountStatusCode.APPROVED },
    { email: "pending@demo.daosen.ai", name: "待审核用户", role: RoleCode.DESIGNER, status: AccountStatusCode.PENDING, reviewNote: "演示待审核状态；本阶段尚未开放审核操作。" },
    { email: "rejected@demo.daosen.ai", name: "未通过用户", role: RoleCode.DESIGNER, status: AccountStatusCode.REJECTED, reviewNote: "演示未通过状态，不代表真实商业规则。" },
    { email: "disabled@demo.daosen.ai", name: "已停用用户", role: RoleCode.DESIGNER, status: AccountStatusCode.DISABLED, reviewNote: "演示账号停用与会话失效。" },
  ];

  const passwordHash = await hash(DEMO_PASSWORD, 12);
  await db.$transaction(async (tx) => {
    for (const role of roles) await tx.role.upsert({ where: { code: role.code }, update: role, create: role });
    for (const status of statuses) await tx.accountStatus.upsert({ where: { code: status.code }, update: status, create: status });
    for (const user of users) {
      // Reruns do not reset existing users' passwords, status, role, or profile.
      await tx.user.upsert({ where: { email: user.email }, update: {}, create: { ...user, passwordHash } });
    }
  });
  console.log(`Demo seed complete: ${roles.length} roles, ${statuses.length} statuses, ${users.length} demo account definitions. See README for local demo credentials.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Demo seed failed");
  process.exitCode = 1;
}).finally(async () => { await db.$disconnect(); });
