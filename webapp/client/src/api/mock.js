// ============================================================
// 演示模式数据源（demo-mode）
// 当后端（Express）不可达时，前端用内置数据模拟整条回放管线，
// 保证部署为纯静态站点后，平台依然可点、可看、有数据。
// 本地完整版优先连真实后端，不受本模块影响。
// ============================================================

const PRODUCTS = [
  { id: 'P01', name: '宝宝辅食机', price: 269, commission_pct: 8, category: '母婴' },
  { id: 'P02', name: '无线降噪耳机', price: 499, commission_pct: 6, category: '数码' },
  { id: 'P03', name: '变频滚筒洗衣机', price: 2399, commission_pct: 4, category: '家电' },
  { id: 'P04', name: '坚果大礼包', price: 89.9, commission_pct: 12, category: '零食' },
  { id: 'P05', name: '懒人沙发', price: 399, commission_pct: 10, category: '家居' },
  { id: 'P06', name: '婴儿纸尿裤 L 码', price: 119, commission_pct: 7, category: '母婴' },
  { id: 'P07', name: '泰国乳胶枕', price: 149, commission_pct: 9, category: '家居' },
  { id: 'P08', name: '一级能效变频冰箱', price: 2799, commission_pct: 5, category: '家电' },
];
const byId = id => PRODUCTS.find(p => p.id === id);

const GROUPS = [
  { id: 'G001', name: '京东母婴福利群', layer: '活跃群' },
  { id: 'G002', name: '数码好物分享群', layer: '活跃群' },
  { id: 'G004', name: '家电焕新群', layer: '核心群' },
  { id: 'G006', name: '零食囤货群', layer: '活跃群' },
  { id: 'G008', name: '家居日用群', layer: '新群' },
];

// 回放消息集：混合 噪声 / 想买 / 求推荐 / 比价 / 艾特 等场景
const MSGS = [
  { user: '桃桃妈', group: 'G001', text: '@京东客服 宝宝快6个月了，有没有好用的辅食机推荐？', at: true, kind: 'want', pid: 'P01', price_pref: '300以内' },
  { user: '大飞', group: 'G002', text: '想买个降噪耳机通勤用，500以内有推荐吗？', at: false, kind: 'want', pid: 'P02', price_pref: '500以内' },
  { user: '小鹿', group: 'G006', text: '坚果礼包快吃完了，最近有活动吗？', at: false, kind: 'ask', pid: 'P04' },
  { user: '老王', group: 'G002', text: '收到', at: false, kind: 'noise' },
  { user: '李姐', group: 'G004', text: '@京东客服 洗衣机要变频的，3000以内有推荐吗？', at: true, kind: 'want', pid: 'P03', price_pref: '3000以内' },
  { user: '阿杰', group: 'G002', text: '索尼和 BOSE 降噪哪个好？', at: false, kind: 'compare', pid: 'P02' },
  { user: '笑笑', group: 'G008', text: '懒人沙发值得买吗？看了一整天了', at: false, kind: 'ask', pid: 'P05' },
  { user: '桃桃妈', group: 'G001', text: '纸尿裤 L 码囤货，有券吗？', at: false, kind: 'want', pid: 'P06', price_pref: '150以内' },
  { user: '路人甲', group: 'G006', text: '哈哈哈', at: false, kind: 'noise' },
  { user: '秋秋', group: 'G008', text: '@京东客服 乳胶枕和记忆棉枕选哪个？', at: true, kind: 'compare', pid: 'P07' },
  { user: '大飞', group: 'G002', text: '再蹲一下降噪耳机的优惠券，先不买', at: false, kind: 'want', pid: 'P02' },
  { user: '小鹿', group: 'G006', text: '最近群里发品少了，活动看看呗', at: false, kind: 'ask', pid: 'P04' },
  { user: '陈叔', group: 'G004', text: '这个月电费好贵，想换个节能冰箱', at: false, kind: 'want', pid: 'P08', price_pref: '3000以内' },
  { user: '小雅', group: 'G001', text: '辅食机有点贵，有优惠吗？', at: false, kind: 'ask', pid: 'P01' },
];

