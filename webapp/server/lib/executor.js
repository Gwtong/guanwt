// 响应执行：三个出口
// 来自第二课 §6.2
import state from '../state.js';
import { mockRecommend } from './recommend.js';

export function execute(demand, routeDecision) {
  const { outlet } = routeDecision;
  const groupId = demand.group;

  if (outlet === 'discard') {
    return { executed: false, outlet, reason: routeDecision.reason };
  }

  // 获取商品
  const candidates = mockRecommend(
    groupId,
    demand.category,
    demand.keywords,
    demand.price_pref,
    demand.pushedSkus || []  // 已推品排除
  );

  if (candidates.length === 0) {
    return { executed: false, outlet, reason: '推荐接口无候选品' };
  }

  const product = candidates[0];  // 取 Top-1
  const response = {
    id: `R${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    demandId: demand.id,
    group: groupId,
    user: demand.user,
    originalText: demand.originalText,
    category: demand.category,
    intent: demand.intent,
    at: demand.at,
    outlet,
    product: product,
    candidates: candidates,
    executedAt: Date.now(),
    result: '',
  };

  switch (outlet) {
    case 'robot_push':
      // 艾特场景：机器人即时群内推品
      response.result = `机器人已在群内推送：${product.name} ¥${product.price}`;
      response.urgency = '秒级';
      break;

    case 'triple':
      // 非艾特场景：三路并行
      // 1. 群主端选品池置顶
      response.result_pinned = `已将 ${product.name} 置顶到群主端选品池`;
      // 2. Push 群主（附用户原话）
      response.result_push = `已 Push 群主：用户"${demand.user}"提及"${demand.originalText}"`;
      // 3. 排期替换：替换下一次发品的原计划品
      const scheduleItem = state.schedule.find(s => s.group_id === groupId && s.status === 'pending');
      if (scheduleItem) {
        const original = { ...scheduleItem };
        scheduleItem.product_id = product.sku_id;
        scheduleItem.product_name = product.name;
        scheduleItem.status = 'replaced';
        response.result_schedule = `已将 ${groupId} 下次发品从「${original.product_name}」替换为「${product.name}」`;
        state.scheduleReplacements.push({
          group: groupId,
          slot: scheduleItem.slot,
          original: original.product_name,
          replacement: product.name,
          demandId: demand.id,
          time: Date.now(),
        });
      } else {
        response.result_schedule = `${groupId} 无待执行排期，跳过排期替换`;
      }
      response.result = `${response.result_pinned}；${response.result_push}；${response.result_schedule}`;
      response.urgency = '分钟级';
      break;

    case 'push_owner':
      // 艾特 + 无关：Push 群主回复
      response.result = `已 Push 群主：用户"${demand.user}"艾特了你，请回复"${demand.originalText}"`;
      response.urgency = '秒级';
      break;
  }

  state.responses.push(response);

  // 记录已推品
  if (!demand.pushedSkus) demand.pushedSkus = [];
  demand.pushedSkus.push(product.sku_id);

  return { executed: true, outlet, response, reason: routeDecision.reason };
}
