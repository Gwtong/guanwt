# deps/deepseek.md — DeepSeek API（AI 判定段主力）

> 外部依赖锁定（AI Coding 流程 ⑤）。对应：第二课 §4 双模型判定段、PRD-F04
> 被消费于：PRD-F04（相关性判定 + 需求解析，两段调用）
> 被索引于：`PRD/PRD-主.md` · 关联：`schema/config.md`（deepseek_key 等配置）

## 角色
第二课定义"双模型"——贵的模型只花在少量相关消息上。本演示版用 **DeepSeek V4 Flash / deepseek-chat** 单模型承担两段判定（相关性 + 结构化解析），靠提示词区分；真实环境可将相关性判定拆给更便宜的 BERT 守门。

## 接口契约
- 地址：`schema/config.md` 的 `deepseek_base`（默认 `https://api.deepseek.com/v1/chat/completions`）
- 鉴权：`Authorization: Bearer <deepseek_key>`，Key 仅存后端，前端不回显
- 两段调用：
  1. **相关性判定**（BERT 替身）：系统提示"只判商品相关/无关"，返回 `{relevant: bool, confidence: 0~1}`
  2. **需求解析**（DeepSeek 解析）：系统提示输出 JSON `{category, keywords, intent, price_pref}`

## 降级策略（重要）
- 无 Key 或 `ai_mode=builtin` 且无 Key → 自动降级 `lib/ai.js` 的 `ruleEngineRelevance` / `ruleEngineParse` 规则引擎替身
- AI 调用抛错 → catch 后同样降级规则引擎，不中断链路（PRD-F04 异常项）

## 成本约束（对应 BRD 五道成本之"信噪比"）
- 相关性判定必须前置挡掉无关消息，解析段只处理通过者——贵的模型调用量 = 通过相关性判定的消息量，而非全量。
- 真实环境建议：相关性判定用 BERT（毫秒/便宜），仅相关消息进 DeepSeek（贵/准）。

## 待确认
- 真实 DeepSeek 模型名与速率限制、是否走企业专线、Key 轮换机制。
