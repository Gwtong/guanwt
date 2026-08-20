# PRD-F02 — 群消息接入与回放


> 权威定义（编号/参数/指标）：[SSOT.md](../SSOT.md) · 变更留痕：[CHANGELOG.md](../CHANGELOG.md)

> 子 PRD（AI Coding 流程 ⑦）。服务业务需求 **R-02**，功能点 **F-02**
> 正向引用：[BRD.md](../BRD.md) §1.5/§3.1 · 反向收录：[PRD-主.md](PRD-主.md) §1
> 引用：[schema/message.md](../schema/message.md)、[schema/group.md](../schema/group.md)、[schema/config.md](../schema/config.md)、[deps/robot-systems.md](../deps/robot-systems.md)

## 1. 目标
以扩展方式**复用现有机器人回传的群消息流**（不新建底层采集），作为需求识别的输入。演示版以"消息回放器"驱动：按虚拟时间戳重放 `messages.json`，支持倍速，模拟真实消息流入。

## 2. 输入
- `data/messages.json`：`{ t, group, user, text, at }`（见 [schema/message.md](../schema/message.md)）
- `state.config.whitelist`：群准入白名单

## 3. 处理逻辑与规则
1. **排序与推进**：回放器严格按 `t` 升序吐消息；倍速 `speed` 控制虚拟时间推进速率。
2. **白名单准入**：`group ∉ whitelist` → 消息丢弃，不进入管线（F-03 起）。
3. **消息顺序**：必须以 `t` 为序，禁止乱序（聚合窗依赖时间顺序）。
4. **结束 flush**：回放结束调用 `flushRemaining`，强制打包所有未关闭的会话窗，避免漏判。

## 4. 输出
- 逐条 `message` 送入 F-03 前置过滤（`lib/filter.js`）。
- 回放状态：`playing / speed / cursor / total / progress`（供前端展示）。

## 5. 异常与边界
- `group` 不在 `groups.json`（未知群）→ 丢弃并告警。
- 消息格式异常（`text` 缺失）→ 按过滤丢弃。
- 回放中途重置 → `cursor` 归零，运行时态 `state` 清空。

## 6. 验收标准（先于代码）
- 正常：23 条消息按 `t` 顺序全量处理。
- 边界：倍速 1x/5x/10x/20x 下时间推进正确。
- 异常：非白名单群消息 0 条进入管线；回放结束所有窗口被打包。

## 7. 对应模块 / 数据
- `webapp/server/lib/replay.js`（回放器）、`webapp/server/data/messages.json`
- 前端控制：`client/src/components/StreamPage.jsx`
- 真实链路映射：[deps/robot-systems.md](../deps/robot-systems.md)（机器人回传）
