# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源（avatar-*.jpeg 为 AI 生成的女友情绪头像）
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   └── api/            # 后端接口（game/ 游戏，blog/ 博客，auth/ 认证）
│   ├── components/game/    # 游戏组件
│   ├── components/blog/    # 博客组件（恋爱话术研究所）
│   ├── components/auth/    # 认证组件（登录/注册一体页）
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── lib/auth/           # 会话签名工具（session.ts）
│   ├── lib/game/           # 游戏核心库
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── storage/database/   # PostgreSQL 连接模块（pg-client.ts）与 schema（shared/schema.ts）
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

## 开发规范

- 默认按 TypeScript `strict` 心智写代码；禁止隐式 `any` 和 `as any`，清理未使用的变量和导入。
- next.config 路径必须用 path.resolve / import.meta.dirname / process.cwd() 动态拼接。
- Hydration 防范：禁止在 JSX 渲染逻辑中直接用 typeof window、Date.now()、Math.random()；localStorage 读取放 useEffect。禁止非法 HTML 嵌套。
- 禁止使用 head 标签，用 metadata / viewport 导出；三方 CSS 在 globals.css 顶部 @import。

## 本项目业务结构（哄哄模拟器）

网页小游戏：女友生气（愤怒值 50 起步），玩家在多轮对话中选回应，选对 -10、普通错 +10、核级雷区 +20；降到 0 和好（毕业考通过才归零）、升到 100 分手。连续答对 2 次触发意外事件攒好感度（独立累计，决定和好结局评级：≥20 甜甜蜜蜜 / 否则勉强原谅）。

### 后端接口（全部 SSE 流式，`data: {"content"}` + `data: [DONE]`，出错 `data: {"error"}`）

- `POST /api/game/start`：入参 `{ scenarioId }`。流式输出场景铺垫+她的开场白，末尾 `<<<DATA>>>` + JSON `{options: [3 个选项]}`。
- `POST /api/game/choose`：入参 `{ scenarioId, anger, round, isExam, choice, history }`。流式输出她的反应，末尾 `<<<DATA>>>` + JSON `{correct, delta(-10/10/20), annotation(教学批注/考试轮为空), options(下轮 3 选项或 null)}`。
- `POST /api/game/event`：入参 `{ scenarioId, anger, history }`。流式输出事件描述，末尾 `<<<DATA>>>` + JSON `{options: [{text, delta, result}]}`（2 个行动，+10/+5 好感）。
- `POST /api/game/speak`：入参 `{ text, mood }`。TTS 语音合成（音色 `zh_female_meilinvyou_saturn_bigtts`，语速随 mood 映射到 `speech_rate`），返回 `{ audioUri }` 供前端直接播放。直连豆包语音合成大模型 2.0（新版 V3 接口 `openspeech.bytedance.com/api/v3/tts/unidirectional`，鉴权头 `X-Api-Key` 读 `.env.local` 的 `TTS_API_KEY` + `X-Api-Resource-Id: seed-tts-2.0`）；响应为 NDJSON 分片，路由内逐行拼接 base64。**不再使用**旧版 `Bearer; token` + APP ID 方式（控制台已下线 Access Token 入口）。未配置 key 时接口报错，前端语音静默降级（不影响文字游戏）。

### 游戏记录接口（/api/game/records/）

- `POST /api/game/records`：入参 `{ scenario(场景名), finalScore(最终好感度), result("通关"|"失败") }`。**必须登录**：user_id 取自服务端会话（前端不可伪造），未登录 401；已登录写入 game_records 返回 `{ record }`。
- `GET /api/game/records`：当前登录用户的记录列表（played_at 倒序，limit 100），未登录 401。
- 前端流程（game-app.tsx handleEnd）：一局结束 → 已登录自动 POST 保存并 toast"您的游戏记录已经保存"；未登录 toast"登录后可保存你的游戏记录"；保存失败静默降级不打断结算。
- 个人页：`profile-screen.tsx`（首页底部 tabbar"我"进入）——已登录显示用户信息卡+记录列表，未登录显示登录/注册引导。

