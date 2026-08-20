import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export default function ConfigPage({ config, tick }) {
  const [form, setForm] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (config) setForm({ ...config, deepseek_key: '', dify_key: '' });
    api.getGroups().then(setGroups).catch(() => {});
  }, [config]);

  if (!form) return <div className="empty">加载配置中…</div>;

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    await api.updateConfig(form);
    alert('配置已保存');
  };
  const testAI = async () => {
    setTesting(true);
    setTestResult(null);
    const r = await api.testAI();
    setTestResult(r);
    setTesting(false);
  };
  const toggleWhitelist = (id) => {
    const wl = new Set(form.whitelist);
    if (wl.has(id)) wl.delete(id); else wl.add(id);
    update('whitelist', [...wl]);
  };

  return (
    <div className="grid two">
      <div className="card">
        <h3>触发规则与聚合参数 <span className="fchip">F-07</span></h3>
        <div className="desc">承载试点项目的基本要求：可灰度（白名单逐步放量）、可回收（艾特开关一键关停）。</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label>意图置信阈值 τ <b style={{ color: 'var(--ink)' }}>{form.tau.toFixed(2)}</b>
            <input type="range" min="0.5" max="0.95" step="0.05" value={form.tau} onChange={e => update('tau', +e.target.value)} style={{ width: '100%' }} />
          </label>
          <label>静默时间 T_静默（秒）
            <input type="number" value={form.t_silence} onChange={e => update('t_silence', +e.target.value)} style={{ width: 80 }} />
          </label>
          <label>累计上限 T_上限（秒）
            <input type="number" value={form.t_max} onChange={e => update('t_max', +e.target.value)} style={{ width: 80 }} />
          </label>
          <label>回看时长 T_回看（秒）
            <input type="number" value={form.t_lookback} onChange={e => update('t_lookback', +e.target.value)} style={{ width: 80 }} />
          </label>
          <label>每群每日非艾特响应上限 N
            <input type="number" value={form.n_freq} onChange={e => update('n_freq', +e.target.value)} style={{ width: 80 }} />
          </label>
          <label>去重窗口（小时）
            <input type="number" value={form.dedup_window / 3600} onChange={e => update('dedup_window', +e.target.value * 3600)} style={{ width: 80 }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.at_switch} onChange={e => update('at_switch', e.target.checked)} />
            艾特响应开关（一键关停）
          </label>
        </div>
        <button className="btn btn-pri" style={{ marginTop: 14 }} onClick={save}>保存配置</button>
      </div>

      <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
        <div className="card">
          <h3>AI 服务配置 <span className="fchip">F-04</span></h3>
          <div className="desc">密钥仅存后端，不回显前端。当前状态：{config?.deepseek_key ? <span className="tag t-ok">已配置 DeepSeek</span> : <span className="tag t-warn">未配置（使用规则替身）</span>}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label>调用模式
              <select value={form.ai_mode} onChange={e => update('ai_mode', e.target.value)}>
                <option value="builtin">内置直调 DeepSeek</option>
                <option value="dify">Dify 工作流 API</option>
              </select>
            </label>
            {form.ai_mode === 'builtin' ? (
              <>
                <label>DeepSeek API Key（填入新 Key 更换）
                  <input type="password" value={form.deepseek_key} onChange={e => update('deepseek_key', e.target.value)} placeholder="sk-..." style={{ width: '100%' }} />
                </label>
                <label>模型
                  <select value={form.deepseek_model} onChange={e => update('deepseek_model', e.target.value)}>
                    <option value="deepseek-chat">deepseek-chat (V4 Flash)</option>
                    <option value="deepseek-reasoner">deepseek-reasoner</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label>Dify 工作流 URL
                  <input value={form.dify_url} onChange={e => update('dify_url', e.target.value)} placeholder="https://api.dify.ai/v1/workflows/run" style={{ width: '100%' }} />
                </label>
                <label>Dify API Key
                  <input type="password" value={form.dify_key} onChange={e => update('dify_key', e.target.value)} placeholder="app-..." style={{ width: '100%' }} />
                </label>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-pri" onClick={save}>保存</button>
            <button className="btn" onClick={testAI} disabled={testing}>{testing ? '测试中…' : '连通性测试'}</button>
          </div>
          {testResult && (
            <div style={{ marginTop: 10, padding: 8, borderRadius: 6, background: testResult.ok ? 'var(--ok-bg)' : 'var(--warn-bg)', fontSize: 12 }}>
              {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
            </div>
          )}
        </div>

        <div className="card">
          <h3>试点群白名单 <span className="fchip">F-01</span></h3>
          <div className="desc">只有白名单内的群消息进入平台。白名单从活跃群中选取。</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
            {groups.map(g => (
              <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.whitelist.includes(g.id)} onChange={() => toggleWhitelist(g.id)} />
                <span>{g.id} · {g.name}</span>
                <span className="tag t-dim">{g.layer}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
