# imaideo

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
User-approved React, TypeScript and Vite. Independent local demo; browser IndexedDB; no production API or database access.

## Users
Creators browsing worlds and public finished-film commissions; rights holders publishing assets and reviewing submissions; prospective commercial partners viewing a guided demo.

## Product Purpose
Make an expandable IP resource library the first product experience: creators browse familiar worlds, choose an IP, then move into reusable assets, explicit creative boundaries, AI-assisted production, and rights-holder review.

## Capabilities and Constraints
Five-step studio plus a free spatial canvas sharing the same project data. Demo identity switch. Immutable submitted versions. Local persistence and reset. AI output is preauthored and labelled; preview is an animatic, not generated video. No payment, contracts, production accounts or deployment to existing site in this delivery.

## Brand Commitments
imaideo identity. User-approved Vimo black/gray visual system, white primary buttons and LibTV sidebar/media-card structure. Cyan reserved for interaction. Chinese-first content, desktop production and mobile browsing/review.

## Evidence on Hand
The home demo catalog contains 24 local IP entries across childhood classics, Chinese animation, game worlds, and international IP. They are presentation data with abstract covers; only three original demonstration worlds have complete creation flows. Classic and commercial names are not connected to external rights or assets. Original concept art generated for this demonstration; source prompts recorded in ASSETS.md.

## Product Principles
IP and commissions before model selection. A creator sees the source and allowed use of each asset. A submission preserves exactly what was reviewed. Demonstration claims remain explicit and accurate.

## Integrated Skill Demonstration

The five-step studio includes a six-section writer assistant adapted from Short-Drama Factory 3.2.0 and a director assistant adapted from short-drama-director 6.9.8 Lite. Three original IPs have independent fixed scripts, storyboards and style fixtures. Confirmed writer versions and asset snapshots form the director handoff; upstream edits preserve text but invalidate downstream production readiness. Editable prompts, local checks and Markdown exports carry provenance and demonstration labels. Skill snapshots, MIT licenses and adapted templates are in skill-resources. No upstream Python validators, live models, image generation or video APIs execute in this delivery.

## 独立创作分区

- “开始创作”进入“我的项目”；左侧“我的项目”收纳“编剧助手”和“导演助手”两个子入口，项目页顶部也显示两个板块。
- “编剧助手”：选择项目，完成策划、人物、大纲、正文与连续性记录，检查并确认版本后点击“交给导演助手”。仅导出编剧资料。
- “导演助手”：只读接收已确认剧本，按资产、分镜、视频制作、投稿四个步骤继续。修改剧本需返回编剧助手；上游变更保留制作内容并提示更新。
- 左侧“画布创作”：独立自由创作的静态演示布局，不读取项目，不实现拖动、编辑、生成或草稿保存。旧项目的画布坐标和缩放字段仍保留，不再嵌入助手界面。
- 项目链接为 `#/assistants/writer/:id` 和 `#/assistants/director/:id`。旧 `#/studio/:id` 链接继续兼容，草稿进入编剧，其他状态进入导演；旧 assistant 参数仍优先决定分区。
- 编剧检查与导演检查独立保存，投稿检查仍覆盖完整链路。只读状态可浏览即时检查结果，但不能保存检查记录或修改确认版本。

当前所有生成能力仍为本地模拟；真实画布服务、文本/图像/视频服务、后端鉴权、队列、文件存储、用量统计和成本控制均留待后续接入。
