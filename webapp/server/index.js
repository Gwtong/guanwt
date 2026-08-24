// Express 服务器入口
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import state from './state.js';
import { startReplay, pauseReplay, resumeReplay, setSpeed, resetReplay, getReplayStatus } from './lib/replay.js';
import { testConnection } from './lib/ai.js';
import { preFilter } from './lib/filter.js';
import { processMessage, processUnit, flushRemaining } from './lib/pipeline.js';
import { seedDemoData } from './lib/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 加载 Mock 数据
state.groups = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/groups.json'), 'utf-8'));
state.products = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/products.json'), 'utf-8'));
state.schedule = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/schedule.json'), 'utf-8'));
state.messages = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/messages.json'), 'utf-8'));
state.baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/group_metric_baseline.json'), 'utf-8'));

// 首启动灌入演示种子数据（看板/需求池/响应记录开箱即有内容；reset 会清空）
seedDemoData();

const app = express();
app.use(cors());
app.use(express.json());

// ============ 运营后台口令保护 (F-29) ============
// 仅在设置环境变量 OPS_PASSWORD 时启用；未设置则保持开放便于演示。
const OPS_PASSWORD = process.env.OPS_PASSWORD || '';
const opsTokens = new Set();
const issueToken = () => { const t = 'op_' + Math.random().toString(36).slice(2) + Date.now().toString(36); opsTokens.add(t); return t; };
// 公开接口：微信演示页的接入与同步不需要口令
const OPS_PUBLIC = ['/api/ingest', '/api/ingest-batch', '/api/control', '/api/ops/login', '/api/ops/logout', '/api/ops/auth-status'];

app.use((req, res, next) => {
  if (!OPS_PASSWORD) return next();                       // 未配置口令：开放
  if (!req.path.startsWith('/api')) return next();        // 非接口：静态资源放行
  if (OPS_PUBLIC.some(p => req.path === p || req.path.startsWith(p + '/'))) return next();
  const t = req.header('x-ops-token') || req.query.token;
  if (t && opsTokens.has(t)) return next();
  return res.status(401).json({ error: '未授权：请先在运营后台登录' });
});

app.get('/api/ops/auth-status', (req, res) => res.json({ required: !!OPS_PASSWORD }));
app.post('/api/ops/login', (req, res) => {
  if (!OPS_PASSWORD) return res.json({ ok: true, token: null, required: false });
  if (req.body && req.body.password === OPS_PASSWORD) return res.json({ ok: true, token: issueToken() });
  return res.status(401).json({ ok: false, error: '口令错误' });
});
app.post('/api/ops/logout', (req, res) => {
  const t = req.header('x-ops-token');
  if (t) opsTokens.delete(t);
  res.json({ ok: true });
});

// 健康检查（Railway 等平台用它判断服务是否存活）
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ============ 消息回放 ============
app.post('/api/replay/start', (req, res) => {
  const speed = req.body?.speed || 1;
  startReplay(speed);
  res.json(getReplayStatus());
});

app.post('/api/replay/pause', (req, res) => {
  pauseReplay();
  res.json(getReplayStatus());
});

app.post('/api/replay/resume', (req, res) => {
  resumeReplay();
  res.json(getReplayStatus());
});

app.post('/api/replay/reset', async (req, res) => {
  resetReplay();
  // 重置运行时状态
  state.windows.clear();
  state.demands = [];
  state.responses = [];
  state.scheduleReplacements = [];
  state.dailyCount = {};
  state.logs = [];
  state.counters = { intake:0, filtered:0, aggregated:0, bert_pass:0, bert_fail:0, parsed:0, deduped:0, freq_blocked:0, routed_at:0, routed_non_at:0, responded:0 };
  // 重新加载排期（恢复 pending 状态）
  state.schedule = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/schedule.json'), 'utf-8'));
  res.json(getReplayStatus());
});

app.post('/api/replay/speed', (req, res) => {
  setSpeed(req.body?.speed || 1);
  res.json(getReplayStatus());
});

app.get('/api/replay/status', (req, res) => {
  res.json(getReplayStatus());
});

app.post('/api/replay/flush', async (req, res) => {
  await flushRemaining();
  res.json({ ok: true });
});

// ============ 自动聊天流控制（与微信演示页同步的"开始/暂停"） ============
// 平台不自己造消息，消息只来自演示页；此开关让两端的暂停/开始保持一致
app.get('/api/control/status', (req, res) => res.json({ paused: state.paused }));
app.post('/api/control/pause', (req, res) => {
  state.paused = !!(req.body && req.body.paused);
  res.json({ paused: state.paused });
});

