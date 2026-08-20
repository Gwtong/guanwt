# PRD-F07 — 去重频控与艾特矩阵分流


> 权威定义（编号/参数/指标）：[SSOT.md](../SSOT.md) · 变更留痕：[CHANGELOG.md](../CHANGELOG.md)

> 子 PRD（AI Coding 流程 ⑦）。服务业务需求 **R-07**，功能点 **F-07**（对应第二课十步 ⑥去重频控 + ⑦分流决策）
> 正向引用：[BRD.md](../BRD.md) §3.5 · 反向收录：[PRD-主.md](PRD-主.md) §1/§2
> 引用：[schema/demand.md](../schema/demand.md)、[schema/config.md](../schema/config.md)

## 1. 目标
控制响应频率与观感，**护住群氛围与隐私**——这是 BRD 风险"识别翻车/隐私引发退群"的对治，也是"能否直接发"的判定核心。

## 2. 输入
- `demand`：`fingerprint = 群ID:品类`、`group`、`at`、`status`

## 3. 处理逻辑与规则
### 3.1 去重（⑥）
- 指纹 `fingerprint = 群ID:归一化品类`。
- `dedup_window`（默认 24h）内同指纹只算一次：命中则 `heat+1`、更新 `lastSeenAt`，**已 responded 不重复触发**。

### 3.2 频控（⑥）
- 非艾特响应每群每日 ≤ `n_freq`（默认 3）次；**艾特响应不占额度**（用户主动呼叫，应即时响应）。
- 超限 → `demand.status = queued`（排队），不立即响应。

### 3.3 分流决策 · 艾特矩阵（⑦）
确定性规则（无需 AI），由消息元数据 `at` + 相关性 `relevant` 决定：

| at | relevant | outlet | 机器人是否主动接话 |
|---|---|---|---|
| ✓ | ✓ | `robot_push` | **是（唯一直接发）** |
| ✓ | ✗ | `push_owner` | 否（转群主） |
| ✗ | ✓ | `triple` | 否（三路并行） |
| ✗ | ✗ | `discard` | 否（丢弃） |

- **隐私底线**：只要无人艾特，机器人**绝不主动在群里接话**——用户无感知，变的只是"下次发什么"（排期替换）。

## 4. 输出
- `routeDecision = { outlet, urgency, reason }` → 送 F-06 执行。
- `demand.status`：`pending / responded / queued / expired`。

## 5. 异常与边界
- 频控拦截 → `queued`，非错误。
- 去重窗口边界：临界时刻的需求归属按 `firstSeenAt` 判定。

## 6. 验收标准（先于代码）
- 正常：同群同类 24h 内合并（heat 累加）；非艾特超 3 次 → `queued`。
- 边界：艾特响应不计入频控额度。
- 异常：艾特矩阵四格与 [schema/response.md](../schema/response.md) 的 `outlet` 值一一对应。

## 7. 对应模块 / 数据
- `webapp/server/lib/dedup.js`（去重/频控）、`webapp/server/lib/router.js`（艾特矩阵）
- 配置项：[schema/config.md](../schema/config.md) 的 `n_freq / dedup_window / at_switch / tau`
- 前端：`client/src/components/ConfigPage.jsx`（阈值/频控可调）、`DemandPoolPage.jsx`（状态/艾特列）
