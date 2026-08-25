// 本地验证脚本：用 esbuild 把 worker.js 打包（内联 JSON 与 lib），
// 再用 Hono 的 app.request() 在内存里跑一遍关键端点，确认逻辑与上线一致。
// 不依赖 workerd 二进制（该二进制需从 github 下载，本环境被挡），同样能验证路由与业务。
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'jdqr-')), 'worker.bundle.mjs');
await build({
  entryPoints: ['src/worker.js'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  outfile: out,
  logLevel: 'error',
});

const mod = await import('file://' + out);
const app = mod.app;

const JSON_HEADERS = { 'content-type': 'application/json' };
async function call(method, path, body) {
  const res = await app.request(path, {
    method,
    headers: JSON_HEADERS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const checks = [];
async function expect(name, path, method = 'GET', body, assert) {
  const r = await call(method, path, body);
  let ok = r.status < 400;
  let detail = '';
  if (assert) {
    const a = assert(r.data);
    ok = ok && a.ok;
    detail = a.detail || '';
  }
  checks.push({ name, status: r.status, ok, detail, sample: typeof r.data === 'object' ? JSON.stringify(r.data).slice(0, 160) : r.data });
  console.log(`${ok ? '✅' : '❌'} ${name}  [${r.status}]  ${detail}`);
}

await expect('health', '/health');
await expect('ops/auth-status(开放)', '/api/ops/auth-status', 'GET', undefined, d => ({ ok: d.required === false, detail: 'required=' + d.required }));
await expect('groups(100组)', '/api/groups', 'GET', undefined, d => ({ ok: Array.isArray(d) && d.length === 100, detail: 'len=' + (d?.length) }));
await expect('products', '/api/products', 'GET', undefined, d => ({ ok: Array.isArray(d) && d.length > 0, detail: 'len=' + (d?.length) }));
await expect('demands(种子)', '/api/demands', 'GET', undefined, d => ({ ok: Array.isArray(d) && d.length > 0, detail: 'len=' + (d?.length) }));
await expect('config(掩码)', '/api/config', 'GET', undefined, d => ({ ok: typeof d.tau === 'number', detail: 'tau=' + d.tau }));
await expect('dashboard(pilot显著)', '/api/dashboard', 'GET', undefined, d => ({ ok: d.pilot && d.pilot.significant === true, detail: `lift=${d.pilot?.liftPct}% p=${d.pilot?.pValue} sig=${d.pilot?.significant}` }));
await expect('replay/status', '/api/replay/status');
await expect('ingest(相关消息)', '/api/ingest', 'POST', { group: 'G001', user: 'u_test', text: '有没有便宜点的红枣推荐一下' }, d => ({ ok: !!d, detail: 'verdict=' + (d?.verdict) }));
await expect('ingest(无关被拦)', '/api/ingest', 'POST', { group: 'G001', user: 'u_test', text: '哈哈哈哈斗图' }, d => ({ ok: d?.verdict === 'block', detail: 'verdict=' + (d?.verdict) }));
// 先用真实种子 id 测纠错 PATCH（x1 不存在会 404，那是正确行为）
const dem = await call('GET', '/api/demands');
const realId = Array.isArray(dem.data) && dem.data.length ? dem.data[0].id : null;
if (realId) {
  await expect('demand纠错PATCH(真实id)', '/api/demands/' + realId, 'PATCH', { corrected_intent: 'want_buy', corrected_category: '枣', note: '测试纠错' }, d => ({ ok: !!d && d.id === realId && d.corrected_intent === 'want_buy', detail: 'id=' + d?.id + ' corrected=' + d?.corrected_intent }));
} else {
  console.log('⚠️ 无种子需求，跳过纠错 PATCH 实测');
}

const failed = checks.filter(c => !c.ok);
console.log('\n=== 结果 ===');
console.log(`通过 ${checks.length - failed.length}/${checks.length}`);
if (failed.length) { console.log('失败项：', failed.map(f => f.name).join(', ')); process.exit(1); }
console.log('全部通过 ✅');
