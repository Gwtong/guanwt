# PRD-F05 — 群内内容匹配与商品推荐


> 权威定义（编号/参数/指标）：[SSOT.md](../SSOT.md) · 变更留痕：[CHANGELOG.md](../CHANGELOG.md)

> 子 PRD（AI Coding 流程 ⑦）。服务业务需求 **R-05**，功能点 **F-05**（对应第二课十步 ⑧商品获取）
> 正向引用：[BRD.md](../BRD.md) §2.4/§4.5 · 反向收录：[PRD-主.md](PRD-主.md) §1/§2
> 引用：[schema/product.md](../schema/product.md)、[schema/demand.md](../schema/demand.md)、[deps/robot-systems.md](../deps/robot-systems.md)

## 1. 目标
将识别出的需求与商品池做匹配，产出**贴合群用户**的推荐内容（群内内容匹配度是长期薄弱点，本项目主线）。

## 2. 输入
- `group, category, keywords, price_pref, excludeSkus`（来自 demand）
- 商品池 `data/products.json`（见 [schema/product.md](../schema/product.md)）

## 3. 处理逻辑与规则（Mock 推荐接口，对齐真实契约）
1. **品类命中**：`p.cat === category` 且未排除，得候选集。
2. **模糊兜底**：品类未命中时，按 `keywords` 在 `name/cat` 中模糊匹配。
3. **排序**：
   - 价格意向命中（`便宜|低价|性价比|以内`）→ 按 `price` 升序（便宜优先）。
   - 否则 → 按 `comm` 降序（佣金高优先）。
4. **已推品排除**：`excludeSkus`（demand.pushedSkus）中的 SKU 不重复推荐。
5. **返回 Top-3**，附推广链接（含 group 溯源参数）。

## 4. 输出
- 候选对象数组（见 [schema/product.md](../schema/product.md) "推荐接口输出对象"）：`{ sku_id, name, price, commission_pct, category, promo_url }`。
- 取 Top-1 作为实际推送品；Top-3 展示于响应记录。

## 5. 异常与边界
- 品类未命中且无关键词匹配 → 返回空数组 → F-06 判为"无候选品"不响应。
- 候选全部已推 → 返回空 → 不响应（避免重复）。

## 6. 验收标准（先于代码）
- 正常：`category=枣` → 返回枣类商品；`price_pref=便宜` → 价格升序。
- 边界：已推 `S001` 后再次同类需求，排除 `S001` 取 `S002`。
- 异常：未知品类 → 返回空，F-06 不发送。

## 7. 对应模块 / 数据
- `webapp/server/lib/recommend.js`（mockRecommend）
- 真实商品池来源：[deps/robot-systems.md](../deps/robot-systems.md)（商品池与活动系统 ≈6000 商品）
