# PRD-主.md — 产品需求索引（双向引用中枢）

> 主 PRD（AI Coding 流程 ⑦）。本文是**唯一索引**：任何子 PRD、schema、deps 都必须被本索引收录，且各自反向引用本文——拒绝孤儿文件（agents.md §2 铁律）。
> 上游：`BRD.md`（R-xx 业务目标）、`agents.md`（宪法）
> 下游：8 份子 PRD（`PRD-F0x.md`）、`schema/*`（④）、`deps/*`（⑤）、`techstack.md`（⑥）、`plan.md`（⑧）、`tests/`（⑨）
> 权威定义（编号 F/R、北极星指标口径、策略参数当前值、十步链路、五页界面）：[SSOT.md](../SSOT.md) — 改这些定义只改 SSOT，并记 [CHANGELOG.md](../CHANGELOG.md)

---

## 0. 本产品一句话
在不动现有四系统前提下，为个微社群试点"群内需求实时识别 + 分层响应"，以**群点击活跃率（北极星）统计显著**提升为唯一目标。完整背景见 `BRD.md` §1–§2。

---

## 1. 双向引用总表（R-xx ↔ F-xx ↔ 子PRD ↔ schema ↔ deps ↔ 模块）

> 编号 F-xx / R-xx 与策略参数的**权威定义**在 [SSOT.md](../SSOT.md)；本表引用而非重定义，改动请改 SSOT 并记 CHANGELOG。

| 业务需求 R-xx | 功能点 F-xx | 子 PRD | 主要 schema | 主要 deps | 核心模块 |
|---|---|---|---|---|---|
| R-01 试点群圈选与 A/B 分组 | F-01 | [PRD-F01](PRD-F01.md) | [group](../schema/group.md)、[config](../schema/config.md) | [robot-systems](../deps/robot-systems.md) | `state.js`、`data/groups.json` |
| R-02 群消息实时接入（复用回传） | F-02 | [PRD-F02](PRD-F02.md) | [message](../schema/message.md)、[group](../schema/group.md) | [robot-systems](../deps/robot-systems.md) | `lib/replay.js`、`lib/filter.js` |
| R-03 低信噪比过滤与信号提取 | F-03 | [PRD-F03](PRD-F03.md) | [message](../schema/message.md) | — | `lib/filter.js`、`lib/aggregator.js` |
| R-04 基于大模型的意图识别 | F-04 | [PRD-F04](PRD-F04.md) | [demand](../schema/demand.md)、[config](../schema/config.md) | [deepseek](../deps/deepseek.md)、[dify](../deps/dify.md) | `lib/ai.js`、`lib/pipeline.js` |
| R-05 群内内容匹配与商品推荐 | F-05 | [PRD-F05](PRD-F05.md) | [product](../schema/product.md) | [robot-systems](../deps/robot-systems.md) | `lib/recommend.js` |
| R-06 触发机器人定向响应/推送 | F-06 | [PRD-F06](PRD-F06.md) | [response](../schema/response.md)、[schedule](../schema/schedule.md) | [robot-systems](../deps/robot-systems.md) | `lib/executor.js` |
| R-07 感知与隐私保护策略 | F-07 | [PRD-F07](PRD-F07.md) | [demand](../schema/demand.md)、[config](../schema/config.md) | — | `lib/dedup.js`、`lib/router.js` |
| R-08 群点击活跃率看板与显著性检验 | F-08 | [PRD-F08](PRD-F08.md) | [group](../schema/group.md)、[response](../schema/response.md)、[config](../schema/config.md) | [cloudflare](../deps/cloudflare.md) | `lib/pipeline.js`、`client/DashboardPage` |

> 反向引用校验：上表每一格的链接都必须可点开，且被链文件头部都回指本表——这就是"双向引用铁律"的落地形态。

---

## 2. 十步主链路 ↔ 功能点映射（第二课 §2.2）

| 步骤 | 名称 | 归属功能点 | 子 PRD |
|---|---|---|---|
| ① | 消息接入 | F-02 | [PRD-F02](PRD-F02.md) |
| ② | 前置过滤 | F-03 | [PRD-F03](PRD-F03.md) |
| ③ | 会话聚合窗 | F-03 | [PRD-F03](PRD-F03.md) |
| ④ | BERT 相关性判定 | F-04 | [PRD-F04](PRD-F04.md) |
| ⑤ | DeepSeek 需求解析 | F-04 | [PRD-F04](PRD-F04.md) |
| ⑥ | 需求去重与频控 | F-07 | [PRD-F07](PRD-F07.md) |
| ⑦ | 分流决策（艾特矩阵） | F-07 | [PRD-F07](PRD-F07.md) |
| ⑧ | 商品获取 | F-05 | [PRD-F05](PRD-F05.md) |
| ⑨ | 响应执行（三出口） | F-06 | [PRD-F06](PRD-F06.md) |
| ⑩ | 数据回流 | F-08 | [PRD-F08](PRD-F08.md) |

---

## 3. 五页运营界面 ↔ 功能点映射（第二课 §6）

| 页面 | 文件 | 服务的功能点 |
|---|---|---|
| 实时需求收集 | `client/src/components/StreamPage.jsx` | 全链路 ①–⑩ 可视化 |
| 需求池管理 | `client/src/components/DemandPoolPage.jsx` | F-04、F-07（需求列表/状态） |
| 响应记录 | `client/src/components/ResponseRecordsPage.jsx` | F-06（三出口 + 排期替换） |
| 策略配置 | `client/src/components/ConfigPage.jsx` | F-07（阈值/频控）+ [deepseek](../deps/deepseek.md)（AI Key） |
| 效果看板 | `client/src/components/DashboardPage.jsx` | F-08 |

---

## 4. 子 PRD 清单（收口，避免孤儿）
- [PRD-F01](PRD-F01.md) 试点群圈选与 A/B 分组
- [PRD-F02](PRD-F02.md) 群消息接入与回放
- [PRD-F03](PRD-F03.md) 低信噪比过滤与会话聚合
- [PRD-F04](PRD-F04.md) 大模型意图识别（双段判定）
- [PRD-F05](PRD-F05.md) 群内内容匹配与商品推荐
- [PRD-F06](PRD-F06.md) 触发定向响应与三出口执行
- [PRD-F07](PRD-F07.md) 去重频控与艾特矩阵分流
- [PRD-F08](PRD-F08.md) 数据回流与群点击活跃率看板

---

## 5. 范围与禁区（继承自 BRD / agents.md）
- **In Scope**：复用回传、试点群需求识别与内容匹配响应、活跃率看板与显著性检验。
- **Out of Scope / 禁区**：不动现有四系统；不覆盖全量 23 万群；不做企微/CPS 分润/群主培训（详见 `BRD.md` §3、agents.md §5）。
- 北极星唯一：**群点击活跃率**统计显著（p<0.05）提升。

---

## 6. 下游交付物（流程 ⑧⑨⑫）
- [plan.md](../plan.md) 开发计划（子 PRD 实现顺序与依赖）
- [tests/](../tests/) 测试用例（每 F-xx 正常/边界/异常）
- 云端部署点检见 [deps/cloudflare.md](../deps/cloudflare.md)

---

*本索引是引用链路的"根"。任何新增文件必须在此登记并反向引用，否则视为孤儿文件，禁止进入迭代（agents.md §2）。*
