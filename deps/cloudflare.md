# deps/cloudflare.md — 部署与托管（Cloudflare）

> 外部依赖锁定（AI Coding 流程 ⑤）。对应：第二课 §8 演示版部署形态、PRD 部署章节
> 被消费于：整体部署（前端 Pages + 后端 Workers）、演示版托管
> 被索引于：`PRD/PRD-主.md` · 关联：`techstack.md`

## 角色
第二课明确演示版应是"前后端分离的 Web 应用，Cloudflare 部署"。Cloudflare 提供：
- **Pages**：托管前端静态产物（Vite build 输出）
- **Workers**：托管后端 API（Express 适配或 Hono 重写），天然边缘、免运维
- **Tunnel / R2**：本地联调隧道、静态资源/消息回放文件存储

## 当前状态
- 本地开发：`webapp/server`（Express，localhost:3001）同时服务前端静态文件与 API，前后端一体跑通（见 `techstack.md`）。
- 演示发布：可用 CloudStudio 静态托管前端；后端 Workers 化是上线步骤，非演示必需。

## 约束与注意
- **Key 安全**：`deepseek_key` / `dify_key` 若上 Workers，须走 Workers Secrets，禁止写进前端包或公开仓库。
- **CORS / 同源**：Pages + Workers 建议同一 `*.workers.dev` 或自定义域，避免跨域。
- **有状态数据**：本演示的内存态 `state` 重启即丢；上线须接 KV/D1 或真实数据库（见 PRD-F08 数据回流）。

## 待确认
- 是否有 Cloudflare 账号与域；Workers 的 CPU/请求配额是否满足回放峰值。
