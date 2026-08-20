# schema/product.md — 商品表（商品池快照）

> 锁定文件（AI Coding 流程 ④）。来源：`webapp/server/data/products.json`
> 被消费于：PRD-F05（内容匹配与推荐）、PRD-F06（响应执行取 Top-1）、`lib/recommend.js`
> 被索引于：`PRD/PRD-主.md` · 关联：`deps/robot-systems.md`（真实商品池与活动系统 ≈6000 商品）

## 表字段锁定（主数据）

| 字段 | 类型 | 口径 / 说明 | 示例 |
|---|---|---|---|
| `id` | string | 商品 SKU ID，主键 | `S001` |
| `name` | string | 商品标题 | 和田玉枣 500g 大红枣 |
| `cat` | string | 品类标签，需求匹配的唯一键 | 枣 |
| `price` | number | 售价（元） | 29.9 |
| `comm` | int | 佣金比例（%），用于排序 | 10 |

## 推荐接口输出对象（运行时增强，非主数据）
来自 `lib/recommend.js` 的 `mockRecommend` 返回，字段如下（对齐真实契约，见 PRD-F05）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sku_id` | string | = 主数据 `id`，供排期替换回写 |
| `name` | string | 商品标题 |
| `price` | number | 售价 |
| `commission_pct` | int | = 主数据 `comm` |
| `category` | string | = 主数据 `cat` |
| `promo_url` | string | CPS 推广链接（含 group 溯源参数） |

## 约束
- `cat` 是需求→商品匹配的唯一键，须与 PRD-F04 解析出的 `category` 同词表（否则漏召回）。
- 真实环境商品池 ≈6000，本表为演示子集；上线时由商品池与活动系统按 `cat` 实时供给。
