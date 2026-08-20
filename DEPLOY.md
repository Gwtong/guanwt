# 管PM 部署指南

本指南帮你把"管PM"京东社群快速响应平台部署到 Railway（免费额度$5，足够演示用）。

## 前置要求

- Railway 账号：https://railway.app（免费注册）
- GitHub 账号（或 GitLab/Bitbucket）
- （可选）DeepSeek API 密钥：https://platform.deepseek.com（新用户送 500 万 tokens）

## 部署步骤（5分钟完成）

### 第1步：注册 Railway

1. 打开 https://railway.app
2. 点击 "Sign Up"，用 GitHub 账号登录
3. 进入控制面板

### 第2步：创建新项目

1. 点击左侧 "New Project"（或顶部 "+"）
2. 选择 "Deploy from GitHub repo"
3. 授权 Railway 访问你的 GitHub
4. 选择本项目的仓库

**注意：** 如果你还没有把项目推送到 GitHub，先执行：

```bash
cd D:\WorkBuddy_Data\2026-08-18-20-36-53\jd-community-quick-response
git init
git add .
git commit -m "Initial commit"
# 然后在 GitHub 创建一个新仓库，按 GitHub 的提示推送
```

### 第3步：配置构建

Railway 会自动检测到 Node.js 项目，点击 "Deploy" 即可。

如果需要手动配置：

1. 在项目页面点击 "Settings" → "Builds"
2. 确认 Root Directory 为 `webapp`（因为代码在 `webapp/` 下）
3. Build Command: `cd server && npm install`
4. Start Command: `node server/index.js`

### 第4步：配置环境变量

1. 在项目页面点击 "Variables" 标签
2. 添加以下环境变量（按需）：

| 环境变量 | 值 | 说明 | 必填 |
|---------|-----|------|------|
| `DEEPSEEK_API_KEY` | `sk-xxxxxxxxxxxxxxxxxxxxxxxx` | DeepSeek API 密钥 | 否（不填则用规则引擎替身） |
| `PORT` | `3001` | 服务端口（Railway 通常自动设置） | 否 |

**没有 DeepSeek 密钥也没关系**：系统会自动使用规则引擎替身，照样能演示完整流程。

### 第5步：等待部署完成

1. 部署需要 1-2 分钟
2. 完成后会看到类似 `https://your-project.up.railway.app` 的链接
3. 点击链接即可访问

## 访问你的应用

部署成功后，你会得到一个类似这样的链接：

```
https://your-project-name.up.railway.app
```

打开这个链接，你就能看到：
- **左侧导航**：实时日志、消息回放、需求池、响应记录、配置
- **主面板**：十步链路、效果看板

## 演示流程（面试时用）

### 1. 点击"开始"回放

- 右侧实时日志开始流动
- 十步链路计数跳动
- 需求池里的需求一条条增加

### 2. 切换到"需求池"页面

- 看到解析出的结构化需求（品类、关键词、意图、价格意向）

### 3. 切换到"响应记录"页面

- 看到已经响应过的订单

### 4. 切换到"配置"页面

- 调整参数（比如把 `tau` 从 `0.85` 改成 `0.90`）
- 点击"保存配置"

### 5. 展示代码仓库

打开 GitHub 仓库，展示项目结构：

```
jd-community-quick-response/
├── webapp/                    # React + Express 全栈应用
│   ├── client/               # React 前端
│   │   ├── src/
│   │   │   ├── components/   # 页面组件
│   │   │   └── api/          # API 客户端
│   │   └── dist/             # 构建产物
│   └── server/               # Express 后端
│       ├── lib/              # 核心逻辑
│       │   ├── pipeline.js   # 十步链路
│       │   └── ai.js         # AI 判定（DeepSeek + 规则引擎替身）
│       ├── data/             # Mock 数据
│       └── state.js          # 运行时配置
├── SSOT.md                    # 单一事实来源
├── sync.js                    # 受控同步脚本
└── CHANGELOG.md               # 变更日志
```

## 面试话术示例

**架构：**
"前端用 React + Vite，后端用 Express，数据流是：消息接入→前置过滤→会话聚合窗→BERT判定（或规则引擎替身）→DeepSeek解析→去重频控→分流决策→商品获取→响应执行→数据回流。"

**技术栈：**
"前端 React，后端 Node.js + Express，AI 用 DeepSeek（演示用规则引擎替身），数据存储用内存（支持扩展为 Redis）。"

**亮点：**
1. **前后端分离**：前端 React，后端 Express，通过 REST API 通信
2. **十步链路**：完整消息处理管线，可配置参数
3. **受控同步**：SSOT.md 作为单一事实来源，改一处同步三处，有 CHANGELOG 留痕
4. **可回滚**：Git 版本控制，出问题能快速找回
5. **演示稳定**：Railway 托管，免费额度足够用

## 常见问题

### Q: Railway 休眠了怎么办？

A: 免费版会休眠，首次请求需要 1-2 分钟唤醒。演示前先点开链接 ping 一下即可。

### Q: 演示时没数据怎么办？

A: Mock 数据已经内置在代码里（`webapp/server/data/`），启动时自动加载。

### Q: 想换成真实 AI 怎么办？

A: 在 Railway 的 "Variables" 里添加 `DEEPSEEK_API_KEY`，然后重新部署即可。

### Q: 前端页面报错怎么办？

A: 检查后端是否正常运行，点击 Railway 的 "View Logs" 看错误信息。

### Q: 如何修改 Mock 数据？

A: 编辑 `webapp/server/data/messages.json` 等文件，然后重新部署。

## 监控和日志

在 Railway 项目页面：

1. 点击 "Metrics" 查看资源使用情况
2. 点击 "Logs" 查看运行日志
3. 点击 "Deploys" 查看部署历史

## 成本

Railway 免费额度：$5/月
- 演示用量：几乎不花钱
- 真正上生产：根据用量付费，比传统服务器便宜

## 下一步

- 把链接分享给面试官
- 准备演示脚本（先点哪里、说什么）
- 如果要真上生产，考虑：
  - 换成 Redis 存储数据
  - 添加数据库（PostgreSQL）
  - 配置监控告警

## 需要帮助？

如果部署时遇到问题，检查：

1. Railway 的 "Logs" 页面看错误信息
2. 确认 `Procfile` 路径正确
3. 确认 `railway.json` 配置正确

或者直接问我，我帮你排查。