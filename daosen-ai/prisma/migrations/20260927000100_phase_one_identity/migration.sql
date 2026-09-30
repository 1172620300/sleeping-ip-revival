-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('DESIGNER', 'STORE_OWNER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatusCode" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "RoleCode" NOT NULL DEFAULT 'DESIGNER',
    "status" "AccountStatusCode" NOT NULL DEFAULT 'PENDING',
    "phone" VARCHAR(30),
    "purpose" VARCHAR(300),
    "reviewNote" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "User_email_normalized" CHECK ("email" = lower(btrim("email")))
);

-- CreateTable
CREATE TABLE "Role" (
    "code" "RoleCode" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "AccountStatus" (
    "code" "AccountStatusCode" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "AccountStatus_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_status_idx" ON "User"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_fkey" FOREIGN KEY ("role") REFERENCES "Role"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_status_fkey" FOREIGN KEY ("status") REFERENCES "AccountStatus"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reference data is schema-level and required for normal registration.
-- No demo users or credentials are created by migrations.
INSERT INTO "Role" ("code", "label", "description") VALUES
('DESIGNER', '设计师', 'Phase 1：登录后查看自己的账号状态。'),
('STORE_OWNER', '实体店经营者', 'Phase 1：登录后查看自己的账号状态。'),
('STAFF', '道森员工', '仅通过 Demo 初始化授予，Phase 1 不含业务管理权限。'),
('ADMIN', '管理员', '已通过账号可以只读查看 Demo 用户列表。');

INSERT INTO "AccountStatus" ("code", "label", "description") VALUES
('PENDING', '待审核', '允许登录查看自身状态，不允许进入受保护业务。'),
('APPROVED', '已通过', '允许访问角色授权的功能。'),
('REJECTED', '已驳回', '允许登录查看自身状态，不允许进入受保护业务。'),
('DISABLED', '已停用', '拒绝登录，已有会话在下次请求时失效。');
