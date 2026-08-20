import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const TYPE_META = {
  filtered: { label: '噪声过滤', tag: 't-dim' },
  aggregating: { label: '聚合中', tag: 't-exp' },
  aggregated: { label: '聚合打包', tag: 't-exp' },
  bert_reject: { label: 'BERT拦截', tag: 't-warn' },
  complain_out: { label: '吐槽出局', tag: 't-warn' },
  deduped: { label: '去重', tag: 't-dim' },
  freq_blocked: { label: '频控', tag: 't-warn' },
  responded: { label: '已响应', tag: 't-up' },
};

export default function StreamPage({ replay, tick }) {
  const [data, setData] = useState({ logs: [], counters: {} });

  useEffect(() => {
    api.getStream(0).then(setData).catch(() => {});
  }, [tick, replay.cursor]);

  const steps = [
    ['接入', data.counters.intake || 0, 'F-02'],
    ['过滤', data.counters.filtered || 0, 'F-03'],
    ['聚合', data.counters.aggregated || 0, ''],
    ['BERT通过', data.counters.bert_pass || 0, 'F-04'],
    ['BERT拦截', data.counters.bert_fail || 0, ''],
    ['解析', data.counters.parsed || 0, 'F-04'],
    ['去重', data.counters.deduped || 0, 'F-05'],
    ['频控', data.counters.freq_blocked || 0, ''],
    ['艾特分流', data.counters.routed_at || 0, 'F-06'],
    ['非艾特', data.counters.routed_non_at || 0, ''],
    ['响应', data.counters.responded || 0, 'F-06'],
  ];

  return (
    <div>
      <div className="card">
        <h3>响应管线 · 十步链路实时计数 <span className="fchip">F-02 → F-06</span></h3>
        <div className="desc">前六步回答"值不值得响应"，后四步回答"怎么响应"。</div>
        <div className="pipe">
          {steps.map((s, i) => (
            <div key={i} className="pstep">
              <span className="pf fchip">{s[2]}</span>
              <div className="pl">{s[0]}</div>
              <div className="pv">{s[1]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt">
        <h3><span className="live-dot"></span>实时消息处理流 <span className="fchip">F-02</span></h3>
        <div className="desc">每条消息经过管线各环节的实时日志。AI 每一步判了什么，运营全程可见。</div>
        {data.logs.length === 0 ? (
          <div className="empty">暂无处理日志，点击侧栏「▶ 开始」启动消息回放</div>
        ) : (
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {data.logs.map((log, i) => {
              const meta = TYPE_META[log.type] || { label: log.type, tag: 't-dim' };
              return (
                <div key={i} className="log-item">
                  <span className="lt mono">T+{log.virtualTime}s</span>
                  <div className="lb">
                    <div className="ltxt">
                      <span style={{ color: 'var(--sub)', fontSize: 11 }}>{log.user} · {log.group} · </span>
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
