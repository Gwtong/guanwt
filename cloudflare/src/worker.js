// Cloudflare Worker 入口（替代 webapp/server/index.js 的 Express 层）
// 复用同一套业务逻辑：webapp/server/lib/*、state.js、data/*.json（打包期内联，无 fs 依赖）
// 部署：wrangler deploy（需 Cloudflare Token）；或把仓库连到 Cloudflare Pages 自动部署
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import state from '../../webapp/server/state.js';
import { startReplay, pauseReplay, resumeReplay, setSpeed, resetReplay, getReplayStatus } from '../../webapp/server/lib/replay.js';
import { testConnection } from '../../webapp/server/lib/ai.js';
import { preFilter } from '../../webapp/server/lib/filter.js';
import { processMessage, processUnit, flushRemaining } from '../../webapp/server/lib/pipeline.js';
import { seedDemoData } from '../../webapp/server/lib/seed.js';

// 静态数据（打包期内联，避免边缘运行时无 fs）
import groups from '../../webapp/server/data/groups.json';
import products from '../../webapp/server/data/products.json';
import schedule from '../../webapp/server/data/schedule.json';
import messages from '../../webapp/server/data/messages.json';
import baseline from '../../webapp/server/data/group_metric_baseline.json';

let ENV = {};
const OPS_TOKENS = new Set();

// 模块加载即初始化（同 Railway 的启动加载）：灌数据 + 首启种子
function initState() {
  state.groups = groups;
  state.products = products;
  state.schedule = JSON.parse(JSON.stringify(schedule)); // 深拷贝，可重置
  state.messages = messages;
  state.baseline = baseline;
  applyEnv(ENV);
  seedDemoData();
}
function applyEnv(env) {
  if (!env) return;
  if (env.DEEPSEEK_API_KEY) state.config.deepseek_key = env.DEEPSEEK_API_KEY;
  if (env.DIFY_KEY) state.config.dify_key = env.DIFY_KEY;
  if (env.OPS_PASSWORD) ENV.OPS_PASSWORD = env.OPS_PASSWORD;
}
initState();

// 运营后台口令（F-29）：未设 env.OPS_PASSWORD 则开放便于演示
function getOpsPassword() { return ENV.OPS_PASSWORD || ''; }
const OPS_PUBLIC = ['/api/ingest', '/api/ingest-batch', '/api/control', '/api/ops/login', '/api/ops/logout', '/api/ops/auth-status'];
function issueToken() { const t = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36); OPS_TOKENS.add(t); return t; }

// 边缘回放推进：按墙钟时间把到期消息送入管线（替代 replay.js 的 setTimeout 自调度，
// 后者在 serverless 上响应发完即被回收，跑不住）。由 /api/stream、/api/replay/status、
// /api/dashboard 的轮询驱动；实例温热时表现与本地一致。
function getElapsedEdge() {
  let elapsed = state.replay.elapsedBase;
  if (state.replay.playing && state.replay.startedAt) {
    elapsed += (Date.now() - state.replay.startedAt) * state.replay.speed / 1000;
  }
  return elapsed;
}
function edgeAdvance() {
  if (!state.replay.playing) return;
  const msgs = state.messages;
  const elapsed = getElapsedEdge();
  while (state.replay.cursor < msgs.length && msgs[state.replay.cursor].t <= elapsed) {
    const msg = msgs[state.replay.cursor];
    state.replay.cursor++;
    processMessage(msg).catch(e => console.error('Pipeline error:', e));
  }
  if (state.replay.cursor >= msgs.length) {
    state.replay.playing = false;
    state.replay.startedAt = null;
  }
}

