import { mock } from './mock.js';

const API = '/api';

// 演示模式开关：一旦真实后端不可达，就切换到内置演示数据，
// 之后所有请求直接走 mock，避免每 2 秒轮询都白白失败一次。
let offline = false;

async function fetchJSON(url, opts = {}) {
  const resp = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!resp.ok) throw new Error(`API ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

async function guarded(name, realFn, ...args) {
  if (offline) return mock[name](...args);
  try {
    return await realFn();
  } catch (e) {
    offline = true;
    console.info('[演示模式] 后端不可达，已切换内置演示数据');
    return mock[name](...args);
  }
}

export const api = {
  // 消息回放
  startReplay: (speed = 1) => guarded('startReplay', () => fetchJSON('/replay/start', { method: 'POST', body: JSON.stringify({ speed }) }), speed),
  pauseReplay: () => guarded('pauseReplay', () => fetchJSON('/replay/pause', { method: 'POST' })),
  resumeReplay: () => guarded('resumeReplay', () => fetchJSON('/replay/resume', { method: 'POST' })),
  resetReplay: () => guarded('resetReplay', () => fetchJSON('/replay/reset', { method: 'POST' })),
  setSpeed: (speed) => guarded('setSpeed', () => fetchJSON('/replay/speed', { method: 'POST', body: JSON.stringify({ speed }) }), speed),
  getReplayStatus: () => guarded('getReplayStatus', () => fetchJSON('/replay/status')),
  flushReplay: () => guarded('flushReplay', () => fetchJSON('/replay/flush', { method: 'POST' })),

  // 实时数据
  getStream: (since = 0) => guarded('getStream', () => fetchJSON(`/stream?since=${since}`), since),
  getDemands: () => guarded('getDemands', () => fetchJSON('/demands')),
  updateDemand: (id, patch) => guarded('updateDemand', () => fetchJSON(`/demands/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }), id, patch),
  getResponses: () => guarded('getResponses', () => fetchJSON('/responses')),
  getSchedule: () => guarded('getSchedule', () => fetchJSON('/schedule')),

  // 策略配置
  getConfig: () => guarded('getConfig', () => fetchJSON('/config')),
  updateConfig: (config) => guarded('updateConfig', () => fetchJSON('/config', { method: 'PUT', body: JSON.stringify(config) }), config),
  testAI: () => guarded('testAI', () => fetchJSON('/config/test-ai', { method: 'POST' })),

  // 基础数据
  getGroups: () => guarded('getGroups', () => fetchJSON('/groups')),
  getProducts: () => guarded('getProducts', () => fetchJSON('/products')),

  // 效果看板
  getDashboard: () => guarded('getDashboard', () => fetchJSON('/dashboard')),
};
