# 道森 AI 平台 · Phase 1 Demo

本仓库当前只交付 G0/G1 项目的 **Phase 1：项目基础、账号与权限**，不代表完整 G0/G1 业务功能已完成。技术栈为 Next.js App Router、TypeScript、Tailwind CSS、PostgreSQL、Prisma，采用模块化单体架构。

仅用于本地软件开发和产品演示。所有测试账号均为虚构账号；不要输入真实商业数据，不要复用演示密码，不要连接生产数据库。

## 本阶段内容

- 项目结构、中文基础布局、响应式导航。
- PostgreSQL 数据库及 Prisma 模型、迁移与初始化数据。
- 邮箱注册、密码登录、退出登录，8 小时 JWT 会话。
- `DESIGNER`、`STORE_OWNER`、`STAFF`、`ADMIN` 四种角色。
- `PENDING`、`APPROVED`、`REJECTED`、`DISABLED` 四种账号状态。
- 个人账号页与管理员只读账号列表，服务端权限检查。
- Docker 配置、环境变量样例、自动化测试和开发文档。

本阶段不实现账号审核操作、AI 对话、设计工作台、作品社区、材料/检测服务、支付、真实邮件或第三方账号接入。历史业务草稿位于 `_future/`（如存在），不参与本阶段构建，也不是交付功能。

2026-09-27 本地 Phase 1 收尾完成：移动端菜单加载时序问题已修复，65 项单元/接口测试、19 项浏览器测试、Prisma 校验及生成、类型检查和原生构建均通过；桌面与手机共 10 个页面检查通过。当前使用真实本地 PostgreSQL。远程数据库接入及 Docker 验证按本轮要求暂缓，详细状态见 [验收记录](docs/phase-1-acceptance.md)。

## 项目位置

本次 Phase 1 代码位于 `C:\Users\ASUS\Documents\ChatGPT\沉睡IP复苏计划\daosen-ai`。继续在此目录操作；本次收尾没有迁移项目或修改桌面 `C:\Users\ASUS\Desktop\道森` 下的另一份项目。

## 快速启动：无需 Docker

需要 Node.js 22.12+ 和 pnpm 11.19.0。当前工作区已安装依赖、配置 `.env` 并初始化本地数据库，**不要复制覆盖已有 `.env`**。用户已明确暂缓 Docker 验证，以下是真实 PostgreSQL 的本地启动方式，不依赖容器。

第一个 PowerShell 终端启动数据库；如果该项目的数据库已在运行，复用它，不要重复启动：

```powershell
Set-Location 'C:\Users\ASUS\Documents\ChatGPT\沉睡IP复苏计划\daosen-ai'
pnpm db:local
```

保持数据库终端运行，在第二个 PowerShell 终端执行：

```powershell
Set-Location 'C:\Users\ASUS\Documents\ChatGPT\沉睡IP复苏计划\daosen-ai'
pnpm setup
pnpm dev
```

打开 <http://localhost:3000>。`setup` 生成 Prisma Client、执行已提交迁移并创建演示账号；重复执行不覆盖同邮箱已有用户的密码、角色或状态。应用启动不自动执行 Seed。

### 新环境首次配置

新复制的项目先安装锁文件中的依赖，并且只在缺少 `.env` 时创建它：

