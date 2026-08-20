# PRD-F03 — 低信噪比过滤与会话聚合


> 权威定义（编号/参数/指标）：[SSOT.md](../SSOT.md) · 变更留痕：[CHANGELOG.md](../CHANGELOG.md)

> 子 PRD（AI Coding 流程 ⑦）。服务业务需求 **R-03**，功能点 **F-03**（对应第二课十步 ②前置过滤 + ③会话聚合）
> 正向引用：[BRD.md](../BRD.md) §3.2 · 反向收录：[PRD-主.md](PRD-主.md) §1/§2
> 引用：[schema/message.md](../schema/message.md)、[schema/config.md](../schema/config.md)

## 1. 目标
在送入模型前**滤掉寒暄/斗图/灌水**（控制成本，对应 BRD 五道成本之"信噪比"），并把用户**拆条发的消息按会话聚合**成一个发言单元，避免逐句误判。

## 2. 输入
- 经 F-02 准入的 `message`（`text, user, group, at, t`）

## 3. 处理逻辑与规则
### 3.1 前置过滤（②）
以下情况直接丢弃，记录 `reason`：
- 非文本消息（图片/链接/小程序占位，演示版仅文本，故以空文本或纯符号判）
- 超短消息（≤1 有效字）
- 纯表情 / 纯语气词（`收到 好的 嗯 哦 哈哈 +1` 等，规则集合见 `lib/filter.js`）

### 3.2 会话聚合窗（③）
- **以静默为界**：同一 `user+group` 连续发言，若相邻间隔 > `t_silence`（默认 60s）视为"说完了"，打包送判定。
- **艾特立即打包**：含艾特的消息不等待静默，立刻打包当前窗（用户主动呼叫，需秒级响应）。
- **硬上限**：单窗累计时长 > `t_max`（300s）强制打包。
- **上下文回溯**：打包时取 `t_lookback`（600s）内同窗上下文，供 AI 判定参考。

## 4. 输出
- 发言单元 `unit = { texts[], group, user, at }`；`packed=true` 时送 F-04 判定，`packed=false` 时等待。
- 聚合计数 `state.counters.aggregated`。

## 5. 异常与边界
- 窗口超时（静默/超上限）→ `checkTimeouts` 强制打包，不丢消息。
- 超长连续发言 → 按 `t_max` 截断为多窗。
- 纯噪声窗 → 过滤计数 `filtered++`，不入聚合。

## 6. 验收标准（先于代码）
- 正常：8 条噪声被前置过滤；"有没有" + "便宜点的枣子" 两拆条合并为一个单元。
- 边界：艾特消息立即打包（不等静默）。
- 异常：回放结束所有未关窗被 `flushRemaining` 强制打包。

## 7. 对应模块 / 数据
- `webapp/server/lib/filter.js`（前置过滤）、`webapp/server/lib/aggregator.js`（聚合窗）
- 配置项：`schema/config.md` 的 `t_silence / t_max / t_lookback`
