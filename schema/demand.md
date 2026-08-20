# schema/demand.md — 需求对象（运行时，去重后产出）

> 锁定文件（AI Coding 流程 ④）。来源：`webapp/server/lib/dedup.js` 的 `createDemand`，存于 `state.demands`
> 被消费于：PRD-F04（解析产出）→ PRD-F06（响应执行）、PRD-F07（频控/分流）、需求池页展示
> 被索引于：`PRD/PRD-主.md` · 关联：`schema/message.md`（原话溯源）、`schema/product.md`（品类同词表）

## 字段锁定

| 字段 | 类型 | 口径 / 说明 | 示例 |
|---|---|---|---|
| `id` | string | 需求唯一 ID | `D<时间戳><随机>` |
| `fingerprint` | string | 去重指纹 = `群ID:归一化品类` | `G001:枣` |
| `group` | string | 群 ID | G001 |
| `user` | string | 发言人 | 王姐 |
| `originalText` | string | 聚合后的原话（多句拼接） | 有没有枣子 便宜点的 |
| `category` | string | 归一化品类（与 `product.cat` 同词表） | 枣 |
| `keywords` | array | 解析出的关键词 | ["枣","便宜"] |
| `intent` | enum | `want_buy` 想买 / `ask_rec` 求推荐 / `compare` 比价 / `complain` 吐槽 | ask_rec |
| `price_pref` | string? | 价格意向文本（可空） | 便宜点的 |
| `at` | bool | 是否艾特机器人（来自消息元数据） | false |
| `heat` | int | 热度：同指纹需求累计计数（去重累加） | 3 |
| `status` | enum | `pending` 待响应 / `responded` 已响应 / `queued` 排队中 / `expired` 已过期 | pending |
| `firstSeenAt` / `lastSeenAt` | int(ms) | 首次/最近出现真实时间戳，用于去重窗口 | — |
| `virtualTime` | int | 产出自虚拟时间戳（秒） | 58 |
| `pushedSkus` | array | 已推 SKU 列表，用于推荐排除 | ["S001"] |

## 约束
- `intent = complain` 的需求在 PRD-F04 解析层直接出局，不进入需求池（吐槽不是购买需求）。
- `fingerprint` 是去重唯一键（PRD-F07）：24h 窗口内同指纹只算一次热度，已响应不重复触发。
- `status = queued` 仅由频控拦截产生（PRD-F07）：非艾特超每日上限时排队，不立即响应。