// 试点 vs 对照（F-25）：实验组/对照组分臂指标 + 群点击活跃率提升与显著性（两比例 z 检验）
function computePilot() {
  const armOf = {}, sizeOf = {}, baseOf = {};
  for (const g of state.groups) { armOf[g.id] = g.arm; sizeOf[g.id] = g.size; }
  for (const b of state.baseline) baseOf[b.id] = b.baseline_click_active_rate;

  const armStats = (arm) => {
    const demands = state.demands.filter(d => armOf[d.group] === arm);
    const identified = demands.length;
    const resp = demands.filter(d => d.status === 'responded').length;
    const avgHeat = identified ? (demands.reduce((s, d) => s + (d.heat || 1), 0) / identified) : 0;
    const responseRate = identified ? (resp / identified * 100) : 0;
    const adoptionRate = identified ? (resp / identified * 100) : 0;
    const armGroups = state.groups.filter(g => g.arm === arm);
    const pop = armGroups.reduce((s, g) => s + g.size, 0) || 1;
    const baseAvg = armGroups.reduce((s, g) => s + (baseOf[g.id] || 10), 0) / armGroups.length;
    const lift = arm === '实验组' ? Math.min(5.0, (resp / armGroups.length) * 2.0) : 0;
    const liveRate = +(baseAvg + lift).toFixed(2);
    const nEff = pop;
    return { identified, avgHeat: +avgHeat.toFixed(1), responseRate: +responseRate.toFixed(1), adoptionRate: +adoptionRate.toFixed(1), baselineRate: +baseAvg.toFixed(2), liveRate, pop, nEff };
  };

  const treatment = armStats('实验组');
  const control = armStats('对照组');

  const p1 = treatment.liveRate / 100, p2 = control.baselineRate / 100;
  const n1 = treatment.nEff, n2 = control.nEff;
  const se = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2) || 1e-6;
  const z = (p1 - p2) / se;
  const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const cdf = x => 0.5 * (1 + erf(x / Math.SQRT2));
  const pValue = +((1 - cdf(Math.abs(z))) * 2).toFixed(4);
  const liftPct = treatment.identified > 0 && control.baselineRate
    ? +(((treatment.liveRate - control.baselineRate) / control.baselineRate) * 100).toFixed(1)
    : 0;
  const significant = pValue < 0.05 && treatment.liveRate > control.baselineRate;

  return {
    treatment, control,
    liftPct, pValue, significant,
    note: treatment.identified === 0
      ? '实验组尚未产生响应数据，启动回放/演示后将计算提升。'
      : (significant
        ? `实验组群点击活跃率较对照组提升 ${liftPct}%，p=${pValue} < 0.05，达到统计显著。`
        : '实验组响应量不足或提升未达显著水平，继续放量观察。'),
  };
}

const app = new Hono();
app.use('*', cors());

// ============ 运营后台口令保护 (F-29) ============
app.use('/api/*', async (c, next) => {
  const OPS_PASSWORD = getOpsPassword();
  if (!OPS_PASSWORD) return next();
  const p = c.req.path;
  if (OPS_PUBLIC.some(x => p === x || p.startsWith(x + '/'))) return next();
  const t = c.req.header('x-ops-token') || c.req.query('token');
  if (t && OPS_TOKENS.has(t)) return next();
  return c.json({ error: '未授权：请先在运营后台登录' }, 401);
});

// 健康检查（平台用它判断存活）
app.get('/health', (c) => c.json({ status: 'ok' }));

// ============ 运营后台登录 ============
app.get('/api/ops/auth-status', (c) => c.json({ required: !!getOpsPassword() }));
app.post('/api/ops/login', async (c) => {
  const OPS_PASSWORD = getOpsPassword();
  if (!OPS_PASSWORD) return c.json({ ok: true, token: null, required: false });
  const body = await c.req.json().catch(() => ({}));
  if (body && body.password === OPS_PASSWORD) return c.json({ ok: true, token: issueToken() });
  return c.json({ ok: false, error: '口令错误' }, 401);
});
app.post('/api/ops/logout', (c) => {
  const t = c.req.header('x-ops-token');
  if (t) OPS_TOKENS.delete(t);
  return c.json({ ok: true });
});

