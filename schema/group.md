# schema/group.md — 群信息表（群主维度主数据）

> 锁定文件（AI Coding 流程 ④）。来源：`webapp/server/data/groups.json`
> 被消费于：PRD-F01（试点群圈选与 A/B 分组）、PRD-F02（消息接入，按 group 关联）
> 被索引于：`PRD/PRD-主.md` · 关联：`deps/robot-systems.md`

## 字段锁定

| 字段 | 类型 | 口径 / 说明 | 示例 |
|---|---|---|---|
| `id` | string | 群唯一 ID，主键 | `G001` |
| `name` | string | 群名称（展示用） | 幸福里小区邻居群 |
| `size` | int | 群人数，用于计算群点击活跃率分母 | 213 |
| `layer` | enum | 群活跃分层：`活跃群` / `成长群` / `衰退群`（§2.3 定义） | 活跃群 |
| `utype` | enum | 用户类型：`成熟用户群` / `新用户群` / `召回用户群` | 成熟用户群 |
| `arm` | enum | A/B 分组：`实验组`（treatment）/ `对照组`（control） | 实验组 |

## 约束
- `arm` 两组的 `layer` / `utype` 分布须可比，否则显著性检验失效（F-01 验收项）。
- 仅 `whitelist`（见 `schema/config.md`）内的群进入回放/处理；白名单外的群消息直接丢弃（F-02 前置）。
- `size` 为活跃率分母，须与机器人回传的群人数一致，禁止手工涂改。

## 与第二课关系
群主为 C 端个人，非京东运营人员；京东侧只读回传数据，不运营群（"零运营"本质，见 agents.md §0）。
