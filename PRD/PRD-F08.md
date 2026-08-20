# PRD-F08 — 数据回流与群点击活跃率看板


> 权威定义（编号/参数/指标）：[SSOT.md](../SSOT.md) · 变更留痕：[CHANGELOG.md](../CHANGELOG.md)

> 子 PRD（AI Coding 流程 ⑦）。服务业务需求 **R-08**，功能点 **F-08**（对应第二课十步 ⑩数据回流）
> 正向引用：[BRD.md](../BRD.md) §2.2/§4.4 · 反向收录：[PRD-主.md](PRD-主.md) §1/§2
> 引用：[schema/group.md](../schema/group.md)、[schema/response.md](../schema/response.md)、[schema/config.md](../schema/config.md)、[deps/cloudflare.md](../deps/cloudflare.md)

## 1. 目标
实时/近实时呈现 **treatment vs control 的群点击活跃率**，输出**统计显著性结论**，作为唯一北极星指标的验收依据。

## 2. 输入
- 响应记录 `state.responses`、需求状态、群数据（含 `arm`、`size`）、周点击数据。

## 3. 处理逻辑与规则
### 3.1 数据回流（⑩）
- 每条响应 / 需求状态变更写回 `state`（responses / demands）；计数器 `counters` 累加（intake/filtered/bert_pass/parsed/responded 等）。
- 演示版为内存态，重启重置（上线须接 KV/D1/DB，见 [deps/cloudflare.md](../deps/cloudflare.md)）。

### 3.2 看板指标
- **管线漏斗**：intake → filtered → bert_pass → parsed → responded（可视化信噪比与转化率）。
- **需求热度分布**：按 `category` 聚合 heat。
- **分流统计**：四出口占比（robot_push/triple/push_owner/discard）。
- **响应率**：responded / (intake - filtered)。

### 3.3 显著性检验（核心）
- **Welch t 检验**：treatment 组 vs control 组的周群点击活跃率（活跃率 = 点击量 / 群人数）。
- 输出：`t`、`df`、`p`、`95% CI`。**结论判据 p < 0.05**（BRD §2）。
- 算法已用 R 语言官方数据集验证：t=-2.290, p=0.0366，与 R 一致。

### 3.4 护栏指标
- 退群率、错发率（红线 <3%）：不伤害判据（BRD §5）。

## 4. 输出
- 效果看板（`client/DashboardPage.jsx`）：KPI、漏斗、分布、检验结果、护栏。

## 5. 异常与边界
- 样本不足（某组群数/周数过少）→ 不显著，结论标记"样本不足"。
- 两组不可比（F-01 失衡）→ 显著性结论无效。

## 6. 验收标准（先于代码）
- 正常：t 检验结果与 R 官方值一致（误差 <1e-3）。
- 边界：护栏指标（退群率/错发率 <3%）可见且超阈告警。
- 异常：样本不足时明确提示而非给出伪显著。

## 7. 对应模块 / 数据
- 统计：`webapp/server/lib/pipeline.js`（计数）+ 前端 t 检验实现
- 前端：`client/src/components/DashboardPage.jsx`
- 口径锚点：群点击活跃率基线 7.57%（2025-09），见 [BRD.md](../BRD.md) §2
