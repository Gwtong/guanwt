import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const OUTLET_LABEL = {
  robot_push: '机器人即时推品',
  triple: '三路并行（置顶+Push+排期替换）',
  push_owner: 'Push 群主回复',
  discard: '丢弃',
};

export default function ResponseRecordsPage({ tick }) {
  const [responses, setResponses] = useState([]);
  const [schedule, setSchedule] = useState({ schedule: [], replacements: [] });

  useEffect(() => {
    api.getResponses().then(setResponses).catch(() => {});
    api.getSchedule().then(setSchedule).catch(() => {});
  }, [tick]);

  return (
    <div>
      <div className="grid two">
        <div className="card">
          <h3>响应记录 <span className="fchip">F-06</span></h3>
          <div className="desc">每条需求走了哪个出口、推荐返回的候选品、发送结果。</div>
          {responses.length === 0 ? (
            <div className="empty">暂无响应记录</div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {responses.map(r => (
                <div key={r.id} className="log-item">
                  <div className="lb">
                    <div style={{ fontSize: 11, color: 'var(--faint)' }}>{r.group} · {r.user} · {r.at ? '艾特' : '非艾特'}</div>
                    <div className="ltxt" style={{ fontSize: 11.5, color: 'var(--sub)', marginBottom: 4 }}>
                      「{r.originalText?.slice(0, 30)}{r.originalText?.length > 30 ? '…' : ''}」
                    </div>
                    <div className="lmeta">
                      <span className="tag t-exp">{OUTLET_LABEL[r.outlet] || r.outlet}</span>
                      <span className="tag t-up">{r.product?.name} ¥{r.product?.price}</span>
                      <span className="tag t-dim">佣金 {r.product?.commission_pct}%</span>
                    </div>
                    {r.result && (
                      <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 4, lineHeight: 1.5 }}>{r.result}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>排期替换记录 <span className="fchip">F-06</span></h3>
          <div className="desc">非艾特需求品替换下一次定时发品的原计划品——替换而非追加，发品节奏不变。</div>
          {schedule.replacements?.length === 0 ? (
            <div className="empty">暂无排期替换</div>
          ) : (
            <table>
              <thead>
                <tr><th>群</th><th>原计划品</th><th>替换为</th><th>时点</th></tr>
              </thead>
              <tbody>
                {schedule.replacements?.map((r, i) => (
                  <tr key={i}>
                    <td className="mono">{r.group}</td>
                    <td><span style={{ color: 'var(--faint)', textDecoration: 'line-through' }}>{r.original}</span></td>
                    <td><span className="tag t-up">{r.replacement}</span></td>
                    <td className="mono">{r.slot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="note">排期替换是"用户视角看到的仍是一次正常发品"——变的只是发什么，不是发不发。</div>
        </div>
      </div>
    </div>
  );
}