### 认证接口（/api/auth/，用户名密码自建认证）

- `POST /api/auth/register`：入参 `{ username, password }`。校验（用户名 2~20 位中文/字母/数字/下划线，密码 6~50 位）→ bcrypt(10) 哈希入库 → 设会话 cookie 自动登录，返回 `{ user }`；用户名已存在返回 409。
- `POST /api/auth/login`：入参同上。bcrypt.compare 校验，成功设 cookie 返回 `{ user }`；用户不存在与密码错误**统一返回** 401"用户名或密码不正确"（防枚举）。
- `GET /api/auth/me`：读 cookie 验签 + 回库确认用户存在，返回 `{ user }` 或 401 `{ error: "未登录" }`。
- `POST /api/auth/logout`：清除会话 cookie，返回 `{ ok: true }`。

会话机制：`src/lib/auth/session.ts` 签发 `userId.username.expiry.hmac` 四段 token（HMAC-SHA256，密钥为环境变量 `COZE_SUPABASE_SERVICE_ROLE_KEY`（仅作 HMAC 密钥使用），timingSafeEqual 防时序攻击），7 天有效期，存 httpOnly cookie `honhong_session`。**禁止明文存密码、禁止用 localStorage 存会话**。

前端门禁（game-app.tsx）：挂载先 fetch /api/auth/me，未登录**也可浏览首页/博客**（首页顶栏显示"登录/注册"按钮），点"开始哄她"时引导进入 `auth-screen.tsx`（登录/注册 tab 一体页，支持 initialTab 指定初始 tab、onBack 返回首页）；已登录首页顶栏显示用户名+"退出"按钮。首页另有排行榜入口（`ranking-screen.tsx`，前 20 名，公开可看）。

### 博客接口（/api/blog/，数据库驱动）

- `GET /api/blog/posts`：文章列表（id/title/summary/created_at，按 created_at 倒序，limit 50），返回 `{ posts }`。
- `GET /api/blog/posts/[id]`：文章详情（含 markdown 正文 content），不存在返回 404 `{error}`。
- `POST /api/blog/generate`：后台功能。入参可选 `{ topic? }`，LLM 生成一篇恋爱沟通技巧文章（JSON：title/summary/content，正文 markdown 800~1200 字），写入 blog_posts 表后返回 `{ post }`。**LLM 输出常含裸换行等控制字符，parseArticle 里有 escapeControlCharsInStrings 容错转义，勿删。**

### 数据库（PostgreSQL 直连）

- 连接模块：`src/storage/database/pg-client.ts`，基于 `pg` 连接池（globalThis 单例），读取 `.env.local` 的 `DATABASE_URL`（含 `sslmode=require`）。所有 SQL 走参数化查询，出错直接抛异常由路由 catch。
- 表 `blog_posts`：id serial 主键 / title varchar(200) / summary varchar(500) / content text / created_at timestamptz 默认 now()（有索引）。
- 表 `users`：id serial 主键 / username varchar(20) 唯一（有索引）/ password varchar(100)（bcrypt 哈希）/ created_at timestamptz 默认 now()。
- 表 `game_records`：id serial 主键 / user_id integer 外键关联 users.id（有索引）/ scenario varchar(100) 场景名 / final_score integer 最终好感度 / result varchar(10)（"通关"|"失败"）/ played_at timestamptz 默认 now()。
- 视图 `leaderboard`：每用户取最高 final_score 一条，按分数降序/时间升序。
- CRUD 全部走 `pg-client.ts` 的 `query<T>(text, params)`（禁止 ORM）；字段名 snake_case；`RETURNING` 子句获取插入后的行。
- 会话签名密钥仍读 `COZE_SUPABASE_SERVICE_ROLE_KEY` 环境变量（仅作 HMAC 密钥，不再用于 Supabase API 调用）。
- 表结构变更流程：直接在数据库执行 DDL 后，同步更新 `src/storage/database/shared/schema.ts` 和本文件。

