# schema/response.md — 响应对象（运行时，响应执行产出）

> 锁定文件（AI Coding 流程 ④）。来源：`webapp/server/lib/executor.js` 的 `execute`，存于 `state.responses`
> 被消费于：PRD-F06（三出口执行）、响应记录页、效果看板
> 被索引于：`PRD/PRD-主.md` · 关联：`schema/demand.md`、`schema/product.md`、`schema/schedule.md`

## 字段锁定

| 字段 | 类型 | 口径 / 说明 | 示例 |
|---|---|---|---|
| `id` | string | 响应唯一 ID | `R<时间戳><随机>` |
| `demandId` | string | 关联需求 ID → `schema/demand.md` | D... |
| `group` / `user` | string | 群 / 发言人 | G001 / 王姐 |
| `originalText` | string | 用户原话（溯源） | 有没有枣子 |
| `category` / `intent` | string/enum | 需求品类 / 意向 | 枣 / ask_rec |
| `at` | bool | 是否艾特 | false |
| `outlet` | enum | **出口**：`robot_push` 机器人即时推品 / `triple` 三路并行 / `push_owner` Push群主 / `discard` 丢弃 | robot_push |
| `product` | object | 推荐 Top-1（见 `schema/product.md` 推荐输出对象） | {sku_id, name, price, ...} |
| `candidates` | array | 推荐候选 Top-3 | [...] |
| `executedAt` | int(ms) | 执行真实时间戳 | — |
| `result` | string | 执行结果摘要 | 机器人已在群内推送：… |
| `urgency` | enum | `秒级` / `分钟级` / 空（丢弃） | 秒级 |

## 三路并行扩展字段（仅 `outlet=triple` 时存在）
- `result_pinned`：置顶到群主端选品池
- `result_push`：Push 群主（附原话）
- `result_schedule`：排期替换结果（原品→新品），见 `schema/schedule.md`

## 约束
- `outlet` 完全由 PRD-F07 艾特矩阵决定，是"能否直接发"的唯一判据：仅 `robot_push` 为机器人主动群内推品；其余出口机器人均不主动接话。
- `discard` 不产生真实发送，仅留痕。
