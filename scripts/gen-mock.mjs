// 生成 Mock 底座：groups.json (~100 群) + group_metric_baseline.json
// 实验组/对照组各 50，layer/utype 分布可比；保留微信演示群 G001/G002/G006 等。
import fs from 'fs';
import path from 'path';

const DATA = path.join(process.cwd(), 'webapp', 'server', 'data');
const pad3 = n => String(n).padStart(3, '0');

// 原始 8 个群（保持身份与微信演示一致）
const base8 = [
  { id: 'G001', name: '幸福里小区邻居群', size: 213, layer: '活跃群', utype: '成熟用户群', arm: '实验组' },
  { id: 'G002', name: '宝妈好物分享群', size: 186, layer: '活跃群', utype: '新用户群', arm: '实验组' },
  { id: 'G003', name: '老家特产互助群', size: 156, layer: '成长群', utype: '召回用户群', arm: '对照组' },
  { id: 'G004', name: '夕阳红养生堂', size: 204, layer: '衰退群', utype: '召回用户群', arm: '实验组' },
  { id: 'G005', name: '数码发烧友群', size: 118, layer: '成长群', utype: '成熟用户群', arm: '对照组' },
  { id: 'G006', name: '宠物铲屎官群', size: 167, layer: '活跃群', utype: '成熟用户群', arm: '实验组' },
  { id: 'G007', name: '新手爸妈营', size: 179, layer: '活跃群', utype: '新用户群', arm: '对照组' },
  { id: 'G008', name: '厂区宿舍2号楼', size: 231, layer: '衰退群', utype: '召回用户群', arm: '实验组' },
];

const TAGS = ['母婴', '生鲜', '数码', '养老', '宠物', '食品', '家居', '服饰', '美妆', '运动', '图书', '家电'];
const TAG_SUFFIX = {
  母婴: ['宝妈好物群', '育儿交流群', '母婴种草群'],
  生鲜: ['邻里生鲜群', '果蔬拼团群', '社区团购群'],
  数码: ['数码玩家群', '极客交流群', '好物开箱群'],
  养老: ['夕阳红养生群', '银发互助群', '康乐分享群'],
  宠物: ['铲屎官联盟', '萌宠交流群', '宠物用品群'],
  食品: ['吃货福利群', '零食种草群', '美食分享群'],
  家居: ['居家好物群', '家装交流群', '生活馆群'],
  服饰: ['穿搭种草群', '服饰优惠群', '闺蜜购物群'],
  美妆: ['美妆打卡群', '护肤交流群', '彩妆种草群'],
  运动: ['健身打卡群', '运动装备群', '跑步交流群'],
  图书: ['读书会群', '童书分享群', '知识付费群'],
  家电: ['家电以旧换新群', '智能家电群', '好物评测群'],
};
const LAYERS = ['活跃群', '成长群', '衰退群'];
const UTYPES = ['成熟用户群', '新用户群', '召回用户群'];

// 简单可复现伪随机
let seed = 20260821;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const DEMO = new Set(['G001', 'G002', 'G006', 'G004', 'G008']);
const groups = [...base8];

// 每臂目标分布（保证实验组/对照组可比，满足显著性检验前提）
const TARGET = {
  '实验组': { '活跃群': 25, '成长群': 15, '衰退群': 10, '成熟用户群': 18, '新用户群': 16, '召回用户群': 16 },
  '对照组': { '活跃群': 25, '成长群': 15, '衰退群': 10, '成熟用户群': 18, '新用户群': 16, '召回用户群': 16 },
};
// 计算每臂需补足的层/型队列（可复现洗牌）
const buildQueue = (arm, field) => {
  let need = TARGET[arm][field];
  for (const g of base8) if (g.arm === arm) need--;
  const list = [];
  for (const k of Object.keys(TARGET[arm])) {
    if (k === field || (field === 'layer' && ['活跃群','成长群','衰退群'].includes(k)) || (field === 'utype' && ['成熟用户群','新用户群','召回用户群'].includes(k))) {
      // 仅统计同维度字段
    }
  }
  // 直接按目标维度填充
  const dims = field === 'layer' ? ['活跃群','成长群','衰退群'] : ['成熟用户群','新用户群','召回用户群'];
  for (const d of dims) {
    let n = TARGET[arm][d];
    for (const g of base8) if (g.arm === arm && g[field] === d) n--;
    for (let i = 0; i < n; i++) list.push(d);
  }
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
};
const treatLayerQ = buildQueue('实验组', 'layer');
const treatUtypeQ = buildQueue('实验组', 'utype');
const ctrlLayerQ = buildQueue('对照组', 'layer');
const ctrlUtypeQ = buildQueue('对照组', 'utype');
const armOf = i => (i <= 53 ? '实验组' : '对照组');

for (let i = 9; i <= 100; i++) {
  const arm = armOf(i);
  const tag = pick(TAGS);
  const name = `${tag}${pick(TAG_SUFFIX[tag])}`;
  const layer = arm === '实验组' ? treatLayerQ.shift() : ctrlLayerQ.shift();
  const utype = arm === '实验组' ? treatUtypeQ.shift() : ctrlUtypeQ.shift();
  groups.push({
    id: 'G' + pad3(i),
    name,
    size: ri(80, 260),
    layer,
    utype,
    arm,
    tags: [tag],
    is_demo: DEMO.has('G' + pad3(i)),
  });
}

// 写入 groups.json（保留 base8 的原始字段顺序，demo 标记按 id 统一打）
const outGroups = groups.map(g => {
  const o = { id: g.id, name: g.name, size: g.size, layer: g.layer, utype: g.utype, arm: g.arm };
  if (g.tags) o.tags = g.tags;
  if (DEMO.has(g.id)) o.is_demo = true;
  return o;
});
fs.writeFileSync(path.join(DATA, 'groups.json'), JSON.stringify(outGroups, null, 2));

// group_metric_baseline：上线前群点击活跃率（实验组/对照组基线可比，中心 ~10%）
const baseline = [];
for (const g of outGroups) {
  // 基线 8%~12%，两臂中心一致，便于演示"上线后实验组显著提升"
  const baseRate = +(9.2 + rnd() * 2.6).toFixed(2);
  const baseDemand = ri(3, 12);
  baseline.push({ id: g.id, arm: g.arm, baseline_click_active_rate: baseRate, baseline_demand_count: baseDemand });
}
fs.writeFileSync(path.join(DATA, 'group_metric_baseline.json'), JSON.stringify(baseline, null, 2));

// 统计
const t = outGroups.filter(g => g.arm === '实验组');
const c = outGroups.filter(g => g.arm === '对照组');
const dist = arr => {
  const d = { '活跃群':0,'成长群':0,'衰退群':0,'成熟用户群':0,'新用户群':0,'召回用户群':0 };
  arr.forEach(g => { d[g.layer]++; d[g.utype]++; });
  return d;
};
console.log('总群数:', outGroups.length);
console.log('实验组:', t.length, '对照组:', c.length);
console.log('实验组分布:', JSON.stringify(dist(t)));
console.log('对照组分布:', JSON.stringify(dist(c)));
console.log('演示群标记:', outGroups.filter(g=>g.is_demo).map(g=>g.id).join(','));
