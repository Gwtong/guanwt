# schema/message.md — 消息回放表（回放器输入）

> 锁定文件（AI Coding 流程 ④）。来源：`webapp/server/data/messages.json`
> 被消费于：PRD-F02（消息接入）、PRD-F03（前置过滤/聚合），`lib/replay.js` / `lib/filter.js` / `lib/aggregator.js`
> 被索引于：`PRD/PRD-主.md` · 关联：`deps/robot-systems.md`（真实机器人回传消息流）

## 字段锁定

| 字段 | 类型 | 口径 / 说明 | 示例 |
|---|---|---|---|
| `t` | int | 虚拟时间戳（秒），回放器按此排序与倍速推进 | 12 |
| `group` | string | 所属群 ID，外键 → `schema/group.md` | `G001` |
| `user` | string | 发言人昵称 | 王姐 |
| `text` | string | 消息文本（本演示仅文本消息） | 有没有枣子推荐下 |
| `at` | bool | 是否艾特（@）了机器人；确定性元数据，不需 AI 判断 | true |

## 约束
- `at` 是分流决策（PRD-F07 艾特矩阵）的关键输入，必须来自消息元数据，禁止从文本推断。
- 真实环境消息流由机器人回传，字段更丰富（图片/链接/小程序等）；本表为演示子集，仅文本+艾特。
- `t` 单调递增；回放器严格按 `t` 顺序吐消息，聚合窗以虚拟时间计（见 PRD-F03）。
