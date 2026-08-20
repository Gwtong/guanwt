# deps/dify.md — Dify 工作流（AI 判定段可选路径）

> 外部依赖锁定（AI Coding 流程 ⑤）。对应：第二课 §8.2（AI 判定段两种方式之一）、PRD-F04
> 被消费于：PRD-F04（当 `config.ai_mode = dify` 时替代直调 DeepSeek）
> 被索引于：`PRD/PRD-主.md` · 关联：`deps/deepseek.md`、`schema/config.md`

## 角色
第二课给出 AI 判定段两条路径：① 内置直调 DeepSeek（见 `deps/deepseek.md`）；② 调 Dify 工作流 API。Dify 适合把"双模型编排 + 提示词 + 后处理"沉淀为可视化工作流，非算法同学也能改。

## 接口契约
- 地址：`schema/config.md` 的 `dify_url`（工作流发布后的 API 端点）
- 鉴权：`dify_key`（API Key），同样仅存后端
- 约定输入输出须与直调 DeepSeek 对齐：入参 `{text, context}`；出参 `{relevant, confidence}` 与 `{category, keywords, intent, price_pref}`

## 切换方式
- `config.ai_mode` 在 `builtin` / `dify` 间切换；两路径在 `lib/ai.js` 中对同一函数签名（`judgeRelevance` / `parseDemand`）提供实现，上层 `pipeline.js` 无感调用。
- 演示版默认 `builtin`；接 Dify 仅需填 `dify_url` / `dify_key` 并将 `ai_mode` 切到 `dify`，无需改链路代码。

## 约束
- 两条路径必须产出**同构**结果对象，否则下游（去重/分流/推荐）出错。
- Dify 工作流的超时/重试策略须在平台侧配置，避免阻塞实时链路。
