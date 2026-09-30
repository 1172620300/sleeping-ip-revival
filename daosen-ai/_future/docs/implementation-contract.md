# 内部协作契约

根目录 `daosen-ai`。主 agent 负责 package/config、Prisma schema、Auth、通用 HTTP、Asset、Task、Provider、worker、集成。
领域 agent 负责 `src/server/domain.ts`、`prisma/seed.ts`：作品/社区/知识问答/服务申请/后台。
UI agent 负责 `src/app`（除 api）及 `src/components`、`src/lib/client.ts`、`public` 与 CSS。
测试文档 agent 负责 tests、Playwright/Vitest 配置、README、AGENTS、docs（不改本契约）、Docker 配置可由主 agent 接管。

## 通用 API
所有领域端点 `/api/platform/*`，返回 JSON 对象，不包 data；错误 `{error: string, code: string}`。
Auth.js：`signIn('credentials',{email,password,redirect:false})`；注册 `POST /api/platform/register`。
`GET /api/platform/session` -> `{user: {id,name,email,role,status,reviewNote}|null}`。
需要登录且 APPROVED 才可业务写入和私有读取；公开首页/社区/材料/知识源可匿名浏览，AI 问答和服务需审核。

领域路由导出 `domainRoute(request:Request, path:string[], user:SafeUser|null):Promise<Response|null>`，主路由在域处理前已校验跨站 Origin。使用 `db` from `./db`、`ApiError, json, body, requireUser, requireAdmin` from `./http`；`body(req,schema)` 校验 Zod；`SafeUser` from `./auth`。

## 端点与响应契约
- GET home -> `{works,news,events}`。公开 Work DTO: `{id,title,description,imageUrl,author:{id,name},prompt? (依权限),promptPublic,allowRemix,visibility,featured,createdAt,likes,bookmarks}`。
- GET works?scope=mine&sort=latest|popular|featured -> `{works}`；POST works `{title,description,prompt,promptPublic,allowRemix,visibility:'PRIVATE'|'PUBLIC',imageUrl?,assetId?,taskId?}` -> `{work}`。用户提供的 imageUrl 限定 public 内安全演示文件路径。
- GET/PATCH works/:id -> `{work}`；POST works/:id/remix -> `{referenceWorkId,imageUrl,prompt?,notice}`；POST works/:id/interaction `{type:'LIKE'|'BOOKMARK'}` -> `{active}`。
- GET/POST works/:id/comments `{content}` -> `{comments}`/`{comment}`；POST follows/:userId -> `{active}`；POST reports `{workId,reason}` -> `{report}`。
- GET knowledge?q=&category= -> `{sources}`；GET knowledge/:id -> `{source}`。
- GET chats -> `{chats}`；GET chats/:id -> `{chat:{id,title,messages:[{id,role,content,sources:[]} ]}}`；POST chat `{message,chatId?}` -> `{chatId,answer,sources}`。可用“模拟错误”输入验证错误。
- GET materials?q=&type= -> `{materials}`；GET materials/:id -> `{material}`，字段 name,type,properties,applications,constraints,caseStudy,updatedAt,imageUrl。
- POST material-requests `{materialId,kind:'CONSULTATION'|'SAMPLE',contact,purpose,notes?,idempotencyKey}` -> `{application}`。
- GET/POST lab-applications -> `{applications}`/`{application}`，POST `{product,requirements,contact,attachmentIds:[],idempotencyKey}`；GET lab-applications/:id -> `{application}`。报告以受保护 `/api/platform/assets/:id` URL 返回。
- GET/POST manufacturing -> `{projects}`/`{project}`，POST `{title,description,contact,workId?}`。
- GET profile -> `{works,bookmarks,applications,materialRequests,projects,notifications}`。
- GET admin -> `{users,works,reports,labApplications,materialRequests,projects,tasks,settings,auditLogs}`（仅 ADMIN）。PATCH admin/users/:id `{status?,role?,reviewNote}`；PATCH admin/works/:id `{featured?,visibility?}`；PATCH admin/lab/:id `{status,publicNote?,reportAssetId?}`；PATCH admin/material-requests/:id `{status,internalNote?}`；PATCH admin/manufacturing/:id `{status,publicNote?}`；PATCH admin/reports/:id `{status,resolution}`；PATCH admin/settings `{dailyTaskLimit:number}`。所有管理员 mutation 记录审计。
- POST assets multipart file + kind -> `{asset:{id,url,mimeType,size,...}}`；GET assets/:id 受保护的二进制。
- GET tasks -> `{tasks}`；POST tasks `{type:'DESIGN'|'IMAGE'|'VIDEO',input:{prompt,mode?,purpose?,appearance?,brand?,constraints?,sellingPoints?,outputKind?,assetIds?:string[],count?:number,simulateFailure?:boolean},idempotencyKey}` -> `{task}`。
- GET tasks/:id -> `{task}`；POST tasks/:id/retry -> `{task}`；POST tasks/:id/cancel -> `{task}`。Task `{id,type,provider,model,status,input,result,error,attempts,createdAt,updatedAt}`。result `{analysis?,brief?,prompt?,outputs:[{url,kind:'IMAGE'|'VIDEO',label}],mock:true}`。失败 result=null；重试 same task、attempts++。图片模拟 SVG 可下载，视频提供明确水印的可播放样例（非真实生成，若缺编码器明确失败，不以脚本代替）。

## Seed
所有 demo 密码 `Daosen@2026!`。邮箱 designer@demo.daosen.ai、store@demo.daosen.ai、staff@demo.daosen.ai、admin@demo.daosen.ai，另 bob@demo.daosen.ai、pending@demo.daosen.ai、rejected@demo.daosen.ai。用户固定 id: designer,store,staff,admin,bob,pending,rejected。
