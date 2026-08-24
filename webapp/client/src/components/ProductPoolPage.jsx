import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const chipBase = { fontSize: 11, color: 'var(--sub)', background: '#fff', border: '1px solid var(--line)', borderRadius: 999, padding: '3px 11px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };
const chipOn = { ...chipBase, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' };

export default function ProductPoolPage() {
  const [products, setProducts] = useState([]);
  const [cat, setCat] = useState('all');
  const [kw, setKw] = useState('');

  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => {});
  }, []);

  // 分类统计
  const catCount = {};
  products.forEach(p => { catCount[p.cat] = (catCount[p.cat] || 0) + 1; });
  const cats = Object.keys(catCount).sort((a, b) => catCount[b] - catCount[a]);

  const list = products.filter(p =>
    (cat === 'all' || p.cat === cat) &&
    (!kw.trim() || p.name.includes(kw.trim()))
  );

  return (
    <div>
      <div className="card">
        <h3>🛒 商品池 · 购物车 <span className="fchip">共 {products.length} 件</span></h3>
        <div className="desc">
          机器人推品、排期替换、群主选品池都来自这里；群友点开推广链接即进入购物车页。
          发布前先看池子里有多少货、覆盖哪些品类。
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={cat === 'all' ? chipOn : chipBase} onClick={() => setCat('all')}>全部 ({products.length})</span>
          {cats.map(c => (
            <span key={c} style={cat === c ? chipOn : chipBase} onClick={() => setCat(c)}>{c} ({catCount[c]})</span>
          ))}
        </div>
        <input
          value={kw}
          onChange={e => setKw(e.target.value)}
          placeholder="搜索商品名，如：保温杯 / 猫粮…"
          style={{ width: 260 }}
        />
      </div>

      {list.length === 0 ? (
        <div className="card mt"><div className="empty">该分类/关键词暂无商品</div></div>
      ) : (
        <div className="grid three mt">
          {list.map(p => (
            <div key={p.id} className="card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <b style={{ fontSize: 13, lineHeight: 1.4 }}>{p.name}</b>
                <span className="tag t-ok" style={{ flex: 'none' }}>¥{p.price}</span>
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                <span className="tag t-exp">{p.cat}</span>
                <span className="tag t-dim">佣金 {p.comm}%</span>
                <span className="tag t-dim">{p.id}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8, wordBreak: 'break-all' }}>
                推广链接：https://jd.com/product/{p.id}?src=quickresp
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
