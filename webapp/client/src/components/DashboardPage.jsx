import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export default function DashboardPage({ tick }) {
  const [dash, setDash] = useState(null);

  useEffect(() => {
    api.getDashboard().then(setDash).catch(() => {});
  }, [tick]);

  if (!dash) return <div className="empty">加载看板数据中…</div>;
  const c = dash.counters;

  const kpis = [
    ['消息接入', c.intake, '全部消息'],
    ['噪声过滤', c.filtered, `占比 ${c.intake ? (c.filtered / c.intake * 100).toFixed(0) : 0}%`],
    ['需求识别', c.parsed, '通过BERT+解析'],
    ['有效需求', dash.totalDemands, '去重后'],
    ['响应执行', dash.totalResponses, `响应率 ${dash.responseRate}`],
    ['排期替换', dash.scheduleReplacements, '非艾特出口'],
  ];

  const maxHeat = Math.max(1, ...Object.values(dash.heatDistribution || {}));

  return (
    <div>
      <div className="grid five">
        {kpis.map((k, i) => (
          <div key={i} className="card kpi">
            <div className="label">{k[0]}</div>
            <div className="val mono">{k[1]}</div>
            <div className="foot">{k[2]}</div>
          </div>
        ))}
      </div>

      <div className="grid two mt">
        <div className="card">
          <h3>管线漏斗 <span className="fchip">F-02 → F-06</span></h3>
          <div className="desc">从消息接入到响应执行的全链路转化。</div>
          {[
            ['消息接入', c.intake, 100, ''],
            ['通过前置过滤', c.intake - c.filtered, c.intake ? ((c.intake - c.filtered) / c.intake * 100) : 0, 'var(--accent)'],
            ['BERT 通过', c.bert_pass, c.intake ? (c.bert_pass / c.intake * 100) : 0, 'var(--accent)'],
            ['解析完成', c.parsed, c.intake ? (c.parsed / c.intake * 100) : 0, 'var(--accent)'],
            ['响应执行', c.responded, c.intake ? (c.responded / c.intake * 100) : 0, 'var(--up)'],
          ].map((r, i) => (
            <div key={i} className="hbar">
              <span>{r[0]}</span>
              <div className="tr"><i style={{ width: `${r[2]}%`, background: r[3] || undefined }}></i></div>
              <span className="vv mono">{r[1]}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>需求热度分布 <span className="fchip">F-05</span></h3>
          <div className="desc">同指纹需求的重复提及次数——热度是选品优先级与群主参考的直接信号。</div>
          {Object.keys(dash.heatDistribution || {}).length === 0 ? (
            <div className="empty">暂无需求数据</div>
          ) : (
            Object.entries(dash.heatDistribution).map(([cat, heat]) => (
              <div key={cat} className="hbar">
                <span>{cat}</span>
                <div className="tr"><i style={{ width: `${heat / maxHeat * 100}%` }}></i></div>
                <span className="vv mono">热度 {heat}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid three mt">
        <div className="card">
          <h3>分流统计 <span className="fchip">F-06</span></h3>
          <table>
            <tr><td style={{ color: 'var(--sub)' }}>艾特分流（秒级）</td><td className="mono" style={{ textAlign: 'right' }}>{c.routed_at}</td></tr>
            <tr><td style={{ color: 'var(--sub)' }}>非艾特分流（分钟级）</td><td className="mono" style={{ textAlign: 'right' }}>{c.routed_non_at}</td></tr>
            <tr><td style={{ color: 'var(--sub)' }}>频控拦截</td><td className="mono" style={{ textAlign: 'right' }}>{c.freq_blocked}</td></tr>
            <tr><td style={{ color: 'var(--sub)' }}>去重拦截</td><td className="mono" style={{ textAlign: 'right' }}>{c.deduped}</td></tr>
          </table>
        </div>
        <div className="card">
          <h3>响应率</h3>
          <div className="stat-big okc">{dash.responseRate}</div>
          <div style={{ color: 'var(--sub)', fontSize: 12, marginBottom: 10 }}>
            {dash.respondedDemands} / {dash.totalDemands} 需求已响应
          </div>
          <div className="note">排队中的需求将在频控额度释放后自动响应。</div>
        </div>
        <div className="card">
          <h3>需求-响应时长</h3>
          <div className="stat-big">{dash.avgResponseTime}<span style={{ fontSize: 14 }}>s</span></div>
          <div style={{ color: 'var(--sub)', fontSize: 12, marginBottom: 10 }}>用户发言 → 品出现在群里</div>
          <div className="note">艾特场景为秒级，非艾特为分钟级～下一发品时点。</div>
        </div>
      </div>
    </div>
  );
}
