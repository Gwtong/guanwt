import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const TYPE_META = {
  filtered: { label: '噪声过滤', tag: 't-dim' },
  aggregating: { label: '聚合中', tag: 't-exp' },
  aggregated: { label: '聚合打包', tag: 't-exp' },
  bert_reject: { label: '相关性拦截', tag: 't-warn' },
  complain_out: { label: '吐槽出局', tag: 't-warn' },
  deduped: { label: '去重', tag: 't-dim' },
  freq_blocked: { label: '频控', tag: 't-warn' },
  responded: { label: '已响应', tag: 't-up' },
};

const chipBase = { fontSize: 11, color: 'var(--sub)', background: '#fff', border: '1px solid var(--line)', borderRadius: 999, padding: '3px 11px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };
const chipOn = { ...chipBase, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' };

export default function StreamPage({ replay, tick }) {
  const [data, setData] = useState({ logs: [] });
  const [groups, setGroups] = useState([]);
  const [gf, setGf] = useState('all');

  useEffect(() => {
    api.getStream(0).then(setData).catch(() => {});
  }, [tick, replay.cursor]);

  useEffect(() => {
    api.getGroups().then(setGroups).catch(() => {});
  }, []);

  const groupMap = Object.fromEntries((groups || []).map(g => [g.id, g.name]));
  const logs = (data.logs || []).filter(l => gf === 'all' || l.group === gf);

  return (
    <div>

      <div className="card mt">
        <h3><span className="live-dot"></span>实时消息处理流 <span className="fchip">F-02</span></h3>
        <div className="desc">按群筛选，每条消息标注来源群。AI 每一步判了什么，运营全程可见。</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={gf === 'all' ? chipOn : chipBase} onClick={() => setGf('all')}>全部群</span>
          {(groups || []).map(g => (
            <span key={g.id} style={gf === g.id ? chipOn : chipBase} onClick={() => setGf(g.id)}>{g.name}</span>
          ))}
        </div>
        {logs.length === 0 ? (
          <div className="empty">该群暂无处理日志，等消息流入即可看到（也可点击侧栏「▶ 开始」回放）</div>
        ) : (
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {logs.map((log, i) => {
              const meta = TYPE_META[log.type] || { label: log.type, tag: 't-dim' };
              const gname = groupMap[log.group] || log.group;
              return (
                <div key={i} className="log-item">
                  <span className="lt mono">T+{log.virtualTime}s</span>
                  <div className="lb">
                    <div className="ltxt">
                      <span style={{ color: 'var(--sub)', fontSize: 11 }}>{log.user} · </span>
                      <span className="tag t-exp" style={{ marginRight: 4 }}>{gname}</span>
                      {log.text}
                    </div>
                    <div className="lmeta">
                      <span className={`tag ${meta.tag}`}>{meta.label}</span>
                      {log.reason && <span className="tag t-dim">{log.reason}</span>}
                      {log.confidence != null && <span className="tag t-dim">置信 {log.confidence.toFixed(2)}</span>}
                      {log.at && <span className="tag t-up">艾特</span>}
                      {log.heat != null && <span className="tag t-dim">热度 +1 (总{log.heat})</span>}
                      {log.outlet && <span className="tag t-exp">{log.outlet === 'robot_push' ? '机器人推品' : log.outlet === 'triple' ? '三路并行' : 'Push群主'}</span>}
                      {log.product && <span className="tag t-exp">{log.product}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
