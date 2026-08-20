# PRD-F01 — 试点群圈选与 A/B 分组


> 权威定义（编号/参数/指标）：[SSOT.md](../SSOT.md) · 变更留痕：[CHANGELOG.md](../CHANGELOG.md)

> 子 PRD（AI Coding 流程 ⑦）。服务业务需求 **R-01**，功能点 **F-01**
> 正向引用：[BRD.md](../BRD.md) §2.3/§4.4 · 反向收录：[PRD-主.md](PRD-主.md) §1
> 引用：[schema/group.md](../schema/group.md)、[schema/config.md](../schema/config.md)、[deps/robot-systems.md](../deps/robot-systems.md)

## 1. 目标
从运营群中圈选 **treatment（实验组）/ control（对照组）** 两组，保证两组在群活跃分层（`layer`）与用户类型（`utype`）上可比，使后续群点击活跃率的差异可归因于"快速响应"而非人群偏差，支撑显著性检验（R-08）。

## 2. 输入
- `data/groups.json`：`id, name, size, layer, utype`（见 [schema/group.md](../schema/group.md)）
- `state.config.whitelist`：进入处理的群白名单（见 [schema/config.md](../schema/config.md)）

## 3. 处理逻辑与规则
1. **白名单准入**：仅 `whitelist` 内的群进入回放与处理；白名单外群的消息在 F-02 直接丢弃。
2. **分层分组**：按 `layer`（活跃/成长/衰退）× `utype`（成熟/新/召回）分层，组内随机分配 `arm ∈ {实验组, 对照组}`，保持两组各层占比一致。
3. **可比性校验**：两组 `layer`/`utype` 分布须近似（比例差 < 阈值），否则重分或告警。
4. **A/B 切换**：策略配置页可一键在实验/对照间平移某群，实时维持 1:1 平衡（演示版能力，见 `client/DemandPoolPage`）。

## 4. 输出
- 每个群的 `arm` 字段：`实验组` / `对照组`（存于 `state.groups`）。
- 分组分布摘要：供 F-08 看板与显著性检验使用。

## 5. 异常与边界
- 白名单为空 → 禁止启动回放（无处理对象）。
- 分组严重失衡 → 标记 `unbalanced`，F-08 显著性结论无效。
- `size` 为活跃率分母，须与机器人回传人数一致，禁止手工涂改。

## 6. 验收标准（先于代码，见 tests/）
- 正常：两组 `layer`/`utype` 分布可比（卡方 p>0.05 或比例差 <5%）。
- 边界：白名单含 1 个群时仍可分到单组且不报错。
- 异常：白名单为空时启动回放被拒。

## 7. 对应模块 / 数据
- `webapp/server/data/groups.json`、`webapp/server/state.js`（groups + whitelist）
- 前端分组切换：`client/src/components/DemandPoolPage.jsx`