const S = {
  playing: false, speed: 1, cursor: 0,
  logs: [], demands: [], responses: [], replacements: [],
  fingerprints: new Set(), groupNonAt: {},
  counters: { intake: 0, filtered: 0, aggregated: 0, bert_pass: 0, bert_fail: 0, parsed: 0, deduped: 0, freq_blocked: 0, routed_at: 0, routed_non_at: 0, responded: 0 },
  config: {
    whitelist: GROUPS.map(g => g.id),
    tau: 0.85, t_silence: 60, t_max: 300, t_lookback: 600, n_freq: 3,
    dedup_window: 86400, at_switch: true, ai_mode: 'builtin',
    deepseek_key: 'demo', deepseek_model: 'deepseek-chat',
    dify_url: '', dify_key: '',
  },
};

let timer = null;
const T = () => S.cursor * 2; // 虚拟时间（秒）

function reset() {
  S.cursor = 0; S.logs = []; S.demands = []; S.responses = []; S.replacements = [];
  S.fingerprints = new Set(); S.groupNonAt = {};
  S.counters = { intake: 0, filtered: 0, aggregated: 0, bert_pass: 0, bert_fail: 0, parsed: 0, deduped: 0, freq_blocked: 0, routed_at: 0, routed_non_at: 0, responded: 0 };
}

function pushLog(partial) { S.logs.push({ virtualTime: T(), ...partial }); }

function processOne(m) {
  S.cursor += 1;
  const vt = T();
  S.counters.intake += 1;

  if (m.kind === 'noise') {
    S.counters.filtered += 1;
    pushLog({ type: 'filtered', user: m.user, group: m.group, text: m.text, reason: '无商品意向' });
    return;
  }
  if (m.kind === 'complain') {
    S.counters.bert_fail += 1;
    pushLog({ type: 'complain_out', user: m.user, group: m.group, text: m.text, reason: '吐槽类，不入需求池' });
    return;
  }

  S.counters.aggregated += 1;
  pushLog({ type: 'aggregating', user: m.user, group: m.group, text: m.text });
  S.counters.bert_pass += 1;
  pushLog({ type: 'aggregated', user: m.user, group: m.group, text: m.text, confidence: Math.min(0.99, 0.76 + Math.random() * 0.19) });
  S.counters.parsed += 1;

  const product = byId(m.pid);
  const fp = `${m.group}|${m.pid}`;

  // 去重（F-05）
  if (S.fingerprints.has(fp)) {
    S.counters.deduped += 1;
    pushLog({ type: 'deduped', user: m.user, group: m.group, text: m.text, reason: '同指纹已入池', product: product?.name });
    const d = S.demands.find(x => x.group === m.group && x.pid === m.pid);
    if (d) d.heat += 1;
    return;
  }
  S.fingerprints.add(fp);

  const isAt = m.at && S.config.at_switch;

  // 频控（非艾特每群每日上限 N）
  if (!isAt) {
    const used = S.groupNonAt[m.group] || 0;
    if (used >= S.config.n_freq) {
      S.counters.freq_blocked += 1;
      pushLog({ type: 'freq_blocked', user: m.user, group: m.group, text: m.text, reason: `每群每日非艾特上限 ${S.config.n_freq}` });
      S.demands.push({ id: 'D' + String(S.demands.length + 1).padStart(4, '0'), group: m.group, user: m.user, category: product?.category || '综合', intent: m.kind === 'compare' ? 'compare' : m.kind === 'ask' ? 'ask_rec' : 'want_buy', price_pref: m.price_pref || null, heat: 1, at: false, status: 'queued', originalText: m.text, pid: m.pid, firstSeenAt: vt });
      return;
    }
    S.groupNonAt[m.group] = used + 1;
  }

  // 分流（F-06）：艾特秒级机器人推品 / 非艾特三路并行 + 排期替换
  if (isAt) {
    S.counters.routed_at += 1;
    pushLog({ type: 'responded', user: m.user, group: m.group, text: m.text, at: true, outlet: 'robot_push', product: product?.name, heat: 1 });
  } else {
    S.counters.routed_non_at += 1;
    pushLog({ type: 'responded', user: m.user, group: m.group, text: m.text, outlet: 'triple', product: product?.name, heat: 1 });
    S.replacements.push({ group: m.group, original: '原计划品（演示）', replacement: product?.name || '候选品', slot: '下一次定时发品' });
  }
  S.counters.responded += 1;
  S.demands.push({ id: 'D' + String(S.demands.length + 1).padStart(4, '0'), group: m.group, user: m.user, category: product?.category || '综合', intent: m.kind === 'compare' ? 'compare' : m.kind === 'ask' ? 'ask_rec' : 'want_buy', price_pref: m.price_pref || null, heat: 1, at: m.at, status: 'responded', originalText: m.text, pid: m.pid, firstSeenAt: vt });
  S.responses.push({
    id: 'R' + String(S.responses.length + 1).padStart(4, '0'),
    group: m.group, user: m.user, at: m.at, originalText: m.text,
    outlet: isAt ? 'robot_push' : 'triple', product,
    result: isAt ? '机器人即时推品（演示）' : '三路并行推送 + 排期替换（演示）',
    executedAt: vt,
  });
}

