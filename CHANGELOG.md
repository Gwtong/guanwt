# CHANGELOG.md — 变更日志

> 每次改动都记一笔，保证迭代**可追溯、不杂糅**。
> 格式：日期 → 改了什么 → 为什么 → 影响了哪些文件。
> 配合 `SSOT.md`（权威定义）与 `agents.md` §2 双向引用铁律使用。
>
> **新改动记在顶部**（倒序）。改了 SSOT 里的定义，也必须在此留痕。

---

## [2026-08-24] 新增 Cloudflare 部署版（Worker + Assets，单目标部署）
- **改了什么**：在不改动既有 Railway 版本的前提下，新增一套可部署到 Cloudflare 的版本，复用同一套业务逻辑（`webapp/server/lib/*`、`state.js`、`data/*.json`）。
  - 用 **Cloudflare Worker + Assets** 单目标部署（一条 `wrangler deploy` 同时托管前端 SPA 与 API），替代原 Express 服务器层。
  - `cloudflare/src/worker.js`：用 Hono 重写 HTTP 层，逐端点 1:1 移植 `webapp/server/index.js` 的全部 `/api/*` 路由（回放/接入/需求池/纠错/配置/看板/运营登录）；5 个数据文件由打包期内联 `import` 代替 `fs.readFileSync`（边缘运行时无 fs）。
  - 边缘回放推进改为「按墙钟时间 + 轮询驱动」（`edgeAdvance()`），替代 `replay.js` 的 `setTimeout` 自调度（serverless 上响应发完即被回收，跑不住）。
  - `state.js` 增加 `process.env` 守护（`typeof process !== 'undefined'`），避免未开 nodejs_compat 时 import 阶段崩溃；对 Railway 无副作用。
- **为什么**：提供第二条可部署通道（Railway 之外），复用同一份业务代码保证两版本逻辑一致、不杂糅。
- **影响文件**：`cloudflare/wrangler.toml`(新)、`cloudflare/package.json`(新)、`cloudflare/src/worker.js`(新)、`cloudflare/scripts/verify.mjs`(新)、`cloudflare/.gitignore`(新)、`webapp/server/state.js`(守护)。
- **验证**：`node scripts/verify.mjs` 用 esbuild 打包 + Hono `app.request()` 内存跑通 11 项端点（100 组 / 113 商品 / 73 种子需求 / 试点 +12.8% p=0.0049 显著 / ingest 推送·拦截 / 纠错 PATCH / 配置掩码）；`wrangler deploy --dry-run` 构建通过（185.82 KiB / gzip 41.21 KiB）。
- **部署（需你本机执行，Agent 环境无 Cloudflare Token 且 github.com 被挡）**：在 `cloudflare/` 下 `npm install` → `npx wrangler deploy`（可选在 Cloudflare 控制台设 `OPS_PASSWORD`/`DEEPSEEK_API_KEY`/`DIFY_KEY`）。也可连 GitHub 仓库到 Cloudflare Pages 自动部署。
- **已知边界**：Worker 无持久化，状态为内存态 + 首启种子（与 Railway 一致）；冷启动会重置，演示数据始终由 seed 保证首屏有数。需跨实例持久化可加 KV / Durable Objects。

## [2026-08-21] 功能对标补全（F-01~F-29 收口）

- **改了什么**：对照腾讯文档「项目实现工作区」F-01~F-29 逐项收口，补齐群分组 A/B 实验、运营后台登录鉴权、需求池纠错、试点效果看板。
  - 群分组扩到 100 组（实验组/对照组 50/50，分层与用户类型分布一致），新增 `server/data/group_metric_baseline.json` 作为显著性检验基线（`scripts/gen-mock.mjs` 生成）。
  - 新增 `/api/dashboard` 返回 `pilot`：`computePilot()` 按臂统计识别量/响应率/采用率/基线率/在线率，做两比例 z 检验输出 `liftPct`、`pValue`、`significant`。
  - 新增运营后台登录（`OPS_PASSWORD` 环境变量门控，未设置则保持开放、便于演示）：`/api/ops/login|logout|auth-status` + 中间件鉴权（`x-ops-token`），公开接口 `/api/ingest*`、`/api/control` 免登录。
  - 需求池新增「纠错」弹窗，写 `corrected_intent`/`corrected_category`/`note`（`api.updateDemand`），行内展示纠错标签并计数。
  - `lib/seed.js`：首启自动灌入可信 treatment/control 样本，保证看板首屏即有数据；`/api/replay/reset` 仍清空。
