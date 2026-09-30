# Phase 1 验收记录

验证日期：2026-09-27。本记录仅覆盖账号与权限基础阶段，不代表完整 G0/G1 已完成。

## 当前结论：本地 Phase 1 收尾通过

继续原项目 C:\Users\ASUS\Documents\ChatGPT\沉睡IP复苏计划\daosen-ai，保留原代码、环境配置和 PostgreSQL 数据。未迁移或修改桌面道森目录下的另一份 dawson 项目。构建后的应用已在 http://localhost:3000 启动，数据库监听 127.0.0.1:55432。

本轮按用户最新要求优先交付可查看的网站，远程数据库接入和 Docker 联调暂缓；没有扩展 Phase 2 业务模块。

## 恢复时的状态

- 已有账号模块、四种角色/状态、注册登录退出、个人资料、管理员只读目录、PostgreSQL / Prisma、种子数据及自动化测试。
- 前次验收为 17 项 E2E 通过、1 项移动菜单失败；其余检查需要本轮重新执行。
- 原数据库及网站进程均未运行，磁盘文件和数据库数据仍在。
- 实际项目属于父目录“沉睡IP复苏计划”的 Git 仓库，分支 master 尚无提交，项目文件未跟踪。桌面 dawson 为独立仓库，分支“小明”，工作区干净。本轮未提交或推送。

## 本轮最终执行结果

| 项目 | 结果 | 验证边界 |
| --- | --- | --- |
| pnpm db:validate | 通过，退出码 0 | Prisma 6.19.3，PostgreSQL schema |
| pnpm db:generate | 通过，退出码 0 | 本地 Client 生成 |
| pnpm typecheck | 通过，退出码 0 | 修复后的 TypeScript 检查 |
| pnpm test | 7 文件、65 项通过，退出码 0 | 单元/接口测试使用 Mock 仓储；包含真实 bcrypt 验证 |
| pnpm setup | 通过，退出码 0 | 本地 daosen 迁移、非覆盖式 Seed；没有待执行迁移 |
| pnpm test:e2e | 19 项通过、0 失败，正常退出码 0 | 真实本地 daosen_test，Chromium，专用端口 3100；58.3 秒 |
| pnpm build | 通过，退出码 0 | Next.js 15.5.26 原生生产构建，非 Docker standalone |
| 本地应用启动 | 通过 | next start --hostname 127.0.0.1 --port 3000 |
| node scripts/visual-check.mjs | 10 个页面检查通过，退出码 0 | 桌面 1440×1000、手机 390×844；实际登录演示管理员 |
| UI 机械检查 | 无发现，退出码 0 | 修改的 AppShell 与 CSS |
| 远程数据库接入 | 暂缓，未执行 | 未访问、迁移或写入外部数据库 |
| Docker 运行验证 | 按用户要求暂缓 | 不声明容器通过 |

页面复核覆盖 /、/login、/register、/account、/admin；两种尺寸下均返回 HTTP 200，无水平溢出，无浏览器 pageerror / console error。截图与机器记录在 .impeccable/review/，已查看桌面首页、桌面目录、手机账户和手机登录截图。范围为 Chromium，不宣称跨浏览器或全部设备验证。

## 修复及回归证据

移动菜单原测试单独重跑可以通过，但原实现存在脚本加载期间按钮已启用的问题：服务端 HTML 已展示按钮，而 React 尚未绑定点击处理。新增测试阻塞 Next.js 脚本，检查按钮在 hydration 前不可操作，修复前稳定失败（收到 enabled），修复后通过。

AppShell 新增交互就绪状态：初始禁用菜单，挂载后启用；切换使用函数式状态更新。保留原有路径变化关闭菜单的行为。既有手机测试增加 Esc 关闭并恢复焦点、跳转后收起、再次打开及关闭断言。完整 19 项 E2E 全部通过，测试未增加固定延时或自动重试来掩盖问题。

## 遇到的运行问题与处理

- Windows 运行中的 Next.js / Prisma 占用查询引擎 DLL，导致并行生成 Client 出现 EPERM；停止对应测试服务后生成成功，没有删除依赖或数据库。
- Next.js 构建与 E2E 开发服务并行时，生成的 .next-e2e/types 文件变化导致类型检查失败；等待 E2E 正常退出后单独构建通过。README 已要求顺序执行。
- 沙箱内 esbuild 读取父路径被拒绝，Playwright 清理 Windows 子进程曾挂起；使用获批的正常权限执行后，65 项测试与完整 E2E 均正常退出。首次单测菜单运行的服务清理由本轮明确识别的测试进程完成，不作为最终完整 E2E 证据。
- Prisma 弃用配置提示仍存在，记录为非阻塞维护项，不修改当前锁定主版本。

## 数据与安全边界

仅使用虚构 Demo 账号；E2E 写入显式设置 E2E_ALLOW_DB_WRITE=true，由 scripts/test-setup.cjs 限制为本地 _test PostgreSQL 数据库与 public schema。迁移和 Seed 不清库，测试只清理准确标识的本轮临时账号。已有同邮箱 Demo 用户不会被 Seed 覆盖。

未导入旧源码中的真实业务数据、密钥或会话；环境配置、本地数据库、依赖、构建和测试产物受 Git 忽略规则保护。远程接入仍缺隔离 Demo PostgreSQL 连接配置及迁移/Seed 授权，不阻塞本轮本地交付。

重启及测试复现见 [README](../README.md)，暂缓事项、生产前要求和后续范围见 [TODO](../TODO.md)。