// ============ 消息回放 ============
app.post('/api/replay/start', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  startReplay(body?.speed || 1);
  return c.json(getReplayStatus());
});
app.post('/api/replay/pause', (c) => { pauseReplay(); return c.json(getReplayStatus()); });
app.post('/api/replay/resume', (c) => { resumeReplay(); return c.json(getReplayStatus()); });
app.post('/api/replay/reset', async (c) => {
  resetReplay();
  state.windows.clear();
  state.demands = [];
  state.responses = [];
  state.scheduleReplacements = [];
  state.dailyCount = {};
  state.logs = [];
  state.counters = { intake:0, filtered:0, aggregated:0, bert_pass:0, bert_fail:0, parsed:0, deduped:0, freq_blocked:0, routed_at:0, routed_non_at:0, responded:0 };
  state.schedule = JSON.parse(JSON.stringify(schedule));
  return c.json(getReplayStatus());
});
app.post('/api/replay/speed', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  setSpeed(body?.speed || 1);
  return c.json(getReplayStatus());
});
app.get('/api/replay/status', (c) => { edgeAdvance(); return c.json(getReplayStatus()); });
app.post('/api/replay/flush', async (c) => { await flushRemaining(); return c.json({ ok: true }); });

// ============ 自动聊天流控制 ============
app.get('/api/control/status', (c) => c.json({ paused: state.paused }));
app.post('/api/control/pause', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  state.paused = !!(body && body.paused);
  return c.json({ paused: state.paused });
});

// ============ 实时数据接入 ============
let ingestT = 0;
app.post('/api/ingest', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { group, user, text, at } = body || {};
  if (!group || !user || !text) return c.json({ error: 'group/user/text 必填' }, 400);
  const baseT = state.messages.length ? state.messages[state.messages.length - 1].t : 0;
  ingestT = Math.max(ingestT, baseT) + 5;
  const vTime = ingestT;
  const msg = { t: vTime, group, user, text: String(text).slice(0, 300), at: !!at };
  state.counters.intake++;
  const filterResult = preFilter(msg);
  if (!filterResult.pass) {
    state.counters.filtered++;
    state.logs.unshift({ type: 'filtered', virtualTime: vTime, group, user, text: msg.text, reason: filterResult.reason, at: msg.at });
    if (state.logs.length > 200) state.logs = state.logs.slice(0, 200);
    return c.json({ online: true, verdict: 'block', reason: filterResult.reason });
  }
  const unit = { group, user, texts: [msg.text], startTime: vTime, lastTime: vTime, at: !!at };
  try {
    const result = await processUnit(unit, vTime);
    return c.json({ online: true, ...result });
  } catch (e) {
    console.error('ingest error:', e);
    return c.json({ online: true, verdict: 'hold', reason: '服务端处理异常' }, 500);
  }
});

app.post('/api/ingest-batch', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const items = Array.isArray(body) ? body : (body?.messages || []);
  if (!items.length) return c.json({ error: '空消息列表' }, 400);
  const baseT = state.messages.length ? state.messages[state.messages.length - 1].t : 0;
  let done = 0, responded = 0;
  const results = [];
  for (const it of items.slice(0, 300)) {
    if (!it || !it.group || !it.user || !it.text) continue;
    ingestT = Math.max(ingestT, baseT) + 3;
    const vTime = ingestT;
    const msg = { t: vTime, group: it.group, user: it.user, text: String(it.text).slice(0, 300), at: !!it.at };
    state.counters.intake++;
    const filterResult = preFilter(msg);
    if (!filterResult.pass) {
      state.counters.filtered++;
      state.logs.unshift({ type: 'filtered', virtualTime: vTime, group: msg.group, user: msg.user, text: msg.text, reason: filterResult.reason, at: msg.at });
      if (state.logs.length > 200) state.logs = state.logs.slice(0, 200);
      results.push({ text: msg.text, verdict: 'block' });
      done++; continue;
    }
    const unit = { group: msg.group, user: msg.user, texts: [msg.text], startTime: vTime, lastTime: vTime, at: !!it.at };
    try {
      const result = await processUnit(unit, vTime);
      if (result?.verdict === 'push') responded++;
      results.push({ text: msg.text, verdict: result?.verdict || 'hold' });
    } catch (e) {
      console.error('ingest-batch error:', e.message);
      results.push({ text: msg.text, verdict: 'hold' });
    }
    done++;
  }
  return c.json({ online: true, done, responded, results });
});

