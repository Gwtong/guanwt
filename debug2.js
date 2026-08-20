const fs = require('fs');
const SCHEMA = 'schema/config.md';
const SSOTmap = { tau: '0.80' };
const SYNC_FIELDS = ['tau'];
function schemaVal(raw) { return '`' + raw.trim().replace(/'/g, '') + '`'; }
const lines = fs.readFileSync(SCHEMA, 'utf8').split('\n');
const changes = [];
for (const f of SYNC_FIELDS) {
  const target = schemaVal(SSOTmap[f]);
  console.log('target =', JSON.stringify(target));
  for (let i = 0; i < lines.length; i++) {
    const lineRe = new RegExp('^\\|\\s*' + '`' + f + '`' + '\\s*\\|[^|]*\\|\\s*`[^`]*`');
    const m = lines[i].match(lineRe);
    if (!m) continue;
    console.log('matched line', i, JSON.stringify(m[0]));
    const oldCell = m[0].match(/`([^`]*)`\s*$/);
    console.log('oldCell[1] =', oldCell && oldCell[1]);
    if (oldCell && '`' + oldCell[1] + '`' === target) { console.log('EQUAL, skip'); break; }
    const newTail = m[0].replace(/`[^`]*`\s*$/, target);
    console.log('newTail =', JSON.stringify(newTail));
    lines[i] = lines[i].replace(m[0], newTail);
    console.log('after replace line', i, '=', JSON.stringify(lines[i]));
    changes.push({ field: f, from: oldCell ? oldCell[1] : '?', to: SSOTmap[f] });
    break;
  }
}
console.log('changes =', changes);
console.log('final line 11 =', JSON.stringify(lines[11]));
