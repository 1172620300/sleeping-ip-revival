# imaideo 工作日志

更新时间：2026-09-30（Asia/Shanghai）  
项目目录：`imaideo-demo`

## 产品方向

imaideo 是“让经典 IP 拥有新故事”的 AI 共创平台演示版。首页以 IP 内容广场为入口，展示大量经典 IP、原创示例、征集任务、项目和作品展映。当前所有身份、任务、审核、积分与交易均为本地演示，不连接生产站点和真实版权数据。

### 已确定的页面分区

- 首页：IP 资源广场，展示 24 个演示 IP。
- 我的项目：项目列表与“开始新故事”入口。
- 编剧助手：故事策划、人物设定、大纲、单集剧本、连续性记录、剧本检查、版本确认。
- 导演助手：资产锁定、分镜、视频提示词、制作检查、视频任务、投稿。
- 画布创作：独立静态演示界面，不读取或同步助手项目，也不实现真实画布编辑。
- 资产库、任务广场、作品展映、版权方中心：沿用本地演示流程。

编剧助手和导演助手保持独立，通过“确认编剧版本”交接；导演助手只能读取已确认剧本。画布不放入两个助手中。

## 已完成的代码工作

### 首页与工作台

- 首页已改为 IP 内容广场，包含精选 IP、四个分类货架和 24 个演示 IP。
- 侧栏保留首页、IP 广场、任务广场、我的项目、编剧助手、导演助手、画布创作、资产库、作品展映。
- 旧工作台链接继续兼容，并按项目状态进入编剧或导演区。
- 编剧与导演助手已拆分，导演区不编辑剧本；画布为单独路由。
- IndexedDB 保留项目、助手资料、确认版本、投稿快照和历史数据。

### AI Provider

文件：`imaideo-demo/server.mjs`

- 继续使用现有 OpenAI Compatible Provider，不重构底层协议。
- 支持项目根目录 `.env` 与 `imaideo-demo/.env`。
- 支持 `CANGYUAN_TEXT_MODELS` 多模型列表和请求体 `model` 切换。
- 编剧助手可选择以下文本模型：
  - `gpt-5.5`
  - `gpt-5.6-sol`
  - `gpt-5.6-terra`
  - `gpt-6-astra`
  - `gpt-6-sol`
- 修复 Cangyuan SSE 流式响应解析，支持 `delta.content` 拼接。
- AI 请求默认超时提高到 180 秒，可由 `AI_TIMEOUT_MS` 覆盖。
- `/api/ai/models` 返回文本模型和视频模型信息。

### 视频 Provider

- 支持独立视频账号配置：`CANGYUAN_VIDEO_BASE_URL`、`CANGYUAN_VIDEO_API_KEY`。
- 视频 Key 优先于文本 Key；未配置独立视频 Key 时回退到 `CANGYUAN_API_KEY`。
- 支持 `CANGYUAN_VIDEO_MODEL`，当前配置模型为 `sd10-seedance-2.0`。
- `/api/seedance/models` 已从新视频 Key 读取到 19 个 Seedance 模型。
- 导演助手的视频面板支持选择模型、提交异步任务、查询状态和打开结果。
- 配置脚本：`imaideo-demo/configure-video.ps1`。

## 当前环境配置

根目录 `.env` 已配置真实 Key，但本日志不记录任何密钥内容。当前关键配置项为：

```env
CANGYUAN_BASE_URL=https://ai.cangyuansuanli.cn
CANGYUAN_TEXT_MODELS=gpt-5.5,gpt-5.6-sol,gpt-5.6-terra,gpt-6-astra,gpt-6-sol
CANGYUAN_TEXT_MODEL=gpt-5.5
CANGYUAN_VIDEO_BASE_URL=https://ai.cangyuansuanli.cn
CANGYUAN_VIDEO_API_KEY=（已配置，密钥不记录）
CANGYUAN_VIDEO_MODEL=sd10-seedance-2.0
AI_PROVIDER=openai-compatible
```

不要把 `.env`、API Key 或视频任务中的敏感信息提交到 Git 或粘贴到聊天中。

## 编剧流程验证

曾用创意“云山邮局收到一封来自未来的信，年轻邮差阿遥必须在日落前找到收信人，否则小镇将失去一段被遗忘的记忆”验证完整编剧链路。故事策划、人物设定、故事大纲、单集剧本、连续性记录和剧本检查均已通过真实 Provider 请求验证；测试期间分别使用了多个可用文本模型。

当前浏览器项目“山的另一边”已完成：

- 六场单集剧本，合计 60 秒。
- 编剧资料补齐并确认版本 v2。
- 5 份云山邮局资产锁定。
- 6 个镜头完成分镜对应，镜头总时长 60 秒。
- 6 个视频提示词已按现有剧本生成并通过本地制作检查。

该项目的六个镜头为：云海来信、四十年前、越过云山、信的重量、终于抵达、新的启程。

## 已提交的视频任务

项目：`p-draft`（山的另一边）  
模型：`sd10-seedance-2.0`  
提交数量：6 个镜头  
提交时间：2026-09-29

任务 ID：

1. 云海来信：`task_noxrYUw4CQ5VPFwpCOIwQhFVbu2xZARc`
2. 四十年前：`task_aqHjfiY4sKiqtlzhEnS6sPOgoH1cIw5l`
3. 越过云山：`task_iLPOtRqoXdd7Qvpq1EriYOYD14EMlJ2u`
4. 信的重量：`task_P7gxNAKdzDeeFEC1PbtZGRtmIOMI2uHe`
5. 终于抵达：`task_N3ZX1jBgZBFmVh96R8Ai6ZDG1EFmdEd5`
6. 新的启程：`task_zI39ZSMC0ZnIt3HBwDqSt1oJ7ob2Qp8i`

最后一次可靠查询时，6 个任务均为 `queued`，没有确认到视频 URL。任务清单另存于：`imaideo-demo/video-tasks-p-draft.json`。后续应继续查询任务状态，不要重复提交，避免重复扣费。

## 验证记录

- `npm test -- --run`：4 个测试文件、41 个测试全部通过。
- `npm run build`：Vite 生产构建成功。
- 文本模型 `/api/ai/models`：5 个文本模型均可读取。
- 视频模型 `/api/seedance/models`：新视频 Key 可读取 19 个 Seedance 模型。
- 视频 `/api/seedance/status`：独立视频 Key 已生效。
- 未自动提交支付、签约、发布或其他真实交易操作。

## 当前待办

1. 查询 `video-tasks-p-draft.json` 中 6 个任务，记录完成、失败或仍排队状态。
2. 视频完成后，将结果写回项目 `p-draft` 的对应镜头，并在导演助手中选择结果。
3. 逐镜检查角色一致性、资产引用、对白、声音、转场和画面质量。
4. 如全部镜头完成，再进入作品投稿；投稿会产生本地演示版本快照。
5. 后续接入真实服务时补齐任务取消、重试、媒体存储、账号鉴权、用量统计和费用控制。

## 运行方式

在 `imaideo-demo` 目录：

```powershell
npm run api
npm run dev
```

网站：`http://127.0.0.1:4173/`  
API 代理：`http://127.0.0.1:8787/`