```powershell
pnpm install --frozen-lockfile
if (-not (Test-Path -LiteralPath .env)) { Copy-Item .env.example .env }
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

把生成的随机值写入 `.env` 的 `NEXTAUTH_SECRET`。使用 `pnpm db:local` 时，确认以下本地配置；`ALLOW_DEMO_SEED` 仅用于允许创建虚构测试账号：

```dotenv
DATABASE_URL="postgresql://daosen:daosen_local_change_me@127.0.0.1:55432/daosen?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="替换为刚生成的随机本地会话密钥"
ALLOW_DEMO_SEED="true"
```

再按上面的双终端步骤启动。如果已有自行管理的本地 PostgreSQL 16，可以使用其本地 Demo 数据库连接，跳过 `db:local`；不要改成 SQLite，不对未知数据库执行 Seed。

### 本地数据库与构建说明

`pnpm db:local` 在前台运行真实 PostgreSQL 16.14，监听 `127.0.0.1:55432`，创建 `daosen` 与隔离测试库 `daosen_test`，不安装系统服务或创建操作系统账号。`Ctrl+C` 停止数据库进程，数据保留在项目 `.local/postgres/`；再次启动会复用数据。不要同时启动同一目录的多个实例，不要随意删除锁文件或数据库目录。

Windows 中文路径下，辅助脚本仅把 PostgreSQL 原生运行文件缓存到系统临时目录 `daosen-phase1-pg16.14-<项目路径哈希>`，数据库文件仍在项目内。受限 Agent 沙箱启动原生进程可能需要批准，普通终端不依赖 Agent 沙箱；辅助脚本不是生产数据库管理器。

若 3000 端口已占用，先确认冲突服务归属，或同时调整开发端口与 `NEXTAUTH_URL`，保持页面地址和认证来源一致。原生本地构建使用 `pnpm build` 后 `pnpm start`；Docker 才设置 `BUILD_STANDALONE=true` 生成 standalone 产物，避免 Windows 本地构建依赖符号链接权限。

## Docker 配置：验证已按用户要求暂缓

仓库保留 `Dockerfile` 与 Compose 配置，但本次不执行 Docker 构建或容器联调，也不把它作为本地 Demo 收尾的阻塞项。以下命令供之后具备 Docker Desktop / Compose v2 的环境使用，**不代表已通过容器验证**：

```powershell
docker compose up -d --build
docker compose run --rm seed
```

使用前确认 `.env` 中随机会话密钥与 Demo Seed 开关已配置。Compose 内部数据库连接由容器配置提供，不能把本地端口 55432 当作容器内地址。数据库健康检查通过后执行迁移，再启动应用；Seed 通过第二条命令显式执行。

停止容器使用 `docker compose down`，默认保留数据库卷；不要对需要保留的数据使用 `down -v`。

## 测试账号

运行 Seed 后，以下账号的演示密码均为 `Daosen@2026!`。

| 邮箱 | 角色 | 状态 | 用途 |
| --- | --- | --- | --- |
| `designer@demo.daosen.ai` | `DESIGNER` | `APPROVED` | 设计师登录及本人资料 |
| `store@demo.daosen.ai` | `STORE_OWNER` | `APPROVED` | 店主登录及本人资料 |
| `staff@demo.daosen.ai` | `STAFF` | `APPROVED` | 员工权限边界 |
| `admin@demo.daosen.ai` | `ADMIN` | `APPROVED` | 只读账号列表 |
| `pending@demo.daosen.ai` | `DESIGNER` | `PENDING` | 待审核状态 |
| `rejected@demo.daosen.ai` | `DESIGNER` | `REJECTED` | 已驳回状态 |
| `disabled@demo.daosen.ai` | `DESIGNER` | `DISABLED` | 禁止登录 |

新注册用户只能选择设计师或店主，状态固定为 `PENDING`，不能通过请求参数注册为管理员、员工或自行成为已通过账号。`PENDING` / `REJECTED` 可以登录查看本人状态，但不能获得管理员权限；`DISABLED` 不能登录。Phase 1 暂不提供审批按钮；完整状态流转规则等待后续确认。

演示密码是公开测试数据，绝不是生产凭据。不要在共享或生产环境运行 Demo Seed。脚本要求显式设置 `ALLOW_DEMO_SEED=true`；已有同邮箱账号不会被覆盖，因此其现有密码和状态可能与上表不同。

## 页面与接口

| 路径 | 功能 | 访问条件 |
| --- | --- | --- |
| `/` | 本阶段概览 | 公开 |
| `/register` | 注册 | 公开 |
| `/login` | 登录 | 公开 |
| `/account` | 本人资料与状态 | 已登录且账号未停用 |
| `/admin` | 只读账号列表 | `ADMIN` 且 `APPROVED` |
| `POST /api/platform/register` | 注册账号 | 公开，服务端校验 |
| `GET /api/platform/session` | 当前账号的安全资料 | 未登录返回空用户 |
| `GET /api/platform/users` | 只读账号列表 | `ADMIN` 且 `APPROVED` |
| `/api/auth/*` | NextAuth 登录、会话、退出 | 由 NextAuth 处理 |

隐藏菜单不是安全边界；受保护页面和 API 均应在服务端检查当前账号。接口不返回密码或密码哈希。

## 项目目录

```text
daosen-ai/
├─ src/
│  ├─ app/                 # App Router 页面、布局和 API 入口
│  ├─ components/          # 基础 UI、应用框架
│  ├─ modules/identity/    # 账号模块：输入规则、服务、仓储、安全类型
│  ├─ server/              # 共享数据库、NextAuth、RBAC 和 HTTP 边界
│  └─ lib/                 # 客户端共享工具
├─ prisma/
│  ├─ schema.prisma        # User / Role / AccountStatus
│  ├─ migrations/          # 可追踪的 PostgreSQL 迁移
│  └─ seed.ts              # 虚构的演示基础数据
├─ scripts/                # 本地初始化与开发辅助命令
├─ tests/                  # 单元、接口集成和浏览器测试
├─ docs/                   # 架构、数据库、权限说明
├─ _future/                # 历史未交付草稿（不参与构建）
├─ Dockerfile
├─ docker-compose.yml
├─ .env.example
├─ AGENTS.md
├─ PRODUCT.md
└─ TODO.md
```

## 检查与测试

以下命令按顺序执行。Windows 下生成 Prisma Client 前先停止应用与 E2E 服务，避免已加载的 DLL 被占用；`build`、`dev` 和 E2E 不要并行执行，以免 Next.js 生成的类型文件互相影响。数据库可保持运行。

```powershell
pnpm db:validate
pnpm db:generate
pnpm typecheck
pnpm test
pnpm build
```

### 浏览器集成测试

保持 `pnpm db:local` 运行。浏览器测试默认只连接本地 `127.0.0.1:55432/daosen_test`，不会使用开发 `.env` 中的 `daosen` 数据库。首次在 PowerShell 执行：

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = ".local/playwright"
node node_modules/@playwright/test/cli.js install chromium
$env:E2E_ALLOW_DB_WRITE = "true"
pnpm test:e2e
```

测试通过 `scripts/test-setup.cjs` 自动对隔离库执行迁移和 Demo Seed，再启动 `http://localhost:3100` 的专用测试服务器，构建产物单独保存在 `.next-e2e/`。确保 3100 端口空闲；日常开发仍使用 3000。测试会创建测试账号，因此必须显式设置 `E2E_ALLOW_DB_WRITE=true` 才运行。

如果使用 Docker 或自己的本地测试实例，需要先创建一个独立的测试数据库，再设置 `E2E_DATABASE_URL`（例如端口 5432 的 `daosen_test`）。安全检查只接受 `localhost` / `127.0.0.1`、名称以 `_test` 结尾的 PostgreSQL 数据库及 `public` schema；不接受远程或生产数据库，不执行清库或全表截断。

```powershell
$env:E2E_DATABASE_URL = "postgresql://daosen:daosen_local_change_me@127.0.0.1:5432/daosen_test?schema=public"
pnpm test:e2e
```

构建和类型检查成功不能替代真实数据库或浏览器验证；实际执行结果见 [Phase 1 验收记录](docs/phase-1-acceptance.md)。`pnpm test` 的接口集成测试使用 Mock 仓储，真实数据库加浏览器流程由 `pnpm test:e2e` 单独验证。

常用命令：

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` / `pnpm start` | 构建 / 启动构建后的应用 |
| `pnpm typecheck` | TypeScript 检查 |
| `pnpm test` | 单元测试 |
| `pnpm test:e2e` | 浏览器集成测试 |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:validate` | 校验 Prisma schema |
| `pnpm db:migrate` | 执行已提交的迁移，不自动创建迁移 |
| `pnpm db:seed` | 创建 Demo 基础数据 |
| `pnpm db:local` | 前台启动项目内 PostgreSQL 16.14，端口 55432 |
| `pnpm setup` | 本地数据库初始化 |

## 文档与边界

- [架构](docs/architecture.md)
- [数据库](docs/database.md)
- [角色与权限](docs/roles-and-permissions.md)
- [Phase 1 验收记录](docs/phase-1-acceptance.md)
- [合理默认值与待办](TODO.md)
- [后续 Agent 工作约定](AGENTS.md)

用户提供的旧源码 ZIP 为 Vite / Supabase 项目，仅作产品和旧系统参考；本阶段未迁移其中的用户、商业数据、认证会话或第三方配置。第三方服务没有被启用，不需要提供 API Key。