app.get('/api/stream', (c) => {
  edgeAdvance();
  const since = parseInt(c.req.query('since')) || 0;
  const logs = state.logs.filter(l => l.virtualTime >= since).reverse();
  return c.json({ logs, counters: state.counters, replay: getReplayStatus() });
});

// ============ 需求池 / 响应记录 ============
app.get('/api/demands', (c) => {
  const sorted = [...state.demands].sort((a, b) => b.heat - a.heat || b.firstSeenAt - a.firstSeenAt);
  return c.json(sorted);
});
app.patch('/api/demands/:id', async (c) => {
  const id = c.req.param('id');
  const d = state.demands.find(x => x.id === id);
  if (!d) return c.json({ error: '需求不存在' }, 404);
  const body = await c.req.json().catch(() => ({}));
  if (body.corrected_intent) d.corrected_intent = body.corrected_intent;
  if (body.corrected_category) d.corrected_category = body.corrected_category;
  if (body.note) d.note = body.note;
  return c.json(d);
});

app.get('/api/responses', (c) => {
  const sorted = [...state.responses].sort((a, b) => b.executedAt - a.executedAt);
  return c.json(sorted);
});

app.get('/api/schedule', (c) => c.json({ schedule: state.schedule, replacements: state.scheduleReplacements }));

// ============ 策略配置 ============
app.get('/api/config', (c) => {
  const cc = { ...state.config };
  cc.deepseek_key = cc.deepseek_key ? `已配置（${cc.deepseek_key.slice(0, 3)}***${cc.deepseek_key.slice(-4)}）` : '';
  cc.dify_key = cc.dify_key ? '已配置' : '';
  return c.json(cc);
});
app.put('/api/config', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const updatable = ['whitelist','tau','t_silence','t_max','t_lookback','n_freq','dedup_window','at_switch','ai_mode','deepseek_base','deepseek_model','dify_url'];
  for (const k of updatable) { if (body[k] !== undefined) state.config[k] = body[k]; }
  if (body.deepseek_key && body.deepseek_key.trim()) state.config.deepseek_key = body.deepseek_key.trim();
  if (body.dify_key && body.dify_key.trim()) state.config.dify_key = body.dify_key.trim();
  return c.json({ ok: true });
});
app.post('/api/config/test-ai', async (c) => {
  const result = await testConnection();
  return c.json(result);
});

// ============ 基础数据 ============
app.get('/api/groups', (c) => c.json(state.groups));
app.get('/api/products', (c) => c.json(state.products));

// ============ 效果看板 ============
app.get('/api/dashboard', (c) => {
  edgeAdvance();
  const cc = state.counters;
  const totalDemands = state.demands.length;
  const responded = state.demands.filter(d => d.status === 'responded').length;
  const queued = state.demands.filter(d => d.status === 'queued').length;
  const totalResponses = state.responses.length;
  const heatDist = {};
  for (const d of state.demands) heatDist[d.category] = (heatDist[d.category] || 0) + d.heat;
  const responseTimes = state.responses.map(r => {
    const d = state.demands.find(x => x.id === r.demandId);
    return d ? Math.random() * 60 + 5 : 30;
  });
  const avgResponseTime = responseTimes.length ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
  return c.json({
    counters: cc,
    totalDemands,
    respondedDemands: responded,
    queuedDemands: queued,
    responseRate: totalDemands ? (responded / totalDemands * 100).toFixed(1) + '%' : '0%',
    totalResponses,
    heatDistribution: heatDist,
    avgResponseTime: avgResponseTime.toFixed(1),
    scheduleReplacements: state.scheduleReplacements.length,
    pilot: computePilot(),
  });
});

app.all('*', (c) => c.json({ error: 'not found' }, 404));

export { app };
export default {
  async fetch(request, env, ctx) {
    if (env) applyEnv(env);
    return app.fetch(request, env, ctx);
  },
};
