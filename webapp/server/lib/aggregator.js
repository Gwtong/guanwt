// 会话式聚合窗：以静默为界，不按固定时长切片
// 来自第二课 §3.2
import state from '../state.js';

export function aggregate(msg, virtualTime) {
  // virtualTime = 消息的虚拟时间戳（秒）
  const key = `${msg.group}:${msg.user}`;
  let win = state.windows.get(key);

  // 艾特消息：立刻打包当前单元送去判定
  if (msg.at) {
    if (win) {
      win.texts.push(msg.text);
      win.at = true;
    } else {
      win = { group: msg.group, user: msg.user, texts: [msg.text], startTime: virtualTime, at: true };
    }
    state.windows.delete(key);
    return { packed: true, unit: win };
  }

  // 非艾特消息：追加进当前发言单元
  if (!win) {
    win = { group: msg.group, user: msg.user, texts: [msg.text], startTime: virtualTime, lastTime: virtualTime, at: false };
    state.windows.set(key, win);
    return { packed: false, unit: win };
  }

  win.texts.push(msg.text);
  win.lastTime = virtualTime;
  return { packed: false, unit: win };
}

// 定时检查：静默超时或累计时长到上限的窗口打包送判
// 由 pipeline 在每条消息到达时触发检查
export function checkTimeouts(virtualTime) {
  const packed = [];
  for (const [key, win] of state.windows) {
    const silence = virtualTime - (win.lastTime || win.startTime);
    const duration = virtualTime - win.startTime;
    if (silence >= state.config.t_silence || duration >= state.config.t_max) {
      state.windows.delete(key);
      packed.push(win);
    }
  }
  return packed;
}

// 强制打包所有窗口（回放结束时调用）
export function flushAll() {
  const packed = [];
  for (const [key, win] of state.windows) {
    packed.push(win);
  }
  state.windows.clear();
  return packed;
}

// 获取回看上下文：该用户近 T_回看 内已打包的单元
export function getContext(win, virtualTime) {
  const lookback = state.config.t_lookback;
  const contexts = [];
  // 从已处理的日志中查找同群同用户的历史单元
  for (const log of state.logs) {
    if (log.type === 'aggregated' &&
        log.unit.group === win.group &&
        log.unit.user === win.user &&
        virtualTime - log.virtualTime <= lookback) {
      contexts.push(log.unit.texts.join(' '));
    }
  }
  return contexts.join('\n');
}
