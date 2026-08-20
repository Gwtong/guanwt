// 消息回放器：按时间戳重放 JSON 消息，支持倍速、暂停
import state from '../state.js';
import { processMessage } from './pipeline.js';

let timer = null;

export function startReplay(speed = 1) {
  if (state.replay.playing) return;
  state.replay.playing = true;
  state.replay.speed = speed;
  state.replay.startedAt = Date.now();

  tick();
}

export function pauseReplay() {
  state.replay.playing = false;
  if (timer) { clearTimeout(timer); timer = null; }
  // 记录已播放的虚拟时间
  if (state.replay.startedAt) {
    state.replay.elapsedBase += (Date.now() - state.replay.startedAt) * state.replay.speed / 1000;
    state.replay.startedAt = null;
  }
}

export function resumeReplay() {
  if (state.replay.playing) return;
  state.replay.playing = true;
  state.replay.startedAt = Date.now();
  tick();
}

export function setSpeed(speed) {
  // 调速时需要结算已播放时间
  if (state.replay.playing && state.replay.startedAt) {
    state.replay.elapsedBase += (Date.now() - state.replay.startedAt) * state.replay.speed / 1000;
    state.replay.startedAt = Date.now();
  }
  state.replay.speed = speed;
  if (state.replay.playing) tick();
}

export function resetReplay() {
  pauseReplay();
  state.replay.cursor = 0;
  state.replay.elapsedBase = 0;
}

function getElapsed() {
  let elapsed = state.replay.elapsedBase;
  if (state.replay.playing && state.replay.startedAt) {
    elapsed += (Date.now() - state.replay.startedAt) * state.replay.speed / 1000;
  }
  return elapsed;
}

function tick() {
  if (!state.replay.playing) return;
  const messages = state.messages;
  const elapsed = getElapsed();

  // 发送所有 timestamp <= elapsed 的消息
  while (state.replay.cursor < messages.length && messages[state.replay.cursor].t <= elapsed) {
    const msg = messages[state.replay.cursor];
    state.replay.cursor++;
    // 异步处理，不阻塞回放
    processMessage(msg).catch(e => console.error('Pipeline error:', e));
  }

  if (state.replay.cursor >= messages.length) {
    // 回放完毕，检查是否还有未打包的聚合窗
    state.replay.playing = false;
    state.replay.startedAt = null;
    return;
  }

  // 计算下一条消息的时间差
  const nextMsg = messages[state.replay.cursor];
  const wait = Math.max(50, (nextMsg.t - elapsed) * 1000 / state.replay.speed);
  timer = setTimeout(() => tick(), Math.min(wait, 5000));
}

export function getReplayStatus() {
  return {
    playing: state.replay.playing,
    speed: state.replay.speed,
    cursor: state.replay.cursor,
    total: state.messages.length,
    progress: state.messages.length ? Math.round(state.replay.cursor / state.messages.length * 100) : 0,
  };
}
