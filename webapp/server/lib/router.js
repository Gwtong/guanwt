// 分流决策：艾特矩阵
// 来自第二课 §5.3
// 艾特是消息元数据里的确定性字段，不需要 AI 判断

export function route(demand, relevance) {
  const { at, intent } = demand;
  const isRelevant = relevance.relevant && intent !== 'complain';
  const isAtEnabled = demand.at;  // 艾特标识来自消息元数据

  // 艾特矩阵
  if (isAtEnabled && isRelevant) {
    // 艾特 + 商品相关 → 机器人直接群内推品
    return {
      outlet: 'robot_push',       // 出口：机器人即时推品
      urgency: 'immediate',        // 秒级
      reason: '艾特 + 商品相关 → 机器人直接推品',
    };
  }

  if (isAtEnabled && !isRelevant) {
    // 艾特 + 商品无关 → Push 群主去回复
    return {
      outlet: 'push_owner',
      urgency: 'immediate',
      reason: '艾特 + 商品无关 → Push 群主回复',
    };
  }

  if (!isAtEnabled && isRelevant) {
    // 无艾特 + 真实需求 → 三路并行
    return {
      outlet: 'triple',            // 出口：群主端置顶 + Push群主 + 排期替换
      urgency: 'minute',           // 分钟级～下一发品时点
      reason: '无艾特 + 真实需求 → 三路并行（置顶+Push+排期替换）',
    };
  }

  // 无艾特 + 商品无关 → 丢弃
  return {
    outlet: 'discard',
    urgency: 'none',
    reason: '无艾特 + 商品无关 → 丢弃',
  };
}
