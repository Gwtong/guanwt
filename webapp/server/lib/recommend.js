// Mock 推荐接口：品类命中 + 简单排序 + 已推品排除
// 来自第二课 §8.2 —— 入参出参对齐真实契约
import state from '../state.js';

export function mockRecommend(groupId, category, keywords, pricePref, excludeSkus = []) {
  // 从商品池中按品类命中
  const candidates = state.products.filter(p =>
    p.cat === category && !excludeSkus.includes(p.id)
  );

  if (candidates.length === 0) {
    // 品类未直接命中，尝试关键词模糊匹配
    const kwMatches = state.products.filter(p =>
      keywords.some(k => p.name.includes(k) || p.cat.includes(k)) &&
      !excludeSkus.includes(p.id)
    );
    if (kwMatches.length === 0) return [];
    return rankAndReturn(kwMatches, pricePref, groupId);
  }

  return rankAndReturn(candidates, pricePref, groupId);
}

function rankAndReturn(items, pricePref, groupId) {
  // 简单排序：价格意向优先
  let ranked = [...items];
  if (pricePref && /便宜|低价|性价比|以内/.test(pricePref)) {
    ranked.sort((a, b) => a.price - b.price);  // 便宜的优先
  } else {
    ranked.sort((a, b) => b.comm - a.comm);     // 佣金高的优先
  }

  // 返回 Top-3，附带推广链接（Mock）
  return ranked.slice(0, 3).map(p => ({
    sku_id: p.id,
    name: p.name,
    price: p.price,
    commission_pct: p.comm,
    category: p.cat,
    promo_url: `https://jd.com/product/${p.id}?group=${groupId}&src=quickresp`,
  }));
}
