# API 设计（G0/G1）

## 约定

- Base path：`/api/platform`；请求和成功响应使用 JSON，除上传接口外。
- 成功响应直接返回对象，不包一层 `data`。错误统一为 `{ "error": "可展示信息", "code": "稳定错误码" }`。
- 需要写入、AI、服务申请或私有读取时必须是 `APPROVED`；Admin 端点额外要求 `role=ADMIN`。资源级 owner/visibility 检查不可省略。
- 日期为 ISO 8601 UTC；分页/排序字段固定且服务端限制 page size。列表 DTO 不返回隐藏 Prompt、密码哈希、内部备注或 storage key。
- 业务 mutation 应接受 `idempotencyKey`；同一用户同一 key 返回原结果，不重复创建。
- 主路由已完成 Origin/CSRF 检查；浏览器请求使用同源 Cookie。二进制下载仍通过受保护 Asset URL。

## Auth 与会话

### `POST /api/platform/register`

创建待审核账号，不会直接成为可写业务账号。

```json
{
  "name": "林舟",
  "email": "lin@example.com",
  "password": "A-strong-password-1",
  "role": "DESIGNER",
  "phone": "13800000000",
  "purpose": "工业产品设计"
}
```

`role` 只允许 `DESIGNER` 或 `STORE_OWNER`，服务端忽略/拒绝客户端提交的 `ADMIN`/`STAFF`。返回 `{user:{id,name,email,role,status:"PENDING"}}`；重复邮箱返回 `REGISTER_EMAIL_EXISTS`。

Auth.js Credentials 入口为 `/api/auth/[...nextauth]`。客户端登录使用 `signIn('credentials',{email,password,redirect:false})`，退出使用 `signOut`。

### `GET /api/platform/session`

返回 `{user:{id,name,email,role,status,reviewNote}|null}`。不返回密码、token 或内部字段。

## 公开首页与社区

| 方法/路径 | 成功响应 | 权限/说明 |
| --- | --- | --- |
| `GET /home` | `{works,news,events}` | 匿名；只给公开作品最小 DTO |
| `GET /works?scope=mine&sort=latest\|popular\|featured` | `{works}` | `scope=mine` 需 APPROVED；列表始终过滤私有项 |
| `POST /works` | `{work}` | APPROVED；`visibility` 默认 PRIVATE |
| `GET /works/:id` | `{work}` | owner 可看私有，其他人仅公开 |
| `PATCH /works/:id` | `{work}` | owner 或 ADMIN；修改公开性需明确操作 |
| `POST /works/:id/remix` | `{referenceWorkId,imageUrl,prompt?,notice}` | 检查公开性/二创许可；不泄露隐藏 Prompt |
| `POST /works/:id/interaction` | `{active}` | `type=LIKE\|BOOKMARK`；幂等切换 |
| `GET/POST /works/:id/comments` | `{comments}`/`{comment}` | 公开作品可读；写入需 APPROVED |
| `POST /follows/:userId` | `{active}` | APPROVED；不能关注自己（按产品策略返回错误） |
| `POST /reports` | `{report}` | APPROVED；举报内容和 actor 私有 |

Work 创建体：`{title,description,prompt,promptPublic,allowRemix,visibility:"PRIVATE"|"PUBLIC",imageUrl?,assetId?,taskId?}`。返回 DTO 依据请求者决定是否包含 `prompt`。

## Knowledge 与 AI Chat

| 方法/路径 | 成功响应 | 权限/说明 |
| --- | --- | --- |
| `GET /knowledge?q=&category=` | `{sources}` | 公开知识源可匿名；私有源按授权过滤 |
| `GET /knowledge/:id` | `{source}` | 只返回可见源和允许字段 |
| `GET /chats` | `{chats}` | APPROVED，本人会话 |
| `GET /chats/:id` | `{chat:{id,title,messages:[...]}}` | 只允许会话 owner |
| `POST /chat` | `{chatId,answer,sources}` | APPROVED；无来源时返回空 sources/明确无结果，不编造 |

Chat body 为 `{message,chatId?}`；可以使用约定的“模拟错误”输入验证错误路径。回答来源只包含公开或当前用户有权访问的 KnowledgeSource，绝不返回其他用户私有 Work 的 Prompt。

## Materials、Lab 与 Manufacturing

