// Express 服务器入口
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import state from './state.js';
import { startReplay, pauseReplay, resumeReplay, setSpeed, resetReplay, getReplayStatus } from './lib/replay.js';
import { testConnection } from './lib/ai.js';
import { flushRemaining } from './lib/pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 加载 Mock 数据
state.groups = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/groups.json'), 'utf-8'));
state.products = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/products.json'), 'utf-8'));
state.schedule = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/schedule.json'), 'utf-8'));
state.messages = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/messages.json'), 'utf-8'));

const app = express();
app.use(cors());
app.use(express.json());

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

// ============ 实时数据 ============
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
  });
});

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
  console.log(`DeepSeek API Key: ${state.config.deepseek_key ? '已配置' : '未配置（将使用规则引擎替身）'}`);
  if (fs.existsSync(distPath)) console.log(`前端已挂载: http://localhost:${PORT}`);
});