### 关键文件

- `src/lib/game/scenarios.ts`：6 个场景元数据（id/标题/preview(会话列表预览=她最后一条消息)/time(深夜时间)/初始愤怒/难度/给 LLM 的 brief，brief 必须含"合理可理解的生气原因"）。
- `src/lib/game/prompts.ts`：三个接口的 Prompt 构建器 + `DATA_MARKER` 常量 + `HistoryItem` 类型。内容红线写死在 COMMON_RULES（中文口语 / 愤怒有合理原因 / 正确方向=真诚沟通 / 禁 PUA / 禁性别刻板印象）。**改输出格式必须同步改 `client-stream.ts` 的解析。**
- `src/lib/game/llm-stream.ts`：方舟 LLM 客户端（直连火山方舟 OpenAI 兼容接口 `ark.cn-beijing.volces.com/api/v3/chat/completions`）。`streamLLMResponse` 为 SSE 透传助手（仅透传 `delta.content`），`invokeLLM` 为非流式调用（博客生成用）。模型读 `ARK_MODEL` 环境变量，默认 `kimi-k3-1-pro-261024`；密钥读 `ARK_API_KEY`；固定 `temperature: 0.6`（Kimi 在方舟仅允许 0.6）并 `thinking: disabled`（降延迟）。模型需在方舟控制台「开通管理」开通，否则报 `ModelNotOpen`。
- `src/lib/game/client-stream.ts`：前端 SSE 读取 + `<<<DATA>>>` 分割解析。
- `src/lib/game/storage.ts`：localStorage 进度（解锁数 + 每关战绩）。
- `src/lib/game/share-card.ts`：canvas 生成 750x1000 结局分享卡并下载。
- `src/lib/game/voice.ts`：前端语音播放（`speakText(text, mood, { onStart, onEnd })` 调 /api/game/speak 后播放并联动语音条动画，`stopVoice` 停止并触发 onEnd；播放失败静默降级）。
- `src/components/game/`：`game-app.tsx`（五屏状态机 home/play/result/blog/post）、`home-screen.tsx`（微信消息列表式首页：场景=会话，未读红点/锁定/已和好爱心；底部 tabbar"发现"进入博客）、`play-screen.tsx`（微信会话页主界面，唯一游戏逻辑组件；顶栏微信化"对方正在输入…"+紧凑 HUD，她的消息=文字气泡+语音条，我的气泡微信绿）、`anger-meter.tsx`（moodOfAnger 情绪档位 + 紧凑 HUD）、`event-modal.tsx`、`result-screen.tsx`（结局+分享卡）。
- `src/components/blog/`：`blog-screen.tsx`（恋爱话术研究所：文章列表 + "让 AI 写一篇"入口，生成约 20 秒）、`post-screen.tsx`（公众号式文章排版，react-markdown 渲染 + 自定义组件样式）、`types.ts`（BlogPost/BlogPostMeta + formatPostDate）。
- 排行榜：`ranking-screen.tsx`（前 20 名、前三金银铜徽章、当前用户高亮"我"标记，公开可看）+ `GET /api/game/leaderboard`（读 `leaderboard` 视图：每用户取最高 final_score 一条，按分数降序/时间升序）。首页入口卡已内置。

### 游戏状态规则（前端权威，play-screen.tsx）

- 毕业考触发：回合开始时愤怒值 ≤ 30 → 该轮为毕业考（无批注）；毕业考答对 → 愤怒值直接归零和好；答错照常 +10/+20。
- 教学轮愤怒值下限 10（只有毕业考能归零）；≥100 分手。
- 连对 2 次 → 调 /api/game/event，事件加载失败静默跳过不打断游戏。
- 女友头像随愤怒值切换：50-69 sulking / 70-89 furious / ≥90 cold / 和好 happy。

设计规范见 `DESIGN.md`（深夜微信聊天窗口意象，暖米白+玫瑰红，禁粉色泛滥/科技蓝紫渐变/深色模式）。