| 方法/路径 | Body/响应 | 权限 |
| --- | --- | --- |
| `GET /materials?q=&type=` | `{materials}` | 公开材料可匿名 |
| `GET /materials/:id` | `{material}` | 公开材料可匿名；字段含 name/type/properties/applications/constraints/caseStudy/updatedAt/imageUrl |
| `POST /material-requests` | `{materialId,kind:"CONSULTATION"|"SAMPLE",contact,purpose,notes?,idempotencyKey}` → `{application}` | APPROVED |
| `GET /lab-applications` | `{applications}` | APPROVED，本人；STAFF/ADMIN 按授权范围 |
| `POST /lab-applications` | `{product,requirements,contact,attachmentIds:[],idempotencyKey}` → `{application}` | APPROVED |
| `GET /lab-applications/:id` | `{application}` | owner/授权 STAFF/ADMIN；报告下载为受保护 Asset URL |
| `GET/POST /manufacturing` | `{projects}`/`{project}` | APPROVED；POST `{title,description,contact,workId?}` |

Lab 状态为 `SUBMITTED`、`CONTACTING`、`WAITING_SAMPLE`、`TESTING`、`REPORT_READY`、`COMPLETED` 或 `CANCELLED`；状态变化由 STAFF/ADMIN 服务端校验。

## Assets 与 AI Tasks

### `POST /assets`

`multipart/form-data`，字段为 `file` 与 `kind`（IMAGE/VIDEO/ATTACHMENT/REPORT 等）。返回 `{asset:{id,url,mimeType,size,...}}`。服务端检查大小、MIME、owner 和关联业务；`url` 不应绕过权限。

### `GET /assets/:id`

受保护二进制。只有 owner、关联申请被授权员工或 ADMIN 能下载；未授权请求不得通过错误信息泄露文件是否存在。

### `GET/POST /tasks`

GET 返回 `{tasks}`（当前用户；ADMIN 可按授权查看）。POST body：

```json
{
  "type": "DESIGN",
  "input": {
    "prompt": "为可持续收纳产品提供三组概念",
    "mode": "PRODUCT",
    "purpose": "家居",
    "appearance": "克制、工业",
    "brand": "道森",
    "constraints": "可拆解、无尖角",
    "outputKind": "IMAGE",
    "assetIds": [],
    "count": 3
  },
  "idempotencyKey": "design-2026-09-26-001"
}
```

返回 `{task}`，Task 字段为 `id,type,provider,model,status,input,result,error,attempts,createdAt,updatedAt`。`result` 为 `{analysis?,brief?,prompt?,outputs:[{url,kind:"IMAGE"|"VIDEO",label}],mock:true}`；失败时必须为 `null`。

`GET /tasks/:id`、`POST /tasks/:id/retry`、`POST /tasks/:id/cancel` 分别读取、重试和取消 owner 的任务；Retry 要求任务为 FAILED，复用同一 id/输入并递增 attempts。

## Admin

`GET /admin` 返回 `{users,works,reports,labApplications,materialRequests,projects,tasks,settings,auditLogs}`，仅 ADMIN。

| 方法/路径 | Body | 结果 |
| --- | --- | --- |
| `PATCH /admin/users/:id` | `{status?,role?,reviewNote}` | 审核/禁用/角色变更，写审计 |
| `PATCH /admin/works/:id` | `{featured?,visibility?}` | 精选/公开状态，写审计 |
| `PATCH /admin/lab/:id` | `{status,publicNote?,reportAssetId?}` | 状态/报告，写审计 |
| `PATCH /admin/material-requests/:id` | `{status,internalNote?}` | 处理材料申请，内部备注不向申请人泄露 |
| `PATCH /admin/manufacturing/:id` | `{status,publicNote?}` | 处理制造项目 |
| `PATCH /admin/reports/:id` | `{status,resolution}` | 举报处理 |
| `PATCH /admin/settings` | `{dailyTaskLimit:number}` | 系统配置，写审计 |

## 稳定错误码

建议至少保持：`UNAUTHENTICATED`、`ACCOUNT_NOT_APPROVED`、`FORBIDDEN`、`NOT_FOUND`、`VALIDATION_ERROR`、`CSRF_ORIGIN_INVALID`、`IDEMPOTENCY_CONFLICT`、`REMIX_NOT_ALLOWED`、`TASK_NOT_RETRYABLE`、`UPLOAD_REJECTED`、`PROVIDER_FAILED`、`RATE_LIMITED`。错误文本可以本地化，code 供 UI 和测试使用。

## 未来接口预留

- `POST /api/platform/providers/llm|image|video` 不直接暴露供应商密钥；由 Task service 选择 Provider。
- `POST /api/platform/knowledge/sources`、`POST /api/platform/knowledge/ingest` 用于受控导入、解析、版本和权限标签。
- `POST /api/platform/rag/query` 接受 query、scope、filters，返回带 source id/version 的引用；检索层必须先执行业务授权过滤。
- Provider 失败、限额、超时和审计信息保存在 Task/Usage，不把供应商原始错误或密钥返回前端。
