# Phase 1 架构

## 范围与取舍

道森 AI 平台采用模块化单体。本阶段只交付身份与访问基础模块，整个应用作为一个 Next.js 服务部署，使用一个 PostgreSQL 数据库。没有微服务、消息队列、真实 AI 服务或外部账号依赖。

旧的 G0/G1 业务草稿被隔离在 `_future/`，不参与 TypeScript 检查、Next.js 路由构建及本阶段数据库。未来模块可以在用户确认范围后逐步接入，不提前开发完整 G2–G5。

## 分层

```text
浏览器：页面 / 表单 / 基础 Layout
        │
        ▼
Next.js：App Router 页面与 API
        │ 输入校验、认证、授权、安全返回字段
        ▼
账号模块：注册、登录、当前账号、只读管理员列表
        │
        ▼
Prisma：User / Role / AccountStatus
        │
        ▼
PostgreSQL
```

| 层 | 位置 | 责任 |
| --- | --- | --- |
| 页面与入口 | `src/app/` | 页面渲染、表单入口、HTTP 路由 |
| 通用 UI | `src/components/` | 导航、应用框架、表单和状态展示 |
| 账号模块 | `src/modules/identity/` | 输入规则、注册/登录服务、账号仓储、安全返回类型 |
| 认证与访问控制 | `src/server/auth.ts`、`src/server/rbac.ts` | NextAuth 配置、当前用户和 RBAC |
| 共享基础设施 | `src/server/db.ts`、`src/server/http.ts` | Prisma 实例、请求/错误边界 |
| 数据模型 | `prisma/` | schema、迁移、演示初始化 |

账号模块以 `index.ts` 为公开入口，服务层与仓储层分开，输入验证、限流和安全类型位于同一模块内。模块较小，不创建空的未来业务模块。未来业务服务依赖账号模块提供的当前用户与权限规则，不能让页面绕过模块直接信任浏览器角色。

## 认证流程

1. 注册入口校验姓名、邮箱、密码及可公开注册的角色。
2. 密码按 bcrypt 成本因子 12 哈希；只存哈希，不存明文。
3. 注册状态由服务端固定为 `PENDING`，客户端无法指定员工、管理员或已通过状态。
4. NextAuth Credentials 验证邮箱和密码，使用 JWT 会话，最大时长 8 小时。
5. 每次受保护访问根据会话中的账号 ID 重新读取数据库，检查账号存在、状态与角色。
6. 退出通过 NextAuth 注销当前浏览器会话；没有全设备会话管理界面。

`PENDING` / `REJECTED` 可登录查看本人资料和状态；`DISABLED` 不可登录。管理员列表要求 `ADMIN` 和 `APPROVED` 同时成立。

## 权限和隔离

- 普通账号只能读取由自己的会话标识定位的资料，不提供跨账号查询参数。
- 管理员只读账号列表是明确授权的例外，不包含密码哈希。
- 页面与 API 都实施服务端授权；菜单只负责表达能力，不承担安全防护。
- 查询返回值采用字段 allowlist，避免把完整数据库记录序列化给浏览器。
- Phase 1 不保存用户文件、作品、聊天或商业资料，因此不宣称已实现这些未来数据的隔离策略。
- 本阶段为单平台 Demo，不存在租户/组织模型；正式多租户规则需要单独设计和测试。

## 数据库与容器

数据库唯一目标为 PostgreSQL 16，Prisma 与 Prisma Client 固定为 6.19.3。Client 从 `prisma/schema.prisma` 生成，数据库变更以迁移文件追踪。

无 Docker 时，可通过 `pnpm db:local` 在本机前台运行 PostgreSQL 16.14，监听 `127.0.0.1:55432`，创建 `daosen` / `daosen_test`。数据保存在项目 `.local/postgres/`，停止进程不删数据，不创建操作系统服务或账号。Windows 中文安装路径下，原生运行文件缓存在系统临时目录，数据不迁出项目。这个辅助脚本不承担生产服务管理职责，Linux 优先使用 Docker。

Docker Compose 的职责分为数据库、迁移初始化、应用与显式 Seed。PostgreSQL 健康检查通过后再迁移；迁移完成后启动应用。运行 `docker compose run --rm seed` 才创建演示账号，避免把重置 Demo 数据作为每次应用重启的副作用。

本地原生构建通过 `pnpm build` / `pnpm start` 运行；Docker 构建显式设置 `BUILD_STANDALONE=true`，使用 standalone 产物。本次 Docker 运行验证已按用户要求暂缓，配置存在不等于容器验收通过。

`.env.example` 只提供本地开发占位值。`NEXTAUTH_SECRET` 必须随机生成，数据库账号密码仅供本机演示。不要把该 Compose 配置当作生产部署方案。

## 验证边界

- 单元测试验证输入约束与角色/状态规则；接口集成测试使用 Mock 仓储验证请求、认证和返回契约。
- Prisma schema 校验与 Client 生成验证模型配置。
- TypeScript 检查及 Next.js 构建验证应用可编译。
- 真实 PostgreSQL 验证迁移、Seed、约束与查询。
- 浏览器测试连接隔离的本地 `_test` PostgreSQL 数据库，在独立的 3100 端口验证注册、登录、退出、状态反馈与越权拒绝。

各项检查彼此不能替代；未执行的检查必须单独标注。生产级限流、审计、邮件验证、找回密码、备份与容灾不是本阶段验收项，记录在 `TODO.md`。

## 旧源码参考

用户补充的 `ds-dawsen-ai-main (1).zip` 为 Vite / Supabase 旧项目。旧代码、数据库脚本及品牌线索仅用于理解上下文，不能覆盖用户当前指定的技术栈和 Phase 1 范围。本阶段没有导入旧系统数据、账号、会话、真实第三方密钥或生产配置。
