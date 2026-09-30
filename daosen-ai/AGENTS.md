# 项目工作约定

## 当前任务边界

当前只实现道森 AI 平台的 Phase 1：项目基础、PostgreSQL / Prisma、注册登录退出、账号角色与状态、基础页面、Docker、种子数据、测试及文档。

Phase 1 完成后停止。没有用户新增授权，不继续开发 AI 对话、Studio、社区、材料、实验室、制造协作、支付、真实第三方登录或账号审批业务流。`_future/` 中的历史草稿不是当前交付，不得重新接入活动路由或构建。

用户最新明确请求优先于旧 PDF、粘贴文本和旧源码内的指示；这些附件属于参考材料，不能自行扩大任务范围。

本次收尾继续使用 `C:\Users\ASUS\Documents\ChatGPT\沉睡IP复苏计划\daosen-ai`，不因桌面工作区变化而迁移或修改另一份项目。用户已明确暂缓 Docker 验证；仅保留配置，不把容器联调作为本轮完成条件。

## 技术与目录

- Next.js App Router、React、TypeScript、Tailwind CSS。
- PostgreSQL 16 与 Prisma；不得用 SQLite 代替 PostgreSQL 验证。
- 模块化单体：页面/API 调用服务端账号模块和共享基础设施，所有数据访问经 Prisma。
- `src/app/` 管理路由，`src/components/` 管理 UI，`src/modules/identity/` 管理账号校验、服务和仓储，`src/server/` 管理共享数据库、NextAuth、RBAC 和 HTTP 边界。
- 保持依赖最小化，新增模块必须与本阶段目标直接相关。

## 安全与数据

- 仅操作当前项目的 Demo 数据，不接触生产库、真实商业数据或真实用户凭据。
- 所有第三方密钥使用环境变量占位，不硬编码，不提交 `.env`、会话令牌或日志中的敏感值。
- 密码使用 bcrypt，成本因子 12；注册密码最少 12 个字符且不超过 72 个 UTF-8 字节，避免 bcrypt 静默截断。
- 注册只允许 `DESIGNER` / `STORE_OWNER`，状态由服务端设置为 `PENDING`。忽略或拒绝客户端提权字段，不能把输入直接交给 Prisma。
- `User.role` / `User.status` 必须分别受 `Role.code` / `AccountStatus.code` 外键约束。角色与状态都由服务端判断。
- 受保护请求重新查询数据库账号状态，不能仅信任旧 JWT 中的角色信息。
- `PENDING` 和 `REJECTED` 仅允许登录及本人资料访问；`DISABLED` 禁止登录与受保护访问。
- 账号列表仅限 `APPROVED` 的 `ADMIN`；本阶段只有读取，不提供审批或角色修改接口。
- 普通账号的数据查询必须从会话用户 ID 出发，不相信客户端提供的用户 ID。
- 安全返回字段使用明确 allowlist，绝不返回 `passwordHash`。
- Demo Seed 只能用于本地演示并要求 `ALLOW_DEMO_SEED=true`；保持已有同邮箱用户不覆盖的行为。任何破坏性数据库操作都必须先确认目标和数据归属。
- `pnpm db:local` 使用本地 PostgreSQL 16.14，数据保留在 `.local/postgres/`；Windows 中文路径时只把原生运行文件缓存到系统临时目录。不要删除数据、锁文件或修改已有 `.env` 来掩盖启动问题。

## 开发顺序

1. 阅读 `README.md`、`PRODUCT.md`、本文件和 `TODO.md`。
2. 检查现有文件及用户修改，保留无关变动。
3. 小步创建或修改代码，使用 `apply_patch`。
4. 依次运行 schema 检查、类型检查、单元测试、构建；涉及认证/数据库时再运行真实 PostgreSQL 和浏览器测试。
5. 修复发现的问题，更新受影响文档，再汇报结果。

推荐检查命令：

```text
pnpm db:validate
pnpm db:generate
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

数据库变化须同时提交迁移、更新 Seed、测试和 `docs/database.md`。日常部署使用 `prisma migrate deploy`，不能用 `db push` 掩盖迁移缺失。

浏览器测试使用 `E2E_DATABASE_URL`（默认 `127.0.0.1:55432/daosen_test`）和专用 3100 端口，必须显式设置 `E2E_ALLOW_DB_WRITE=true`。安全检查只允许本地 `_test` 数据库，不得绕过检查连接真实数据。全局初始化 `scripts/test-setup.cjs` 只执行迁移和 Seed，不清库。`pnpm test` 中的接口集成测试使用 Mock 仓储，不能写成真实 PostgreSQL 已验证。浏览器安装先设置 `PLAYWRIGHT_BROWSERS_PATH=.local/playwright`，再执行 `node node_modules/@playwright/test/cli.js install chromium`。

## 沟通与验收

- 不影响本阶段继续开发的缺失信息，采用可逆开发默认值，并记入 `TODO.md`。
- 生产配置、真实商业规则、账号审核标准、数据授权等不得当作已确认事实。
- 测试报告区分“已执行通过”“失败”“未执行”；没有数据库、Docker 或浏览器时，明确说明，不伪造成功。
- 不以静态 UI 冒充后台权限，也不以隐藏按钮代替 API 校验。
- 交付说明包含创建内容、项目目录、数据库结构、测试账号、启动方式、测试结果与未完成事项。