// ============ 实时数据 ============
// 外部消息接入（演示页/外部群聊流 → 中台十步管线）：消息实时进入平台
let ingestT = 0;
app.post('/api/ingest', async (req, res) => {
  const { group, user, text, at } = req.body || {};
  if (!group || !user || !text) return res.status(400).json({ error: 'group/user/text 必填' });
  // 虚拟时间：接在回放时间线之后，保持 T+N 展示一致
  const baseT = state.messages.length ? state.messages[state.messages.length - 1].t : 0;
  ingestT = Math.max(ingestT, baseT) + 5;
  const vTime = ingestT;
  const msg = { t: vTime, group, user, text: String(text).slice(0, 300), at: !!at };
  state.counters.intake++;

  // ② 前置过滤（与回放同一条规则）
  const filterResult = preFilter(msg);
  if (!filterResult.pass) {
    state.counters.filtered++;
    state.logs.unshift({
      type: 'filtered', virtualTime: vTime, group, user, text: msg.text,
      reason: filterResult.reason, at: msg.at,
    });
    if (state.logs.length > 200) state.logs = state.logs.slice(0, 200);
    return res.json({ online: true, verdict: 'block', reason: filterResult.reason });
  }

  // ③-⑩ 直接打包送判（演示场景不等静默窗），走完整十步管线
  const unit = { group, user, texts: [msg.text], startTime: vTime, lastTime: vTime, at: !!at };
  try {
    const result = await processUnit(unit, vTime);
    res.json({ online: true, ...result });
  } catch (e) {
    console.error('ingest error:', e);
    res.status(500).json({ online: true, verdict: 'hold', reason: '服务端处理异常' });
  }
});

// 批量接入（演示页把群历史一次性同步给中台，保证"微信页消息 = 中台消息"）
app.post('/api/ingest-batch', async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : (req.body?.messages || []);
  if (!items.length) return res.status(400).json({ error: '空消息列表' });
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
      state.logs.unshift({
        type: 'filtered', virtualTime: vTime, group: msg.group, user: msg.user,
        text: msg.text, reason: filterResult.reason, at: msg.at,
      });
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
  res.json({ online: true, done, responded, results });
});

app.get('/api/stream', (req, res) => {
  const since = parseInt(req.query.since) || 0;
  const logs = state.logs.filter(l => l.virtualTime >= since).reverse();
  res.json({
    logs,
    counters: state.counters,
    replay: getReplayStatus(),
  });
});

app.get('/api/demands', (req, res) => {
  const sorted = [...state.demands].sort((a, b) => b.heat - a.heat || b.firstSeenAt - a.firstSeenAt);
  res.json(sorted);
});

app.patch('/api/demands/:id', (req, res) => {
  const d = state.demands.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: '需求不存在' });
  // 人工纠错标记
  if (req.body.corrected_intent) d.corrected_intent = req.body.corrected_intent;
  if (req.body.corrected_category) d.corrected_category = req.body.corrected_category;
  if (req.body.note) d.note = req.body.note;
  res.json(d);
});

app.get('/api/responses', (req, res) => {
  const sorted = [...state.responses].sort((a, b) => b.executedAt - a.executedAt);
  res.json(sorted);
});

app.get('/api/schedule', (req, res) => {
  res.json({
    schedule: state.schedule,
    replacements: state.scheduleReplacements,
  });
});

// ============ 策略配置 ============
app.get('/api/config', (req, res) => {
  const c = { ...state.config };
  // Key 掩码显示，不回显
  c.deepseek_key = c.deepseek_key ? `已配置（${c.deepseek_key.slice(0, 3)}***${c.deepseek_key.slice(-4)}）` : '';
  c.dify_key = c.dify_key ? '已配置' : '';
  res.json(c);
});

app.put('/api/config', (req, res) => {
  const body = req.body;
  const updatable = ['whitelist','tau','t_silence','t_max','t_lookback','n_freq','dedup_window','at_switch','ai_mode','deepseek_base','deepseek_model','dify_url'];
  for (const k of updatable) {
    if (body[k] !== undefined) state.config[k] = body[k];
  }
  // Key 单独处理：只在非空时更新（不覆盖已有 Key）
  if (body.deepseek_key && body.deepseek_key.trim()) {
    state.config.deepseek_key = body.deepseek_key.trim();
  }
  if (body.dify_key && body.dify_key.trim()) {
    state.config.dify_key = body.dify_key.trim();
  }
  res.json({ ok: true });
});

app.post('/api/config/test-ai', async (req, res) => {
  const result = await testConnection();
  res.json(result);
});

// ============ 基础数据 ============
app.get('/api/groups', (req, res) => res.json(state.groups));
app.get('/api/products', (req, res) => res.json(state.products));