- **为什么**：使 demo 在现场展示时具备「试点显著性可证、运营可管控、数据可纠偏」的完整闭环，而非纯前端装饰。
- **影响文件**：`webapp/server/index.js`、`state.js`、`lib/seed.js`(新)、`lib/ai.js`、`lib/pipeline.js`、`lib/recommend.js`、`data/groups.json`、`data/products.json`、`data/group_metric_baseline.json`(新)、`scripts/gen-mock.mjs`(新)、`client/src/App.jsx`、`api/client.js`、`components/Sidebar.jsx`、`DashboardPage.jsx`、`DemandPoolPage.jsx`、`ProductPoolPage.jsx`(新)、`styles/main.css`、`Dockerfile`、`railway.json`、`railway.toml`(删除，合并入 railway.json)、`client/dist/*`(重建)。
- **部署**：`client/dist` 已重建并提交（不 gitignore），`git push origin main` 触发 Railway 自动部署（rootDirectory=webapp，Dockerfile 构建 server+client/dist）。

## [2026-08-20] 同步（受控）
- 来源：SSOT.md §2 策略参数当前值
- webapp/server/state.js · tau: `0.8` → `0.85`
- schema/config.md · tau: `0.80` → `0.85`
- 提交：本次同步（git log 最新一条即对应）


## [2026-08-20] 同步（受控）
- 来源：SSOT.md §2 策略参数当前值
- schema/config.md · tau: `0.85` → `0.80`
- 提交：本次同步（git log 最新一条即对应）

## [2026-08-20] 同步（受控）
- 来源：SSOT.md §2 策略参数当前值
- webapp/server/state.js · tau: `0.85` → `0.8`
- 提交：本次同步（git log 最新一条即对应）

## [2026-08-20] 同步（受控）
- 来源：SSOT.md §2 策略参数当前值
- webapp/server/state.js · whitelist: `['G001','G002','G004','G006','G008'],'G002','G004','G006','G008']` → `['G001','G002','G004','G006','G008']`
- 提交：本次同步（git log 最新一条即对应）

## [2026-08-20] 新增变更护栏（SSOT + CHANGELOG）

- **改了什么**：新增 `SSOT.md`（单一事实来源，集中编号 F/R、北极星口径、策略参数、十步链路、五页界面）；新增本文件 `CHANGELOG.md`；在 `agents.md`、`PRD/PRD-主.md`、8 份子 PRD 挂接引用指针。
- **为什么**：用户明确要求每次改动清晰、可追溯、不杂糅；反对「改一处自动全改」的无脑联动（链路长、易失控）。
- **影响文件**：`agents.md`（§1.1 清单 + §8 必读）、`PRD/PRD-主.md`（顶部引用）、`PRD/PRD-F0x.md` ×8（头部引用）、新增 `SSOT.md`、`CHANGELOG.md`。
- **机制落地**：今后改编号/参数/指标 → 只改 `SSOT.md`（或标注的源）→ 同步镜像 → 记此处。

---

## [2026-08-19] 补全文档体系（schema/deps/PRD/plan/tests）

- **改了什么**：新增 `schema/`（7 表）、`deps/`（4 依赖）、`techstack.md`、`PRD/PRD-主.md` + 8 份子 PRD、`plan.md`、`tests/索引.md`。
- **为什么**：按统一文档规范补齐，使文档「双向引用互锁」成立（校验 0 断链）。
- **影响文件**：新建 25 个 .md；`agents.md` §1.1 登记全部。

---

## [2026-08-18] 项目启动（ + 实战应用）

- **改了什么**：`BRD.md`、`agents.md`、`prototype/`（单页原型）、`demo-pc/`（PC 端演示）、`app/`（可录入数据面板）、`webapp/`（React+Express 实战应用，localhost:3001，实现十步链路 + 五页界面）。
- **为什么**：依据京东社群电商·群内需求快速响应业务立项，做出真正可跑的京东社群快速响应面板。
- **影响文件**：项目根目录全部初始文件。

---

*（未来每次改动在此顶部追加。格式同上：日期 / 改了什么 / 为什么 / 影响文件。）*
