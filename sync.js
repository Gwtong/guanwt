// 受控同步脚本：SSOT.md §2 参数表 → 镜像文件
// 用法：node sync.js
// 作用：解析 SSOT.md 的策略参数当前值，同步到 state.js(config) 与 schema/config.md，
//       自动追加 CHANGELOG 一行并 git commit。改一处，其他处随之变，且有记录、可找回。
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SSOT = path.join(ROOT, 'SSOT.md');
const STATE = path.join(ROOT, 'webapp/server/state.js');
const SCHEMA = path.join(ROOT, 'schema/config.md');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');

// 只同步纯值字段（避开含斜杠说明的 ai_mode / 空值的 key 类）
const SYNC_FIELDS = ['whitelist', 'tau', 't_silence', 't_max', 't_lookback', 'n_freq', 'at_switch', 'dedup_window'];

// 读 SSOT §2 参数表 → {field: rawValue}
function parseSSOT() {
  const txt = fs.readFileSync(SSOT, 'utf8');
  const sec = txt.split('## 2. 策略参数当前值')[1].split('\n## 3.')[0];
  const map = {};
  const re = /^\|\s*`(\w+)`\s*\|\s*`([^`]+)`\s*\|/;
  for (const line of sec.split('\n')) {
    const m = line.match(re);
    if (m && SYNC_FIELDS.includes(m[1])) map[m[1]] = m[2].trim();
  }
  return map;
}

// 生成 state.js 里该字段的 JS 字面量
function jsVal(field, raw) {
  if (field === 'dedup_window') return '24 * 3600'; // SSOT 写 86400，代码里是 24*3600
  const v = raw.trim();
  if (v.startsWith('[')) return v;                 // 数组字面
  if (v === 'true' || v === 'false') return v;     // 布尔
  if (!isNaN(Number(v))) return String(Number(v)); // 数字
  return `'${v}'`;                                  // 字符串
}

// 生成 schema 表里该字段的默认值单元格（反引号包裹，去内部单引号）
function schemaVal(raw) {
  return '`' + raw.trim().replace(/'/g, '') + '`';
}

// 逐行解析 state.js，替换 config 块内字段值（坏数据也能自愈）
function syncState(SSOTmap) {
  const lines = fs.readFileSync(STATE, 'utf8').split('\n');
  const changes = [];
  for (const f of SYNC_FIELDS) {
    if (!(f in SSOTmap)) continue;
    const target = jsVal(f, SSOTmap[f]);
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(new RegExp('^\\s*' + f + ':\\s*(.+?)(?:,\\s*)?$'));
      if (!m) continue;
      const oldRaw = m[1].trim();
      if (oldRaw === target) break;
      lines[i] = lines[i].replace(new RegExp('(^\\s*' + f + ':\\s*)(.+?)(?:,\\s*)?$'), '$1' + target + ',');
      changes.push({ file: 'webapp/server/state.js', field: f, from: oldRaw, to: target });
      break;
    }
  }
  if (changes.length) fs.writeFileSync(STATE, lines.join('\n'));
  return changes;
}

// 替换 schema/config.md 表格里 field 行的第三个反引号单元格
function syncSchema(SSOTmap) {
  const lines = fs.readFileSync(SCHEMA, 'utf8').split('\n');
  const changes = [];
  for (const f of SYNC_FIELDS) {
    if (!(f in SSOTmap)) continue;
    const target = schemaVal(SSOTmap[f]);
    for (let i = 0; i < lines.length; i++) {
      const lineRe = new RegExp('^\\|\\s*`' + '`' + f + '`' + '\\s*\\|[^|]*\\|\\s*`[^`]*`');
      const m = lines[i].match(lineRe);
      if (!m) continue;
      const oldCell = m[0].match(/`([^`]*)`\s*$/);
      if (oldCell && '`' + oldCell[1] + '`' === target) break;
      lines[i] = lines[i].replace(/`[^`]*`\s*$/, target);
      changes.push({ file: 'schema/config.md', field: f, from: oldCell ? oldCell[1] : '?', to: SSOTmap[f].replace(/'/g, '') });
      break;
    }
  }
  if (changes.length) fs.writeFileSync(SCHEMA, lines.join('\n'));
  return changes;
}

function appendChangelog(allChanges) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = allChanges.map(c => `- ${c.file} · ${c.field}: \`${c.from}\` → \`${c.to}\``).join('\n');
  const entry = `\n## [${date}] 同步（受控）\n- 来源：SSOT.md §2 策略参数当前值\n${lines}\n- 提交：本次同步（git log 最新一条即对应）\n`;
  fs.appendFileSync(CHANGELOG, entry);
}

// ---- 主流程 ----
const map = parseSSOT();
const c1 = syncState(map);
const c2 = syncSchema(map);
const all = [...c1, ...c2];

if (!all.length) {
  console.log('✓ 无变化：SSOT 与各镜像当前值一致，无需同步。');
  process.exit(0);
}

console.log('同步明细（改了这些值）：');
all.forEach(c => console.log(`  ${c.file}  ${c.field}: ${c.from} → ${c.to}`));

appendChangelog(all);
execSync('git add -A', { cwd: ROOT, stdio: 'ignore' });
execSync('git -c user.email=pm@local -c user.name=guanPM commit -q -m "sync: ' + all.map(c => c.field).join(',') + '"', { cwd: ROOT, stdio: 'ignore' });
const hash = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();

console.log('\n✓ 已同步并提交（' + hash + '）。CHANGELOG 已追加一条记录。');
console.log('  想退回这一步：git revert ' + hash + '  或  git checkout ' + hash + '^ -- .');
