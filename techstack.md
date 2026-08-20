# techstack.md — 技术栈锁定（AI Coding 流程 ⑥）

> 本文件锁定语言/框架/库/版本与部署形态，开工前必读（agents.md 哲学一·关键规则）。
> 依据：第二课 §8 演示版形态（前后端分离 Web 应用）+ 用户确认"React + Express，先本地跑通"。
> 关联：`deps/cloudflare.md`（上线部署）、`PRD/PRD-主.md`

## 选型原则
第二课说"选主流"——主流框架训练语料最充分，AI Coding 出错率最低。

## 前端
| 项 | 选择 | 说明 |
|---|---|---|
| 框架 | **React 18** | 组件化运营界面，五页 |
| 构建 | **Vite 5** | 快；`build` 输出静态文件供托管 |
| 语言 | JavaScript (JSX) | 不引 TS，降低 AI 生成噪声 |
| 样式 | 原生 CSS（单文件 `main.css`） | 企业级深色侧栏 + 顶栏，无需 UI 库 |
| 数据请求 | 原生 `fetch` 封装 `api/client.js` | 调后端 REST |

## 后端
| 项 | 选择 | 说明 |
|---|---|---|
| 运行时 | **Node.js 22** | 托管环境内置 22.22.2 |
| 框架 | **Express 5** | REST API + 静态文件托管一体 |
| 语言 | JavaScript (ESM) | `import/export` |
| AI 调用 | `node-fetch` / 原生 `fetch` | 直调 DeepSeek / Dify（见 `deps/deepseek.md`） |
| 统计 | 自实现 Welch t 检验 | 显著性检验，已用 R 官方数据集验证（见 PRD-F08） |

## 数据层（演示版）
- **Mock 三张表**：`groups.json` / `products.json` / `schedule.json`（见 `schema/`）
- **消息回放**：`messages.json` 按虚拟时间戳重放（见 `schema/message.md`、PRD-F02）
- **运行时态**：内存 `state.js`，重启重置（上线须接 KV/D1/DB，见 `deps/cloudflare.md`）

## 部署
- 本地：`webapp/server` 一体跑（localhost:3001，前端静态 + 后端 API 同源）
- 演示发布：CloudStudio 静态托管前端
- 上线：Cloudflare Pages（前端）+ Workers（后端），见 `deps/cloudflare.md`

## 禁区（不许换）
- 不引重型 UI 框架（Antd/MUI）——增加 AI 生成复杂度
- 不引 TypeScript——演示期以速度优先
- 不改现有四系统（agents.md §5）

## 目录结构（实际）
```
webapp/
├── server/            # Express 后端
│   ├── index.js       # 入口 + 路由 + 静态托管
│   ├── state.js       # 运行时态 + 配置（schema/config.md）
│   ├── data/          # Mock 三表 + 消息回放
│   └── lib/           # 十步链路：replay/filter/aggregator/ai/dedup/router/recommend/executor/pipeline
└── client/            # React 前端
    └── src/components/  # 五页：StreamPage/DemandPoolPage/ResponseRecordsPage/ConfigPage/DashboardPage
```
