export default function Sidebar({ page, setPage, replay, onReplayAction, config, productCount = 0, flow = { paused: false }, onFlowAction, onLogout }) {
  const items = [
    { id: 'stream', icon: '⚡', label: '实时需求收集', group: '运营管理' },
    { id: 'pool', icon: '▤', label: '需求池管理', group: '运营管理' },
    { id: 'responses', icon: '▥', label: '响应记录', group: '运营管理' },
    { id: 'cart', icon: '🛒', label: `商品池 (${productCount})`, group: '商品与选品' },
    { id: 'config', icon: '⚙', label: '策略配置', group: '系统' },
    { id: 'dashboard', icon: '◉', label: '效果看板', group: '效果评估' },
  ];
  let lastGroup = '';

  return (
    <aside className="sidebar">
      <div className="side-logo">
        <div className="lg">管</div>
        <div><b>管PM</b><small>京东社群快速响应 · 产品经理自建</small></div>
      </div>
      <nav className="nav">
        {items.map(it => {
          const showGroup = it.group !== lastGroup;
          lastGroup = it.group;
          return (
            <div key={it.id}>
              {showGroup && <div className="nav-group">{it.group}</div>}
              <button className={`nav-item ${page === it.id ? 'on' : ''}`} onClick={() => setPage(it.id)}>
                <span className="ic">{it.icon}</span>{it.label}
              </button>
            </div>
          );
        })}
      </nav>
      <div className="replay-ctrl">
        <div style={{ color: 'var(--faint)', fontSize: '11px', letterSpacing: '2px', marginBottom: 4 }}>自动聊天流 · 与微信演示页同步</div>
        <div style={{ color: 'var(--ink)', fontSize: '12px' }}>
          消息只来自演示页，本平台不自行造消息
        </div>
        <div className="btns">
          {flow.paused ? (
            <button className="rbtn on" onClick={() => onFlowAction('resume')}>▶ 开始</button>
          ) : (
            <button className="rbtn on" onClick={() => onFlowAction('pause')}>⏸ 暂停</button>
          )}
          <button className="rbtn" onClick={() => onReplayAction('reset')}>↻ 重置</button>
        </div>
        <div className="btns" style={{ marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--side-sub)' }}>
            {flow.paused ? '已暂停：两端都不再产生/接收新消息' : '运行中：微信侧的聊天实时流入'}
          </span>
        </div>
      </div>
      <div className="side-foot">
        <div className="row"><span>AI 引擎</span><b className={config?.deepseek_key ? 'ok' : 'bad'}>{config?.deepseek_key ? 'DeepSeek' : '内置引擎'}</b></div>
        <div className="row"><span>聊天流</span><b className={flow.paused ? 'bad' : 'ok'}>{flow.paused ? '已暂停' : '运行中'}</b></div>
        {onLogout && <button className="side-logout" onClick={onLogout}>退出登录</button>}
      </div>
    </aside>
  );
}
