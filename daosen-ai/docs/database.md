# Phase 1 数据库

## 数据库目标

PostgreSQL 16，Prisma ORM / Client 6.19.3。权威模型位于 `prisma/schema.prisma`，迁移位于 `prisma/migrations/`。

Docker 默认映射本机端口 5432。项目内开发辅助实例通过 `pnpm db:local` 启动真实 PostgreSQL 16.14，端口为 `127.0.0.1:55432`：演示数据库为 `daosen`，隔离测试数据库为 `daosen_test`。二者属于同一仅本地开发实例，不能代替正式环境权限隔离。数据库持久文件保存在项目 `.local/postgres/`，退出后保留。

Phase 1 仅使用 `User`、`Role`、`AccountStatus` 三个业务模型，以及 PostgreSQL 枚举 `RoleCode`、`AccountStatusCode`。NextAuth 使用 JWT 会话，因此没有数据库 Session、OAuth Account 或 VerificationToken 表。

## 实体关系

```text
Role.code ──────────< User.role
AccountStatus.code ─< User.status
```

每个用户必须恰好对应一个角色和一个账号状态。外键为必填，不能只存显示用字符串而与字典记录脱节。

## User

| 字段 | 含义与约束 |
| --- | --- |
| `id` | 用户主键，默认 `cuid()`，用于服务端会话定位 |
| `email` | 唯一邮箱，最大 254 字符；注册/登录规范化，迁移约束强制去除两端空白和小写 |
| `name` | 演示显示姓名，最大 60 字符 |
| `passwordHash` | 必填 bcrypt 密码哈希，不通过 API 返回 |
| `role` | `RoleCode`，外键引用 `Role.code`，数据库默认 `DESIGNER` |
| `status` | `AccountStatusCode`，外键引用 `AccountStatus.code`，新注册固定 `PENDING` |
| `phone` | 可选联系电话，最大 30 字符；仅输入虚构 Demo 值 |
| `purpose` | 可选注册用途，最大 300 字符 |
| `reviewNote` | 可选状态说明，最大 300 字符；Phase 1 无审核修改入口 |
| `createdAt` | 创建时间 |
| `updatedAt` | 最后更新时间 |

完整字段和默认值以 schema 为准。角色/状态同时由数据库约束和服务端规则保护；数据库约束不能代替注册时的公开角色 allowlist。

## Role

角色字典包含 `code`（`RoleCode` 主键）、`label`（中文名称）、`description`（说明），供用户关系与显示使用。

| `RoleCode` | 中文含义 | Phase 1 创建途径 |
| --- | --- | --- |
| `DESIGNER` | 设计师 | 公开注册或 Demo Seed |
| `STORE_OWNER` | 实体店经营者 | 公开注册或 Demo Seed |
| `STAFF` | 道森员工 | Demo Seed |
| `ADMIN` | 管理员 | Demo Seed |

单账号单角色是本阶段开发默认值，不是已经确认的生产组织权限规则。员工不会因为角色名称自动获得管理员账号列表权限。

## AccountStatus

状态字典包含 `code`（`AccountStatusCode` 主键）、`label`（中文名称）、`description`（说明）。

| `AccountStatusCode` | 中文含义 | Phase 1 行为 |
| --- | --- | --- |
| `PENDING` | 待审核 | 可登录，只能访问本人账号资料 |
| `APPROVED` | 已通过 | 可登录，按角色授权 |
| `REJECTED` | 已驳回 | 可登录，只能访问本人账号资料 |
| `DISABLED` | 已停用 | 禁止登录与受保护访问 |

注册只创建 `PENDING`。本阶段没有状态修改 API、审批页面或自动审核任务，Seed 中的状态用于测试。真实审核标准、驳回后重提、禁用/恢复规则均待确认。

## 初始化与迁移

准备空的本地 Demo 数据库并配置 `.env` 后：

```text
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

`db:migrate` 对应 `prisma migrate deploy`，只执行仓库中已有迁移。开发者修改模型时，需要在自己的隔离开发数据库中创建迁移，检查 SQL，再提交 schema 和迁移；不对未知数据库运行 `migrate reset` 或清库操作。

`pnpm setup` 将生成 Client、执行迁移和 Seed 串联，用于本地 Demo 首次初始化。

## 隔离测试数据库

Playwright 测试默认使用 `127.0.0.1:55432/daosen_test`，可通过 `E2E_DATABASE_URL` 指定另一个本地 `_test` 数据库。不从开发 `.env` 复用业务数据库连接。运行前要求 `E2E_ALLOW_DB_WRITE=true`，脚本还验证本地主机名、数据库后缀和 `public` schema；验证不通过时，在任何迁移或写入前停止。

测试全局初始化脚本为 `scripts/test-setup.cjs`，执行 `migrate deploy` 和 Demo Seed，不执行 reset / truncate。测试创建的临时账号按本轮记录的准确 ID 与邮箱清理，不使用宽泛条件清除已有数据。测试服务器使用 3100 端口，页面与 API 都使用该隔离数据库。接口单元/集成测试采用 Mock 仓储，不算数据库连接验证。

## 种子数据

初始迁移会建立四个角色和四个状态，因此仅完成迁移即可注册新账号，无需先创建公开测试账号。Seed 会重复确保这些字典存在，并创建七个虚构账号。演示密码统一为 `Daosen@2026!`，入库前使用 bcrypt 成本因子 12 哈希。

账号邮箱：

```text
designer@demo.daosen.ai
store@demo.daosen.ai
staff@demo.daosen.ai
admin@demo.daosen.ai
pending@demo.daosen.ai
rejected@demo.daosen.ai
disabled@demo.daosen.ai
```

Seed 要求显式设置 `ALLOW_DEMO_SEED=true`。它按邮箱执行 upsert，已有邮箱的用户使用空更新，不重置已有密码、角色、状态或其他用户资料；重复执行不会增加同邮箱用户。字典名称和说明可以被同步更新。

不要导入真实用户记录，也不要在生产环境执行种子脚本。Seed 不是重置密码工具；如本地需要重置账号，先确认该库仅包含可丢弃的演示数据，再执行明确授权的操作。

## 数据边界

- 本阶段只存账号数据，不保存真实文件、AI 对话、订单或商业资料。
- 普通资料读取以当前会话 ID 为条件；不会通过任意用户 ID 返回其他账号。
- 仅已通过的管理员可以读取有限的账号列表字段。
- API 不返回明文密码或 `passwordHash`。
- 旧 Supabase 数据库不直接复制进新 PostgreSQL；任何后续迁移都需要独立映射、授权确认和验证。
- Docker 数据卷用于本地持久化，不构成备份或生产容灾方案。
