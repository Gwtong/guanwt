import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const STATUS_TAG = { pending: 't-warn', responded: 't-ok', queued: 't-dim', expired: 't-dim' };
const STATUS_LABEL = { pending: '待响应', responded: '已响应', queued: '排队中', expired: '已过期' };
const INTENT_LABEL = { want_buy: '想买', ask_rec: '求推荐', compare: '比价', complain: '吐槽' };
const INTENTS = ['want_buy', 'ask_rec', 'compare', 'complain'];

export default function DemandPoolPage({ tick }) {
  const [demands, setDemands] = useState([]);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ corrected_intent: '', corrected_category: '', note: '' });

  useEffect(() => {
    api.getDemands().then(setDemands).catch(() => {});
  }, [tick]);

  const openEdit = (d) => {
    setForm({
      corrected_intent: d.corrected_intent || d.intent || '',
      corrected_category: d.corrected_category || d.category || '',
      note: d.note || '',
    });
    setEdit(d);
  };
  const saveEdit = async () => {
    if (!edit) return;
    await api.updateDemand(edit.id, form);
    setEdit(null);
    const fresh = await api.getDemands();
    setDemands(fresh);
  };

  return (
    <div>
      <div className="card">
        <h3>需求池管理 <span className="fchip">F-05</span></h3>
        <div className="desc">去重后的需求列表，按热度排序。人工纠错标记从本页回流，是模型迭代的语料入口（F-22）。</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12, color: 'var(--sub)' }}>
          <span>总计 {demands.length} 条需求</span>
          <span>·</span>
          <span>已响应 {demands.filter(d => d.status === 'responded').length}</span>
          <span>·</span>
          <span>排队中 {demands.filter(d => d.status === 'queued').length}</span>
          <span>·</span>
          <span>已纠错 {demands.filter(d => d.corrected_intent || d.corrected_category).length}</span>
        </div>
        {demands.length === 0 ? (
          <div className="empty">暂无需求，启动消息回放后需求将在此出现</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>需求 ID</th><th>所属群</th><th>用户</th><th>品类</th><th>意向</th>
                  <th>价格意向</th><th className="mono">热度</th><th>艾特</th><th>状态</th><th>原话</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                {demands.map(d => (
                  <tr key={d.id}>
                    <td className="mono" style={{ fontSize: 11 }}>{d.id.slice(0, 10)}</td>
                    <td>{d.group}</td>
                    <td>{d.user}</td>
                    <td>
                      <span className="tag t-dim">{d.category}</span>
                      {d.corrected_category && <span className="tag t-warn" title="人工纠错后的品类">→ {d.corrected_category}</span>}
                    </td>
                    <td>
                      <span className="tag t-exp">{INTENT_LABEL[d.intent] || d.intent}</span>
                      {d.corrected_intent && <span className="tag t-warn">→ {INTENT_LABEL[d.corrected_intent] || d.corrected_intent}</span>}
                    </td>
                    <td>{d.price_pref || <span style={{ color: 'var(--faint)' }}>—</span>}</td>
                    <td className="mono"><b>{d.heat}</b></td>
                    <td>{d.at ? <span className="tag t-up">艾特</span> : <span style={{ color: 'var(--faint)' }}>—</span>}</td>
                    <td><span className={`tag ${STATUS_TAG[d.status]}`}>{STATUS_LABEL[d.status]}</span></td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--sub)', fontSize: 11.5 }}>
                      {d.originalText}
                    </td>
                    <td>
                      <button className="mini-btn" onClick={() => openEdit(d)}>纠错</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edit && (
        <div className="modal-mask" onClick={() => setEdit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>需求纠错 <span className="fchip">F-22</span></h3>
            <div className="desc">原话：「{edit.originalText?.slice(0, 40)}{edit.originalText?.length > 40 ? '…' : ''}」</div>
            <label className="mf">修正意向
              <select value={form.corrected_intent} onChange={e => setForm(f => ({ ...f, corrected_intent: e.target.value }))}>
                {INTENTS.map(i => <option key={i} value={i}>{INTENT_LABEL[i]}（{i}）</option>)}
              </select>
            </label>
            <label className="mf">修正品类
              <input value={form.corrected_category} onChange={e => setForm(f => ({ ...f, corrected_category: e.target.value }))} placeholder="如：母婴/生鲜" />
            </label>
            <label className="mf">备注
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="纠错原因（回流语料）" />
            </label>
            <div className="modal-actions">
              <button className="btn" onClick={() => setEdit(null)}>取消</button>
              <button className="btn btn-pri" onClick={saveEdit}>保存纠错</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
