# schema/config.md — 策略配置（运行时锁定参数）

> 锁定文件（AI Coding 流程 ④）。来源：`webapp/server/state.js` 的 `config`
> 被消费于：全部子 PRD（阈值/窗口/频控/AI 开关）；策略配置页可改
> 被索引于：`PRD/PRD-主.md` · 关联：`deps/deepseek.md`（AI 配置）

## 字段锁定

| 字段 | 类型 | 口径 / 默认值 | 作用（对应子 PRD） |
|---|---|---|---|
| `whitelist` | array | `[G001,G002,G004,G006,G008]` | F-02 仅白名单群进入处理 |
| `tau` | number | `0.85` | F-04 相关性置信阈值，低于则静默 |
| `t_silence` | int(s) | `60` | F-03 聚合窗静默边界（超则打包） |
| `t_max` | int(s) | `300` | F-03 聚合窗硬上限 |
| `t_lookback` | int(s) | `600` | F-03 上下文回溯窗口 |
| `n_freq` | int | `3` | F-07 每群每日非艾特响应上限 |
| `dedup_window` | int(s) | `86400`（24h） | F-07 去重窗口 |
| `at_switch` | bool | `true` | F-07 艾特矩阵总开关 |
| `ai_mode` | enum | `builtin`（直调）/ `dify` | F-04 AI 判定段选型 |
| `deepseek_key` | string | 空（不回显前端） | F-04 API Key，仅存后端 |
| `deepseek_base` | string | `https://api.deepseek.com/v1/chat/completions` | F-04 接口地址 |
| `deepseek_model` | string | `deepseek-chat` | F-04 模型名 |
| `dify_url` / `dify_key` | string | 空 | F-04 Dify 工作流（可选） |

## 约束
- 所有阈值/窗口为可灰度调参项；调参须记录于策略配置页，禁止硬编码绕过。
- `deepseek_key` 仅存后端，前端永不回显（PRD-F04 安全要求）。
- 无 Key 或 `ai_mode=builtin` 且无 Key 时，自动降级规则引擎替身（PRD-F04）。
