# PRD-F06 — 触发定向响应与三出口执行


> 权威定义（编号/参数/指标）：[SSOT.md](../SSOT.md) · 变更留痕：[CHANGELOG.md](../CHANGELOG.md)

> 子 PRD（AI Coding 流程 ⑦）。服务业务需求 **R-06**，功能点 **F-06**（对应第二课十步 ⑨响应执行）
> 正向引用：[BRD.md](../BRD.md) §4.5 · 反向收录：[PRD-主.md](PRD-主.md) §1/§2
> 引用：[schema/response.md](../schema/response.md)、[schema/schedule.md](../schema/schedule.md)、[schema/product.md](../schema/product.md)、[deps/robot-systems.md](../deps/robot-systems.md)

## 1. 目标
根据 F-07 的分流决策，经既有推送策略执行定向内容（受每群每天 ≤12 条约束），**不绕过现有确认机制**。这是"能不能直接发"的最终落点。

## 2. 输入
- `demand`（含 `outlet` 由 F-07 给出）+ 推荐候选（F-05 Top-1）

## 3. 处理逻辑与规则（三出口，见 [schema/response.md](../schema/response.md) `outlet`）
| outlet | 触发条件 | 执行动作 | 时效 |
|---|---|---|---|
| `robot_push` | 艾特 + 商品相关 | 机器人**即时群内推品** | 秒级 |
| `triple` | 无艾特 + 真实需求 | 三路并行：**群主端选品池置顶 + Push 群主（附原话）+ 排期替换** | 分钟级 |
| `push_owner` | 艾特 + 商品无关 | Push 群主回复 | 秒级 |
| `discard` | 无艾特 + 商品无关 | 丢弃（仅留痕） | — |

- **排期替换**：将 `schedule` 中该群下一 `pending` 行改写为推荐品（`status=replaced`），并在 `scheduleReplacements` 留痕。**替换而非追加**——发品节奏不变，用户视角仍是一次正常发品（F-07 隐私底线）。
- **取 Top-1 推送**；记录 `demand.pushedSkus` 排除已推品。

## 4. 输出
- `response` 对象（见 [schema/response.md](../schema/response.md)）+ `scheduleReplacements` 记录。
- 执行结果文本 `result`（如"机器人已在群内推送：…"）。

## 5. 异常与边界
- 候选为空（F-05 返回空）→ `executed=false`，不发送。
- 无 `pending` 排期 → 跳过排期替换，仅置顶+Push。
- `discard` 不产生真实发送。

## 6. 验收标准（先于代码）
- 正常：艾特+相关 → `robot_push` 且秒级；无艾特+需求 → `triple` 且产生排期替换。
- 边界：`discard` 0 次发送；排期替换后原品被改写且 `status=replaced`。
- 异常：候选为空 → 响应记录标记"无候选品"，不计 `responded`。

## 7. 对应模块 / 数据
- `webapp/server/lib/executor.js`（execute）
- 约束来源：[deps/robot-systems.md](../deps/robot-systems.md)（推送策略 ≤12 条/群/天）
- 前端展示：`client/src/components/ResponseRecordsPage.jsx`
