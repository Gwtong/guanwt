# 管PM 部署清单

## ✅ 已完成的准备

- [x] 后端代码支持环境变量 `DEEPSEEK_API_KEY`
- [x] 后端端口支持动态配置（`process.env.PORT || 3001`）
- [x] 创建 `railway.json` 配置文件
- [x] 创建 `Procfile` 部署脚本
- [x] 写详细的部署说明文档 `DEPLOY.md`
- [x] 前端已配置演示模式后备（后端不可达时自动切换）
- [x] 代码已提交到 Git

## 🔧 你需要做的（5分钟）

### 第1步：推送代码到 GitHub

如果你还没推送到 GitHub：

```bash
cd D:\WorkBuddy_Data\2026-08-18-20-36-53\jd-community-quick-response
git init
git add .
git commit -m "Initial commit"
# 然后在 GitHub 创建一个新仓库，按 GitHub 的提示推送
```

如果已经推送过，执行：

```bash
git push origin main
```

### 第2步：注册 Railway

1. 打开 https://railway.app
2. 点击 "Sign Up"，用 GitHub 账号登录

### 第3步：创建项目

1. 点击 "New Project" → "Deploy from GitHub repo"
2. 选择本项目的仓库
3. 等待自动检测（Railway 会识别 Node.js 项目）
4. 点击 "Deploy"

### 第4步：配置环境变量（可选）

在 Railway 项目页面点击 "Variables"，可以添加：

| 环境变量 | 值 | 说明 |
|---------|-----|------|
| `DEEPSEEK_API_KEY` | 你的密钥 | 不填则用规则引擎替身 |

### 第5步：等待部署完成

部署需要 1-2 分钟，完成后会显示访问链接。

## 🎯 部署完成后的链接

示例链接（你的会不同）：
```
https://your-project-name.up.railway.app
```

## 📋 演示前的检查清单

- [ ] 打开链接，确认页面能正常加载
- [ ] 点击"开始"回放，确认日志流动
- [ ] 切换到"需求池"、"响应记录"，确认有数据
- [ ] 切换到"配置"，确认能调整参数
- [ ] 如果Railway休眠，先点开链接等1-2分钟唤醒

## 🎤 面试演示流程

1. **打开链接** → 展示前端界面
2. **点击"开始"回放** → 展示实时日志、十步链路
3. **切换到"需求池"** → 展示解析出的结构化需求
4. **切换到"响应记录"** → 展示已响应的订单
5. **切换到"配置"** → 展示参数可调（改 tau）
6. **打开GitHub仓库** → 展示项目结构、技术栈
7. **说明亮点**：前后端分离、十步链路、受控同步、可回滚

## 🚨 常见问题

| 问题 | 解决方案 |
|------|---------|
| Railway 休眠 | 演示前先 ping 一下链接，等 1-2 分钟 |
| 前端报错 | 检查后端是否正常运行，点 Railway 的 "View Logs" |
| 没数据 | Mock 数据已内置，启动时自动加载 |
| 想换真AI | 在 Railway "Variables" 里添加 `DEEPSEEK_API_KEY` |

## 💡 技术亮点话术

### 架构
"前端 React + Vite，后端 Node.js + Express，通过 REST API 通信。数据流是：消息接入→前置过滤→会话聚合窗→BERT判定（或规则引擎替身）→DeepSeek解析→去重频控→分流决策→商品获取→响应执行→数据回流。"

### 技术栈
"前端 React + Vite，后端 Node.js + Express，AI 用 DeepSeek（演示用规则引擎替身），数据存储用内存（可扩展为 Redis）。"

### 亮点
1. **前后端分离**：前端 React，后端 Express，API 通信
2. **十步链路**：完整消息处理管线，参数可配置
3. **受控同步**：SSOT.md 单一事实来源，改一处同步三处，CHANGELOG 留痕
4. **可回滚**：Git 版本控制，出问题能快速找回
5. **演示稳定**：Railway 托管，免费额度足够用

## 📊 成本说明

Railway 免费额度：$5/月
- 演示用量：几乎不花钱
- 真正上生产：根据用量付费，比传统服务器便宜

## 🎁 额外福利

- 部署说明文档：`DEPLOY.md`
- 演示模式后备：即使后端不可达，前端也能正常工作
- 完整的受控同步机制：`sync.js` + `CHANGELOG.md`

## 📞 需要帮助？

如果部署时遇到问题，检查：

1. Railway 的 "Logs" 页面看错误信息
2. 确认 `Procfile` 路径正确
3. 确认 `railway.json` 配置正确

或者直接问我，我帮你排查。