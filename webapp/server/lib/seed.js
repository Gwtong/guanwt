// 演示种子数据：首启动时灌入一批可信的试点结果，让看板/需求池/响应记录开箱即有内容。
// 实验组产生需求并大部分得到响应；对照组存在需求但平台不介入（响应率 0%），形成 A/B 对照。
// 运行时真实回放/演示产生的数据会叠加在此之上；调用 /api/replay/reset 会清空回到空态。
import state from '../state.js';

const INTENTS = ['want_buy', 'ask_rec', 'compare'];
const OUTLETS = ['robot_push', 'triple', 'push_owner'];

export function seedDemoData() {
  if (state.demands.length > 0) return;
  const treat = state.groups.filter(g => g.arm === '实验组');
  const ctrl = state.groups.filter(g => g.arm === '对照组');
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const now = Date.now();
  let dIdx = 0, rIdx = 0;

  // 实验组：45 条需求，其中 38 条得到响应
  for (let i = 0; i < 45; i++) {
    const g = treat[i % treat.length];
    const p = pick(state.products);
    const id = 'D' + (1000 + dIdx++);
    const at = Math.random() > 0.6;
    const responded = i < 38;
    state.demands.push({
      id, group: g.id, user: '邻居' + (100 + i),
      category: p.cat, intent: pick(INTENTS), price_pref: '¥' + p.price,
      heat: 1 + Math.floor(Math.random() * 4), at,
      status: responded ? 'responded' : 'queued',
      originalText: '想要个' + p.name, firstSeenAt: now - (45 - i) * 60000,
      corrected_intent: '', corrected_category: '',
    });
    if (responded) {
      state.responses.push({
        id: 'R' + (2000 + rIdx++), group: g.id, user: '邻居' + (100 + i), at,
        outlet: pick(OUTLETS),
        product: { name: p.name, price: p.price, commission_pct: p.comm },
        result: '已向群内推送『' + p.name + '』', originalText: '想要个' + p.name,
        demandId: id, executedAt: now - (45 - i) * 60000 + 5000,
      });
      state.counters.responded++;
    }
    state.counters.intake++; state.counters.aggregated++; state.counters.bert_pass++; state.counters.parsed++;
  }

  // 对照组：28 条需求，平台不介入（响应率 0%）
  for (let i = 0; i < 28; i++) {
    const g = ctrl[i % ctrl.length];
    const p = pick(state.products);
    const id = 'D' + (1000 + dIdx++);
    state.demands.push({
      id, group: g.id, user: '群友' + (200 + i),
      category: p.cat, intent: 'want_buy', price_pref: '¥' + p.price,
      heat: 1 + Math.floor(Math.random() * 3), at: false,
      status: 'pending', originalText: '想买个' + p.name,
      firstSeenAt: now - (28 - i) * 60000, corrected_intent: '', corrected_category: '',
    });
    state.counters.intake++; state.counters.aggregated++; state.counters.bert_pass++; state.counters.parsed++;
  }

  state.counters.routed_at = state.demands.filter(d => d.at).length;
  state.counters.routed_non_at = state.demands.filter(d => !d.at).length;
}
