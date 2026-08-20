// 十步主链路：消息从进入到完成响应的完整处理
// 来自第二课 §2.2
import state from '../state.js';
import { preFilter } from './filter.js';
import { aggregate, checkTimeouts, getContext, flushAll } from './aggregator.js';
import { judgeRelevance, parseDemand, ruleEngineRelevance, ruleEngineParse, testConnection } from './ai.js';
import { dedup, checkFreq, consumeFreq, createDemand } from './dedup.js';
import { route } from './router.js';
import { execute } from './executor.js';

// 消息处理主函数
export async function processMessage(msg) {
  const virtualTime = msg.t;  // 虚拟时间（秒）
  state.counters.intake++;

  // ①② 消息接入 + 前置过滤
  const filterResult = preFilter(msg);
  if (!filterResult.pass) {
    state.counters.filtered++;
    state.logs.unshift({
      type: 'filtered', virtualTime, group: msg.group, user: msg.user,
      text: msg.text, reason: filterResult.reason, at: msg.at,
    });
    trimLogs();
    return;
  }

  // ③ 消息聚合
  const aggResult = aggregate(msg, virtualTime);
  if (!aggResult.packed) {
    // 未打包，等待静默超时
    state.logs.unshift({
      type: 'aggregating', virtualTime, group: msg.group, user: msg.user,
      text: msg.text, at: msg.at,
    });
    trimLogs();
    // 检查是否有窗口因静默/超时需要打包
    const timedOut = checkTimeouts(virtualTime);
    for (const unit of timedOut) {
      await processUnit(unit, virtualTime);
    }
    return;
  }

  // 打包了（艾特触发或静默触发），送 AI 判定
  await processUnit(aggResult.unit, virtualTime);
}

// 处理一个发言单元（步骤 ④-⑩）
async function processUnit(unit, virtualTime) {
  state.counters.aggregated++;
  const unitText = unit.texts.join(' ');
  const contextText = getContext(unit, virtualTime);

  state.logs.unshift({
    type: 'aggregated', virtualTime, group: unit.group, user: unit.user,
    text: unitText, at: unit.at, unit,
  });
  trimLogs();

  // ④ BERT 替身：相关性判定
  let relevance;
  const useAI = state.config.deepseek_key && state.config.ai_mode === 'builtin';
  if (useAI) {
    try {
      relevance = await judgeRelevance(unitText, contextText);
    } catch (e) {
      console.error('AI relevance error, fallback to rules:', e.message);
      relevance = ruleEngineRelevance(unitText);
    }
  } else {
    // 无 Key 时用规则引擎替身
    relevance = ruleEngineRelevance(unitText);
  }

  if (!relevance.relevant || relevance.confidence < state.config.tau) {
    state.counters.bert_fail++;
    state.logs.unshift({
      type: 'bert_reject', virtualTime, group: unit.group, user: unit.user,
      text: unitText, confidence: relevance.confidence, tau: state.config.tau,
    });
    trimLogs();
    return;
  }

  state.counters.bert_pass++;

  // ⑤ DeepSeek 解析
  let parsed;
  if (useAI) {
    try {
      parsed = await parseDemand(unitText, contextText);
    } catch (e) {
      console.error('AI parse error, fallback to rules:', e.message);
      parsed = ruleEngineParse(unitText);
    }
  } else {
    parsed = ruleEngineParse(unitText);
  }
  state.counters.parsed++;

  // 吐槽出局
  if (parsed.intent === 'complain') {
    state.logs.unshift({
      type: 'complain_out', virtualTime, group: unit.group, user: unit.user,
      text: unitText, parsed,
    });
    trimLogs();
    return;
  }

  // ⑥ 需求去重与频控
  const dupResult = dedup(unit.group, parsed.category);
  let demand;
  if (dupResult.isDuplicate) {
    state.counters.deduped++;
    demand = dupResult.demand;
    state.logs.unshift({
      type: 'deduped', virtualTime, group: unit.group, user: unit.user,
      text: unitText, heat: demand.heat, category: parsed.category,
    });
    trimLogs();
    // 已响应过的不重复触发
    if (dupResult.alreadyResponded) return;
  } else {
    demand = createDemand(unit, parsed, virtualTime);
  }

  // 频控
  const freqResult = checkFreq(unit.group, unit.at);
  if (!freqResult.allowed) {
    state.counters.freq_blocked++;
    demand.status = 'queued';
    state.logs.unshift({
      type: 'freq_blocked', virtualTime, group: unit.group, user: unit.user,
      text: unitText, reason: freqResult.reason,
    });
    trimLogs();
    return;
  }

  // ⑦ 分流决策
  const routeDecision = route(demand, relevance);
  if (unit.at) state.counters.routed_at++;
  else state.counters.routed_non_at++;

  // ⑧⑨ 商品获取 + 响应执行
  const execResult = execute(demand, routeDecision);
  if (execResult.executed) {
    state.counters.responded++;
    consumeFreq(unit.group, unit.at);
    demand.status = 'responded';
    demand.responseId = execResult.response.id;

    state.logs.unshift({
      type: 'responded', virtualTime, group: unit.group, user: unit.user,
      text: unitText, outlet: routeDecision.outlet,
      product: execResult.response.product?.name,
      result: execResult.response.result,
    });
  }

  // ⑩ 数据回流（日志已记录，需求状态已更新）
  trimLogs();
}

// 回放结束后强制打包所有窗口
export async function flushRemaining() {
  const units = flushAll();
  for (const unit of units) {
    await processUnit(unit, state.messages[state.messages.length - 1]?.t || 0);
  }
}

function trimLogs() {
  if (state.logs.length > 200) state.logs = state.logs.slice(0, 200);
}
