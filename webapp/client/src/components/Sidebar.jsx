export default function Sidebar({ page, setPage, replay, onReplayAction, config }) {
  const items = [
    { id: 'stream', icon: '⚡', label: '实时需求收集', group: '运营管理' },
    { id: 'pool', icon: '▤', label: '需求池管理', group: '运营管理' },
    { id: 'responses', icon: '▥', label: '响应记录', group: '运营管理' },
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
        <div style={{ color: '#8B97A5', fontSize: '11.5px', marginBottom: 4 }}>消息回放</div>
        <div style={{ color: '#fff', fontSize: '12px' }}>
          {replay.cursor}/{replay.total} 条 · {replay.progress}%
        </div>
        <div className="btns">
          {replay.playing ? (
            <button className="rbtn" onClick={() => onReplayAction('pause')}>⏸ 暂停</button>
          ) : replay.cursor < replay.total ? (
            replay.cursor > 0 ? (
              <button className="rbtn" onClick={() => onReplayAction('resume')}>▶ 继续</button>
            ) : (
              <button className="rbtn on" onClick={() => onReplayAction('start', 5)}>▶ 开始</button>
            )
          ) : null}
          <button className="rbtn" onClick={() => onReplayAction('reset')}>↻ 重置</button>
        </div>
        <div className="btns" style={{ marginTop: 4 }}>
          {[1, 5, 10, 20].map(s => (
            <button key={s} className={`rbtn ${replay.speed === s ? 'on' : ''}`} onClick={() => onReplayAction('speed', s)}>{s}x</button>
          ))}
        </div>
      </div>
      <div className="side-foot">
        <div className="row"><span>AI 引擎</span><b className={config?.deepseek_key ? 'ok' : 'bad'}>{config?.deepseek_key ? 'DeepSeek' : '规则替身'}</b></div>
        <div className="row"><span>回放状态</span><b className={replay.playing ? 'ok' : ''}>{replay.playing ? '运行中' : '已停止'}</b></div>
      </div>
    </aside>
  );
}
