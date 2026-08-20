const fs = require('fs');
const f = 'tau';
const lines = fs.readFileSync('schema/config.md', 'utf8').split('\n');
const lineRe = new RegExp('^\\|\\s*' + '`' + f + '`' + '\\s*\\|[^|]*\\|\\s*`[^`]*`');
console.log('lineRe.source =', lineRe.source);
lines.forEach((l, i) => { if (lineRe.test(l)) console.log('MATCH line', i, JSON.stringify(l)); });
// 也打印 tau 行原文
lines.forEach((l, i) => { if (l.includes('`tau`')) console.log('tau line', i, JSON.stringify(l)); });
