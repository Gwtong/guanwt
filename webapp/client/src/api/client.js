const API = '/api';

async function fetchJSON(url, opts = {}) {
  const resp = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!resp.ok) throw new Error(`API ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

export const api = {
  // 消息回放
  startReplay: (speed = 1) => fetchJSON('/replay/start', { method: 'POST', body: JSON.stringify({ speed }) }),
  pauseReplay: () => fetchJSON('/replay/pause', { method: 'POST' }),
  resumeReplay: () => fetchJSON('/replay/resume', { method: 'POST' }),
  resetReplay: () => fetchJSON('/replay/reset', { method: 'POST' }),
  setSpeed: (speed) => fetchJSON('/replay/speed', { method: 'POST', body: JSON.stringify({ speed }) }),
  getReplayStatus: () => fetchJSON('/replay/status'),
  flushReplay: () => fetchJSON('/replay/flush', { method: 'POST' }),

  // 实时数据
  getStream: (since = 0) => fetchJSON(`/stream?since=${since}`),
  getDemands: () => fetchJSON('/demands'),
  updateDemand: (id, patch) => fetchJSON(`/demands/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  getResponses: () => fetchJSON('/responses'),
  getSchedule: () => fetchJSON('/schedule'),

  // 策略配置
  getConfig: () => fetchJSON('/config'),
  updateConfig: (config) => fetchJSON('/config', { method: 'PUT', body: JSON.stringify(config) }),
  testAI: () => fetchJSON('/config/test-ai', { method: 'POST' }),

  // 基础数据
  getGroups: () => fetchJSON('/groups'),
  getProducts: () => fetchJSON('/products'),

  // 效果看板
  getDashboard: () => fetchJSON('/dashboard'),
};
