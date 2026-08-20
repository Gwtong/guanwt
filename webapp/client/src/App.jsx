import { useState, useEffect, useCallback } from 'react';
import { api } from './api/client.js';
import Sidebar from './components/Sidebar.jsx';
import StreamPage from './components/StreamPage.jsx';
import DemandPoolPage from './components/DemandPoolPage.jsx';
import ResponseRecordsPage from './components/ResponseRecordsPage.jsx';
import ConfigPage from './components/ConfigPage.jsx';
import DashboardPage from './components/DashboardPage.jsx';

const PAGES = {
  stream: { title: '实时需求收集', comp: StreamPage },
  pool: { title: '需求池管理', comp: DemandPoolPage },
  responses: { title: '响应记录', comp: ResponseRecordsPage },
  config: { title: '策略配置', comp: ConfigPage },
  dashboard: { title: '效果看板', comp: DashboardPage },
};

export default function App() {
  const [page, setPage] = useState('stream');
  const [replay, setReplay] = useState({ playing: false, speed: 1, cursor: 0, total: 0, progress: 0 });
  const [config, setConfig] = useState(null);
  const [tick, setTick] = useState(0);

  // 轮询回放状态 + 实时数据（驱动所有页面刷新）
  useEffect(() => {
    let timer;
    const poll = async () => {
      try {
        const [r, c] = await Promise.all([api.getReplayStatus(), api.getConfig()]);
        setReplay(r); setConfig(c);
      } catch (e) { /* 后端未启动 */ }
    };
    poll();
    timer = setInterval(() => { poll(); setTick(t => t + 1); }, 2000);
    return () => clearInterval(timer);
  }, []);

  const replayAction = useCallback(async (action, ...args) => {
    const actions = {
      start: () => api.startReplay(args[0] || 5),
      pause: () => api.pauseReplay(),
      resume: () => api.resumeReplay(),
      reset: () => api.resetReplay(),
      speed: () => api.setSpeed(args[0]),
    };
    if (actions[action]) {
      await actions[action]();
      const r = await api.getReplayStatus();
      setReplay(r);
    }
  }, []);

  const PageComp = PAGES[page].comp;

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} replay={replay} onReplayAction={replayAction} config={config} />
      <div className="main">
        <header className="header">
          <div className="crumb">管PM · 京东社群快速响应平台 <b>{PAGES[page].title}</b></div>
          <div className="hright">
            <span className="demo-chip">演示版 DEMO</span>
            <span className="clock">{new Date().toLocaleTimeString('zh-CN', { hour12: false })}</span>
            <div className="user"><div className="av">林</div><span>林运营</span></div>
          </div>
        </header>
        <div className="content">
          <PageComp replay={replay} onReplayAction={replayAction} config={config} tick={tick} />
        </div>
      </div>
    </div>
  );
}