function tick() {
  for (let i = 0; i < S.speed; i++) {
    if (S.cursor >= MSGS.length) { finish(); return; }
    processOne(MSGS[S.cursor]);
  }
}
function finish() {
  if (timer) { clearInterval(timer); timer = null; }
  S.playing = false;
}
function play() {
  if (timer) clearInterval(timer);
  timer = setInterval(tick, 1000);
}

export const mock = {
  startReplay(speed = 1) {
    if (S.cursor >= MSGS.length) reset();
    S.speed = speed; S.playing = true;
    play();
    return mock.getReplayStatus();
  },
  pauseReplay() {
    S.playing = false;
    if (timer) { clearInterval(timer); timer = null; }
    return mock.getReplayStatus();
  },
  resumeReplay() {
    if (S.cursor >= MSGS.length) return mock.getReplayStatus();
    S.playing = true;
    play();
    return mock.getReplayStatus();
  },
  resetReplay() {
    if (timer) { clearInterval(timer); timer = null; }
    reset();
    return mock.getReplayStatus();
  },
  setSpeed(speed = 1) { S.speed = speed; return mock.getReplayStatus(); },
  getReplayStatus() {
    const total = MSGS.length;
    return { playing: S.playing, speed: S.speed, cursor: S.cursor, total, progress: total ? Math.round(S.cursor / total * 100) : 0 };
  },
  flushReplay() {
    while (S.cursor < MSGS.length) processOne(MSGS[S.cursor]);
    finish();
    return { ok: true };
  },
  getStream(since = 0) {
    return { logs: S.logs.filter(l => l.virtualTime >= since).reverse(), counters: { ...S.counters } };
  },
  getDemands() {
    return [...S.demands].sort((a, b) => b.heat - a.heat || b.firstSeenAt - a.firstSeenAt);
  },
  updateDemand(id, patch) {
    const d = S.demands.find(x => x.id === id);
    if (d) Object.assign(d, patch);
    return d;
  },
  getResponses() {
    return [...S.responses].sort((a, b) => b.executedAt - a.executedAt);
  },
  getSchedule() {
    return { schedule: GROUPS.map(g => ({ group: g.id, product: '原计划品（演示）' })), replacements: S.replacements };
  },
  getConfig() {
    return { ...S.config, deepseek_key: S.config.deepseek_key ? '已配置（demo）' : '', dify_key: S.config.dify_key ? '已配置' : '' };
  },
  updateConfig(body) {
    for (const k of Object.keys(body)) {
      if ((k === 'deepseek_key' || k === 'dify_key') && !body[k]) continue;
      if (body[k] !== undefined) S.config[k] = body[k];
    }
    return { ok: true };
  },
  testAI() {
    return { ok: true, message: '演示模式连通性测试通过（静态版无真实后端；本地完整版用 node server/index.js 启动后连真后端）' };
  },
  getGroups() { return GROUPS; },
  getProducts() { return PRODUCTS; },
  getDashboard() {
    const c = S.counters;
    const totalDemands = S.demands.length;
    const responded = S.demands.filter(d => d.status === 'responded').length;
    const queued = S.demands.filter(d => d.status === 'queued').length;
    const heatDist = {};
    for (const d of S.demands) heatDist[d.category] = (heatDist[d.category] || 0) + d.heat;
    const avg = c.responded ? (c.responded * 9 + 12).toFixed(1) : '0.0';
    return {
      counters: { ...c },
      totalDemands,
      respondedDemands: responded,
      queuedDemands: queued,
      responseRate: totalDemands ? (responded / totalDemands * 100).toFixed(1) + '%' : '0%',
      totalResponses: S.responses.length,
      heatDistribution: heatDist,
      avgResponseTime: avg,
      scheduleReplacements: S.replacements.length,
    };
  },
};
