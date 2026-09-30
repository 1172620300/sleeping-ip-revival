# G0/G1 验收测试用例

## 执行约定

1. `npm run db:migrate && npm run db:seed` 准备本地数据库。
2. `npm test` 执行 Vitest 单元/契约用例；`npm run test:e2e` 启动 Next 服务并执行 API/关键 UI 用例。
3. 使用 seed 账号：`designer@demo.daosen.ai`、`store@demo.daosen.ai`、`staff@demo.daosen.ai`、`admin@demo.daosen.ai`、`bob@demo.daosen.ai`、`pending@demo.daosen.ai`、`rejected@demo.daosen.ai`；密码均为 `Daosen@2026!`。
4. 每个 mutation 使用唯一标题和 `idempotencyKey`，避免测试依赖顺序；测试结束可重新 seed 清理。

## G0 基础与安全

| ID | 场景 | 前置/步骤 | 预期 |
| --- | --- | --- | --- |
| G0-01 | 健康启动 | 安装依赖、生成 Prisma、迁移、seed、启动 dev | 命令成功，首页 HTTP 200 |
| G0-02 | Session 最小 DTO | 匿名 GET `/api/platform/session`，再以 designer 登录 GET | 匿名 `user:null`；登录只返回 id/name/email/role/status/reviewNote，不含密码/token |
| G0-03 | 注册审核 | POST register 合法 DESIGNER；用同邮箱再次注册 | 首次 201/PENDING；重复返回稳定错误码；客户端不能注册 ADMIN/STAFF |
| G0-04 | PENDING 写入拦截 | pending 登录，POST works/tasks/lab-applications | 全部拒绝 `ACCOUNT_NOT_APPROVED`，无数据库脏数据 |
| G0-05 | REJECTED/DISABLED 拦截 | rejected/disabled 尝试登录和业务写入 | 登录受限或无可写 session；业务写入拒绝 |
| G0-06 | Admin API | designer/store GET/PATCH `/api/platform/admin*`；admin 同样操作 | 普通用户 401/403；ADMIN 成功且写 AuditLog |
| G0-07 | Origin/CSRF | 使用不允许 Origin 的 mutation | 请求拒绝 `CSRF_ORIGIN_INVALID`，数据不变 |
| G0-08 | 错误契约 | 发送缺字段、错误枚举、过大 body | JSON `{error,code}`，不返回堆栈/SQL/敏感数据 |
| G0-09 | 公开 DTO | 匿名列出 home/works/materials/knowledge | 只有公开字段；不含私有 Work、隐藏 Prompt、内部备注或 storageKey |

## G1 页面和业务 API

| ID | 场景 | 步骤 | 预期 |
| --- | --- | --- | --- |
| G1-01 | 首页入口 | 打开 `/`，点击查资料/做设计/营销/检测/材料 | 页面有真实卡片/状态，跳转到对应路径 |
| G1-02 | AI 问答带来源 | designer POST `/chat` 合法问题，GET chat | 返回 answer 和至少一个允许的 source；刷新仍有会话 |
| G1-03 | 无结果/错误重试 | 发送无匹配问题和“模拟错误” | 明确无结果或错误状态；不编造来源；重试可恢复 |
| G1-04 | Studio 设计任务 | designer 上传/提交 DESIGN task | 返回 QUEUED/PROCESSING，worker 后 SUCCEEDED；result 含 mock 标记和输出 |
| G1-05 | Studio 营销任务 | store 提交 IMAGE/VIDEO task | 参数持久化，输出类型正确；视频若缺编码器则明确 FAILED，不展示假结果 |
| G1-06 | Task 幂等 | 同用户同 `idempotencyKey` 连续 POST 两次 | 返回同一个 Task id，不产生第二条任务/扣除第二次配额 |
| G1-07 | Task 失败/Retry | 使用 `simulateFailure:true` 创建任务，调用 retry | 初次 FAILED 且 result=null；Retry 同 id、attempts+1，成功才写 result |
| G1-08 | Task 隔离 | designer 创建 task；bob GET 该 id、retry/cancel | bob 401/403/404，不能读输入/输出或改变状态 |
| G1-09 | 社区公开作品 | designer 创建 PUBLIC work，GET community | 非 owner 可看标题/图/说明；按公开性返回 Prompt |
| G1-10 | 社区私有作品 | designer 创建 PRIVATE work；bob/匿名 GET 列表和详情 | 不出现在搜索、home、AI 来源；详情按统一 404/403，不泄露存在性 |
| G1-11 | Prompt/二创四组合 | 四种 `promptPublic × allowRemix` 组合逐一创建；bob GET/remix | Prompt 只在公开组合返回；remix 仅 allowRemix 时成功；owner 仍可看自己的 Prompt |
| G1-12 | 社区互动 | bob 对公开 work 点赞/收藏、评论、关注，再重复操作 | API 幂等切换；评论内容做校验；计数一致 |
| G1-13 | 举报 | bob POST report；designer 查看 report | 举报对普通用户私有；ADMIN 可见并能处理，操作写审计 |
| G1-14 | 材料搜索/申请 | 匿名筛选材料；designer 咨询/申请样品 | 公开列表可读；申请生成编号，重复 idempotencyKey 不重复 |
| G1-15 | 实验室申请 | designer 提交含 attachmentIds 的 lab application | 状态为 SUBMITTED；申请人可读，其他普通用户不可读 |
| G1-16 | 报告/Asset 隔离 | admin 关联报告 Asset；另一用户下载 URL | 申请人/授权 STAFF/ADMIN 成功，陌生用户拒绝；storageKey 不泄露 |
| G1-17 | 制造合作 | store POST manufacturing，profile 查看 | 项目持久化、个人中心只显示 owner 数据 |
| G1-18 | Admin 审核链路 | admin approve pending，再用 pending 登录创建 Work | 审核前拒绝，审核后按角色可写；每次状态变更可查 AuditLog |
| G1-19 | Admin 状态流转 | admin 更新 lab/material/manufacturing/report 状态 | 仅允许合法状态，公开备注/内部备注按角色过滤 |
| G1-20 | 刷新恢复 | 创建 task/chat/application 后刷新页面/重新请求 | 数据来自数据库而非内存；状态和结果保持一致 |

## 非功能与回归

| ID | 场景 | 预期 |
| --- | --- | --- |
| N-01 | `npm run typecheck` | 无 TypeScript 错误 |
| N-02 | `npm run build` | 生产构建成功，不依赖本地 mock key |
| N-03 | 响应式/键盘 | 375px 与桌面宽度页面不溢出；核心按钮可键盘聚焦和提交 |
| N-04 | 日志脱敏 | 错误和审计日志不写密码、Cookie、完整隐藏 Prompt、文件正文 |
| N-05 | 并发幂等 | 并发发送相同 key，数据库唯一约束和服务端事务只保留一条 |

## 通过标准

G0-01~G0-09、G1-01~G1-20 和 N-01~N-05 均有自动化或人工证据；任何安全/权限用例失败均不得宣称 G1 通过。真实模型、品牌数据和 RAG 未接入时，在验收报告中明确标记为 Mock/待甲方资料，不以“页面可见”替代能力验收。
