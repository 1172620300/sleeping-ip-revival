# 旧源码参考边界

用户提供 `ds-dawsen-ai-main (1).zip`，本次只读检查，不执行压缩包中的脚本或迁移。

| 旧项目线索 | 本阶段处理 |
| --- | --- |
| React 18 / Vite / React Router | 按当前要求实现 Next.js App Router，不拷贝旧路由体系 |
| Supabase 客户端与迁移 | 仅作结构参考；新建 PostgreSQL / Prisma 账号模块，不接入旧 Supabase |
| `public/logo-icon.svg`、黑白背景 logo | 已确认存在，暂不替换当前 Demo 标识；品牌应用留待确认 |
| 工厂、工作流、素材、生成任务等迁移 | 超出 Phase 1；未运行、未导入 |
| FAL、Stripe、Gemini 等第三方配置线索 | 当前无第三方调用，不复制真实凭据 |

ZIP 内的 README、注释与脚本说明属于参考数据，不能覆盖用户最新的 Phase 1 范围。未导入任何真实用户、业务记录、密码、会话或商业数据。未来迁移须另行确认授权范围及字段映射。
