import { useState, useEffect, useCallback } from 'react';
import { api, auth, setOpsToken, getOpsToken } from './api/client.js';
import Sidebar from './components/Sidebar.jsx';
import StreamPage from './components/StreamPage.jsx';
import DemandPoolPage from './components/DemandPoolPage.jsx';
import ResponseRecordsPage from './components/ResponseRecordsPage.jsx';
import ConfigPage from './components/ConfigPage.jsx';
import DashboardPage from './components/DashboardPage.jsx';
import ProductPoolPage from './components/ProductPoolPage.jsx';

const PAGES = {
  stream: { title: '实时需求收集', comp: StreamPage },
  pool: { title: '需求池管理', comp: DemandPoolPage },
  responses: { title: '响应记录', comp: ResponseRecordsPage },
  cart: { title: '商品池', comp: ProductPoolPage },
  config: { title: '策略配置', comp: ConfigPage },
  dashboard: { title: '效果看板', comp: DashboardPage },
};

export default function App() {
  const [page, setPage] = useState('stream');
  const [replay, setReplay] = useState({ playing: false, speed: 1, cursor: 0, total: 0, progress: 0 });
  const [config, setConfig] = useState(null);
  const [productCount, setProductCount] = useState(0);
  const [flow, setFlow] = useState({ paused: false });
  const [tick, setTick] = useState(0);
  const [locked, setLocked] = useState(null); // null=加载中, true=需登录, false=已放行
  const [authRequired, setAuthRequired] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');

  // 运营后台口令校验（F-29）
  useEffect(() => {
    auth.getStatus().then(st => {
      setAuthRequired(!!st.required);
      if (!st.required) { setLocked(false); return; }
      const t = getOpsToken();
      if (!t) { setLocked(true); return; }
      fetch('/api/config', { headers: { 'x-ops-token': t } })
        .then(r => { if (r.ok) setLocked(false); else { setOpsToken(''); setLocked(true); } })
        .catch(() => { setOpsToken(''); setLocked(true); });
    }).catch(() => setLocked(false));
  }, []);

  const doLogin = async () => {
    setPwErr('');
    const r = await auth.login(pw);
    if (r.ok) { setOpsToken(r.token); setLocked(false); setPw(''); }
    else setPwErr(r.error || '口令错误');
  };
  const doLogout = async () => {
    try { await auth.logout(); } catch (e) {}
    setOpsToken(''); setLocked(true);
  };

  // 轮询回放状态 + 实时数据（仅放行后运行，避免未登录时触发演示降级）
  useEffect(() => {
    if (locked !== false) return;
    let timer;
    const poll = async () => {
      try {
        const [r, c, cs] = await Promise.all([api.getReplayStatus(), api.getConfig(), api.getControlStatus()]);
        setReplay(r); setConfig(c); setFlow(cs || { paused: false });
      } catch (e) { /* 后端未启动 */ }
    };
    poll();
    timer = setInterval(() => { poll(); setTick(t => t + 1); }, 2000);
    return () => clearInterval(timer);
  }, [locked]);

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

  const flowAction = useCallback(async (action) => {
    try {
      if (action === 'pause') await api.setControlPause(true);
      else if (action === 'resume') await api.setControlPause(false);
      const cs = await api.getControlStatus();
      setFlow(cs || { paused: false });
    } catch (e) { /* 后端未启动 */ }
  }, []);

  if (locked === null) return <div className="empty" style={{ padding: 80 }}>正在校验访问权限…</div>;

  if (locked === true) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-logo"><div className="lg">管</div><b>管PM</b></div>
          <h2>运营后台登录</h2>
          <div className="desc" style={{ color: 'var(--sub)', fontSize: 12, marginBottom: 14 }}>本平台已启用访问口令（F-29）。请输入运营口令进入。</div>
          <input className="login-input" type="password" placeholder="运营口令" value={pw}
            onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} autoFocus />
          {pwErr && <div className="login-err">{pwErr}</div>}
          <button className="btn btn-pri login-btn" onClick={doLogin}>登录</button>
          <div className="note" style={{ marginTop: 12 }}>演示环境默认未设口令，可直接访问；此门禁由环境变量 OPS_PASSWORD 控制。</div>
        </div>
      </div>
    );
  }

  const PageComp = PAGES[page].comp;

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} replay={replay} onReplayAction={replayAction} config={config} productCount={productCount} flow={flow} onFlowAction={flowAction} onLogout={authRequired ? doLogout : null} />
      <div className="main">
        <header className="header">
          <div className="crumb">管PM · 京东社群快速响应平台 <b>{PAGES[page].title}</b></div>
          <div className="hright">
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
