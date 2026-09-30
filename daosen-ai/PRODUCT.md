# 道森 AI 平台 · Phase 1
<!-- impeccable:product-schema 1 -->
## Platform
web
## Stack
Next.js App Router、TypeScript、Tailwind CSS、Prisma 6.19.3、PostgreSQL 16。模块化单体；开发、测试与 Docker 配置均以 PostgreSQL 为目标，不使用 SQLite 替代。本轮使用项目内 PostgreSQL 16.14 进行本地验证；Docker 验证按用户要求暂缓。
## Users
设计师、实体店经营者、道森员工、管理员。桌面工作环境为主，支持基本移动适配。
## Product Purpose
为后续道森 AI 平台建立可运行的账号与权限基础。本轮只交付 G0/G1 项目的 Phase 1，不代表完整 G0/G1 或任何 G2–G5 业务功能已完成。
## Operating Context
本地演示环境中，访客注册设计师或店主账号，用户登录查看本人资料和账号状态，已通过的管理员查看只读账号列表。账号审核操作与未来业务均未实现。
## Capabilities and Constraints
PostgreSQL 持久账号、密码认证、服务端 RBAC、本人资料隔离、基础布局、Docker、种子数据和自动化测试。所有账号均为虚构 Demo 数据；无真实 AI、邮件、文件存储或支付服务调用。历史未来业务草稿不参与当前构建。
## Brand Commitments
中文默认；专业、清晰、克制的 B2B 工业设计语境。基础布局应优先清楚表达账号状态和权限边界。旧源码提供品牌线索，但当前视觉不等同正式品牌确认。
## Evidence on Hand
用户最新 Phase 1 清单、既有产品 PDF 和用户补充的旧 Vite / Supabase 源码 ZIP。附件作为参考，不能覆盖最新请求或扩大范围。未导入旧系统数据、用户凭据、认证会话或第三方配置。非关键缺失采用开发默认值并记录 TODO。
## Product Principles
- 认证与授权分离；权限同时取决于最新数据库角色和状态。
- 注册不能自授员工、管理员或已通过状态。
- 普通账号只读取本人资料；管理员例外为明确授权的只读列表。
- 未实现功能不伪装成可用功能，未执行测试不声明通过。
- Phase 1 完成即停止，不自动扩展业务模块。
## Open assumptions
单账号单角色、待审核/已驳回可登录查看本人状态、停用禁止访问、审批流程不在本阶段。真实审核规则、组织权限、生产配置和旧数据迁移等待确认，详见 TODO.md。
