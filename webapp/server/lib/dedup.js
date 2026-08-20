// 需求去重与频控
// 来自第二课 §5.1（去重）+ §5.2（频控）
import state from '../state.js';

// 需求指纹 = 群ID + 归一化品类
export function fingerprint(groupId, category) {
  return `${groupId}:${category}`;
}

// 去重检查：24小时窗口内同指纹需求
export function dedup(groupId, category) {
  const fp = fingerprint(groupId, category);
  const now = Date.now();
  const windowMs = state.config.dedup_window * 1000;

  // 查找同指纹的需求
  const existing = state.demands.find(d =>
    d.fingerprint === fp &&
    (now - d.firstSeenAt) < windowMs
  );

  if (existing) {
    // 同指纹需求已存在
    existing.heat += 1;  // 热度 +1
    existing.lastSeenAt = now;
    return {
      isDuplicate: true,
      demand: existing,
      // 是否已响应
      alreadyResponded: existing.status === 'responded',
    };
  }

  // 新需求
  return { isDuplicate: false, demand: null };
}

// 频控检查：每群每日非艾特响应上限
export function checkFreq(groupId, isAt) {
  // 艾特响应不占额度
  if (isAt) return { allowed: true, reason: '艾特响应不占频控额度' };

  const count = state.dailyCount[groupId] || 0;
  if (count >= state.config.n_freq) {
    return { allowed: false, reason: `已达每日上限 ${state.config.n_freq} 次` };
  }
  return { allowed: true, reason: '' };
}

// 记录频控消耗
export function consumeFreq(groupId, isAt) {
  if (!isAt) {
    state.dailyCount[groupId] = (state.dailyCount[groupId] || 0) + 1;
  }
}

// 创建新需求
export function createDemand(unit, parsed, virtualTime) {
  const fp = fingerprint(unit.group, parsed.category);
  const demand = {
    id: `D${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    fingerprint: fp,
    group: unit.group,
    user: unit.user,
    originalText: unit.texts.join(' '),
    category: parsed.category,
    keywords: parsed.keywords,
    intent: parsed.intent,
    price_pref: parsed.price_pref,
    at: unit.at || false,
    heat: 1,
    status: 'pending',  // pending / responded / queued / expired
    firstSeenAt: Date.now(),
    lastSeenAt: Date.now(),
    virtualTime,
  };
  state.demands.push(demand);
  return demand;
}
