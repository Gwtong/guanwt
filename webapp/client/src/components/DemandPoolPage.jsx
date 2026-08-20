import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const STATUS_TAG = { pending: 't-warn', responded: 't-ok', queued: 't-dim', expired: 't-dim' };
const STATUS_LABEL = { pending: '待响应', responded: '已响应', queued: '排队中', expired: '已过期' };
const INTENT_LABEL = { want_buy: '想买', ask_rec: '求推荐', compare: '比价', complain: '吐槽' };

export default function DemandPoolPage({ tick }) {
  const [demands, setDemands] = useState([]);

  useEffect(() => {
    api.getDemands().then(setDemands).catch(() => {});
  }, [tick]);

  return (
    <div>
      <div className="card">
        <h3>需求池管理 <span className="fchip">F-05</span></h3>
        <div className="desc">去重后的需求列表，按热度排序。人工纠错标记从本页回流，是模型迭代的语料入口。</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12, color: 'var(--sub)' }}>
          <span>总计 {demands.length} 条需求</span>
          <span>·</span>
          <span>已响应 {demands.filter(d => d.status === 'responded').length}</span>
          <span>·</span>
          <span>排队中 {demands.filter(d => d.status === 'queued').length}</span>
        </div>
        {demands.length === 0 ? (
          <div className="empty">暂无需求，启动消息回放后需求将在此出现</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>需求 ID</th><th>所属群</th><th>用户</th><th>品类</th><th>意向</th>
                  <th>价格意向</th><th className="mono">热度</th><th>艾特</th><th>状态</th><th>原话</th>
                </tr>
              </thead>
              <tbody>
                {demands.map(d => (
                  <tr key={d.id}>
                    <td className="mono" style={{ fontSize: 11 }}>{d.id.slice(0, 10)}</td>
                    <td>{d.group}</td>
                    <td>{d.user}</td>
                    <td><span className="tag t-dim">{d.category}</span></td>
                    <td><span className="tag t-exp">{INTENT_LABEL[d.intent] || d.intent}</span></td>
                    <td>{d.price_pref || <span style={{ color: 'var(--faint)' }}>—</span>}</td>
                    <td className="mono"><b>{d.heat}</b></td>
                    <td>{d.at ? <span className="tag t-up">艾特</span> : <span style={{ color: 'var(--faint)' }}>—</span>}</td>
                    <td><span className={`tag ${STATUS_TAG[d.status]}`}>{STATUS_LABEL[d.status]}</span></td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--sub)', fontSize: 11.5 }}>
                      {d.originalText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
