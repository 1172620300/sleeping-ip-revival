# 页面与路由

## 页面总览

| 路由 | 页面 | 匿名可见 | 主要数据/API | 关键动作 |
| --- | --- | --- | --- | --- |
| `/` | 首页 | 是 | `GET /api/platform/home` | 进入查资料、做设计、做营销、申请检测、找材料 |
| `/login` | 登录 | 是 | Auth.js Credentials | 登录、错误重试、前往注册 |
| `/register` | 注册 | 是 | `POST /api/platform/register` | 选择 DESIGNER/STORE_OWNER，提交后等待审核 |
| `/ai-chat` | AI 资料问答 | 否（需 APPROVED） | `GET/POST /api/platform/chats*`, knowledge | 新会话、连续追问、来源详情、无结果/错误重试 |
| `/studio` | AI 工作室 | 否（需 APPROVED） | `POST /api/platform/tasks`, assets | Product Design/Marketing、上传、编辑 Prompt、创建多个任务 |
| `/community` | 社区作品 | 是（公开项） | `GET /api/platform/works`, interactions/comments | Official Picks/Latest/Popular、详情、点赞/收藏/评论/关注/举报 |
| `/community/works/[id]` | 作品详情 | 视 visibility | `GET/PATCH works/:id`, comments, remix | 查看作品、按 Prompt/二创权限显示内容 |
| `/materials` | 材料库 | 是（公开项） | `GET /api/platform/materials` | 搜索、筛选、对比、详情、咨询、申请样品 |
| `/materials/[id]` | 材料详情 | 是（公开项） | `GET /api/platform/materials/:id` | 查看特性/工艺/案例，提交咨询或样品申请 |
| `/lab` | 实验室服务 | 是（介绍）；申请需登录 | `GET/POST lab-applications` | 查看流程、服务项目、上传附件、提交申请 |
| `/profile` | 个人中心 | 否（本人） | `GET /api/platform/profile` | 我的作品、收藏、检测申请、制造合作、通知 |
| `/admin` | 运营后台 | ADMIN | `GET/PATCH /api/platform/admin*` | 用户审核、精选、举报、申请、任务、配置、审计 |

## 典型跳转

```mermaid
flowchart LR
  Home[/] --> Chat[/ai-chat]
  Home --> Studio[/studio]
  Home --> Community[/community]
  Home --> Lab[/lab]
  Home --> Materials[/materials]
  Home --> Login[/login]
  Login --> Register[/register]
  Register --> Pending[审核等待状态]
  Login --> Profile[/profile]
  Profile --> WorkDetail[作品详情]
  Community --> WorkDetail
  Materials --> MaterialDetail[材料详情]
  MaterialDetail --> Lab
  Login --> Admin[/admin]
```

## 页面行为与状态

### 首页

首屏介绍平台价值，接着显示资讯、比赛/活动和精选公开作品。入口卡片根据会话状态显示“登录后使用”或直接跳转；首页不泄露私有作品、隐藏 Prompt 和未审核内容。

### AI Chat

左栏为当前用户会话历史，中栏显示问答和连续追问，右栏显示可打开的来源详情。每个答案都包含来源卡片；无检索结果显示明确空状态而不编造答案。发送、加载、失败、重试都是真实状态，AI/来源请求受审核状态限制。

### Studio

在 Product Design 与 Marketing 两个模式之间切换；表单字段按模式变化，上传走统一 Asset API。提交后显示 Task 状态（排队中/生成中/成功/失败），可编辑 Prompt、下载输出和 Retry。Task 刷新页面仍从 API 恢复，不使用假的进度百分比。

### Community

Tab 对应 Official Picks、Latest、Popular；详情页显示作者、图片、说明、互动、评论和关注。Prompt 公开性（公开/隐藏）和二创许可（允许/禁止）分别呈现；隐藏 Prompt 不因 URL、搜索或 remix 请求而泄露。

### Lab / Materials

材料详情可以发起咨询或申请样品；实验室申请需要产品、需求、联系人和附件，并展示 `SUBMITTED → CONTACTING → WAITING_SAMPLE → TESTING → REPORT_READY → COMPLETED` 或 `CANCELLED`。报告只向申请人和授权员工/管理员提供。

### Profile / Admin

Profile 只返回当前用户资源。Admin 页面服务端再次校验 ADMIN；mutation 显示状态、备注和审计结果，普通用户不能通过直接访问 API 绕过 UI。

## 响应式和无障碍基线

桌面工作台优先，但在窄屏下侧栏折叠为抽屉，卡片和表单单列。按钮、输入、弹窗需有可见焦点、中文 label、键盘可操作和错误关联；加载/空/错误状态不能依赖颜色单独表达。后续国际化应保持路由和 API DTO 不变。
