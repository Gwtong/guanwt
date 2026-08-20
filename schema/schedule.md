# schema/schedule.md — 排期表（每群每日发品计划）

> 锁定文件（AI Coding 流程 ④）。来源：`webapp/server/data/schedule.json`
> 被消费于：PRD-F06（三出口之"排期替换"）、`lib/executor.js`
> 被索引于：`PRD/PRD-主.md` · 关联：`deps/robot-systems.md`（推送策略管理系统 ≤12 条/群/天）

## 字段锁定

| 字段 | 类型 | 口径 / 说明 | 示例 |
|---|---|---|---|
| `group_id` | string | 群 ID，外键 → `schema/group.md` | `G001` |
| `slot` | string | 发品时点 `HH:MM`，每天 ≤12 条 | `09:00` |
| `product_id` | string | 原计划品 SKU，外键 → `schema/product.md` | `S005` |
| `product_name` | string | 原计划品名（展示） | 维达 抽纸 24包整箱 |
| `status` | enum | `pending`（待执行）/ `replaced`（已被需求替换） | pending |

## 替换记录（运行时，见 `schema/response.md`）
非艾特需求命中时，将 `pending` 行的 `product_id/product_name` 改写为推荐品，`status` 置 `replaced`，并在 `state.scheduleReplacements` 留痕（原品→新品）。

## 约束
- 替换而非追加：发品节奏（条数/时点）不变，变的只是"发什么"——用户视角仍是一次正常发品（PRD-F07 隐私底线）。
- `slot` 数量不得突破每群每天 ≤12 条上限。