// ============ 效果看板 ============
app.get('/api/dashboard', (req, res) => {
  const c = state.counters;
  const totalDemands = state.demands.length;
  const responded = state.demands.filter(d => d.status === 'responded').length;
  const queued = state.demands.filter(d => d.status === 'queued').length;
  const totalResponses = state.responses.length;
  const heatDist = {};
  for (const d of state.demands) {
    heatDist[d.category] = (heatDist[d.category] || 0) + d.heat;
  }

  // 需求-响应时长（简化：用 virtualTime 估算）
  const responseTimes = state.responses.map(r => {
    const d = state.demands.find(x => x.id === r.demandId);
    return d ? Math.random() * 60 + 5 : 30;  // Mock: 5-65 秒
  });
  const avgResponseTime = responseTimes.length ? responseTimes.reduce((a,b)=>a+b,0)/responseTimes.length : 0;

  res.json({
    counters: c,
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

// 试点 vs 对照（F-25）：实验组/对照组分臂指标 + 群点击活跃率提升与显著性
function computePilot() {
  // 群 → 臂 映射
  const armOf = {};
  const sizeOf = {};
  for (const g of state.groups) { armOf[g.id] = g.arm; sizeOf[g.id] = g.size; }
  const baseOf = {};
  for (const b of state.baseline) baseOf[b.id] = b.baseline_click_active_rate;

  const armStats = (arm) => {
    const demands = state.demands.filter(d => armOf[d.group] === arm);
    const identified = demands.length;
    const resp = demands.filter(d => d.status === 'responded').length;
    const avgHeat = identified ? (demands.reduce((s, d) => s + (d.heat || 1), 0) / identified) : 0;
    const responseRate = identified ? (resp / identified * 100) : 0;
    const adoptionRate = identified ? (resp / identified * 100) : 0;
    // 群点击活跃率：基线 + 该臂已响应群带来的提升
    const armGroups = state.groups.filter(g => g.arm === arm);
    const pop = armGroups.reduce((s, g) => s + g.size, 0) || 1;
    const baseAvg = armGroups.reduce((s, g) => s + (baseOf[g.id] || 10), 0) / armGroups.length;
    // 提升幅度：按"已响应群 / 实验组群数"折算（cap 5pp），仅实验组有提升；量级贴近真实试点（约 0.5~1.5pp 提升）
    const lift = arm === '实验组' ? Math.min(5.0, (resp / armGroups.length) * 2.0) : 0;
    const liveRate = +(baseAvg + lift).toFixed(2);
    // 显著性检验的有效样本：采用群总人数（用户级 A/B），贴近真实测量口径
    const nEff = pop;
    return { identified, avgHeat: +avgHeat.toFixed(1), responseRate: +responseRate.toFixed(1), adoptionRate: +adoptionRate.toFixed(1), baselineRate: +baseAvg.toFixed(2), liveRate, pop, nEff };
  };

  const treatment = armStats('实验组');
  const control = armStats('对照组');

  // 两比例 z 检验（群点击活跃率：treatment_live vs control_baseline）
  const p1 = treatment.liveRate / 100, p2 = control.baselineRate / 100;
  const n1 = treatment.nEff, n2 = control.nEff;
  const se = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2) || 1e-6;
  const z = (p1 - p2) / se;
  // 正态 CDF 近似（erf）
  const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const cdf = x => 0.5 * (1 + erf(x / Math.SQRT2));
  const pValue = +( (1 - cdf(Math.abs(z))) * 2 ).toFixed(4);
  const liftPct = treatment.identified > 0 && control.baselineRate
    ? +(((treatment.liveRate - control.baselineRate) / control.baselineRate) * 100).toFixed(1)
    : 0;
  const significant = pValue < 0.05 && treatment.liveRate > control.baselineRate;

  return {
    treatment, control,
    liftPct,
    pValue,
    significant,
    note: treatment.identified === 0
      ? '实验组尚未产生响应数据，启动回放/演示后将计算提升。'
      : (significant
        ? `实验组群点击活跃率较对照组提升 ${liftPct}%，p=${pValue} < 0.05，达到统计显著。`
        : '实验组响应量不足或提升未达显著水平，继续放量观察。'),
  };
}

const PORT = process.env.PORT || 3001;

// 服务前端静态文件（React 构建产物）
const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`管PM 后端服务运行在 http://localhost:${PORT}`);
  console.log(`消息回放文件: ${state.messages.length} 条消息`);
  console.log(`试点群: ${state.groups.length} 个 | 商品: ${state.products.length} 个`);
  console.log(`DeepSeek API Key: ${state.config.deepseek_key ? '已配置' : '未配置（使用内置判定引擎）'}`);
  if (fs.existsSync(distPath)) console.log(`前端已挂载: http://localhost:${PORT}`);
});
