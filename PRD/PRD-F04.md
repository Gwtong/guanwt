# PRD-F04 — 大模型意图识别（双段判定）


> 权威定义（编号/参数/指标）：[SSOT.md](../SSOT.md) · 变更留痕：[CHANGELOG.md](../CHANGELOG.md)

> 子 PRD（AI Coding 流程 ⑦）。服务业务需求 **R-04**，功能点 **F-04**（对应第二课十步 ④相关性判定 + ⑤需求解析）
> 正向引用：[BRD.md](../BRD.md) §4.1/§3.4 · 反向收录：[PRD-主.md](PRD-主.md) §1/§2
> 引用：[schema/demand.md](../schema/demand.md)、[schema/config.md](../schema/config.md)、[deps/deepseek.md](../deps/deepseek.md)、[deps/dify.md](../deps/dify.md)

## 1. 目标
用大模型把聚合后的发言识别为**结构化购买需求** `{category, keywords, intent, price_pref}`，并仅在**相关性置信度足够高**时放行，避免"乱接话当众翻车"（BRD 风险）。

## 2. 输入
- 聚合单元 `unitText`（多句拼接）+ `contextText`（回溯上下文）

## 3. 处理逻辑与规则（双段）
### ④ 相关性判定（BERT 守门替身）
- 返回 `{ relevant: bool, confidence: 0~1 }`。
- `confidence < tau`（默认 0.85）→ **静默丢弃**（`bert_fail++`），不进解析段（贵的模型不花在无关消息上）。

### ⑤ 需求解析（DeepSeek 解析）
- 通过相关性后，解析为 `{ category, keywords, intent, price_pref }`。
- `intent` 枚举：`want_buy` 想买 / `ask_rec` 求推荐 / `compare` 比价 / `complain` 吐槽。
- **吐槽出局**：`intent = complain` → 直接出局（吐槽不是购买需求，不响应）。

### AI 选型与降级（关键）
- `ai_mode = builtin` → 直调 DeepSeek（见 [deps/deepseek.md](../deps/deepseek.md)）；`ai_mode = dify` → 走 Dify 工作流（见 [deps/dify.md](../deps/dify.md)）。
- **无 Key 或调用报错** → 自动降级 `ruleEngineRelevance` / `ruleEngineParse` 规则引擎替身，链路不中断。

## 4. 输出
- 通过：`demand` 雏形（见 [schema/demand.md](../schema/demand.md) 字段），交由 F-07 去重/频控/分流。
- 不通过：`bert_reject` / `complain_out` 日志留痕，流程结束。

## 5. 异常与边界
- AI 超时/限流 → catch 降级规则引擎。
- 解析字段缺失 → 给默认空值，下游按"弱信号"处理。
- 品类未归一化（与 `product.cat` 不同词表）→ 漏召回，须在提示词/词典层对齐。

## 6. 验收标准（先于代码）
- 正常：相关性判定对寒暄判 `relevant=false`；对"求推荐枣子"判 `relevant=true` 且解析出 `category=枣`。
- 边界：吐槽"枣子怎么不甜"判 `intent=complain` 出局。
- 异常：无 Key 时规则引擎替身跑通；填 Key 后真 AI 覆盖同一用例。

## 7. 对应模块 / 数据
- `webapp/server/lib/ai.js`（判定/解析/降级）、`webapp/server/lib/pipeline.js`（④⑤调度）
- 配置项：`schema/config.md` 的 `tau / ai_mode / deepseek_key / dify_*`
- 安全要求：Key 仅存后端，前端不回显（策略配置页）
