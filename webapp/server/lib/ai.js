// AI 判定段：直调 DeepSeek API，两段判定
// 第一段：BERT 替身——相关性判定（分类提示词）
// 第二段：DeepSeek 解析——结构化需求
// 来自第二课 §4.3 + §8.3

import state from '../state.js';

const BERT_PROMPT = `你是商品相关性判定器。判断输入的群聊发言是否与商品或购买需求相关。

相关：提及具体商品或品类；表达想买、求推荐、比价、询价；对商品的评价与吐槽。
无关：寒暄、表情斗图、接龙报名、与商品无关的闲聊。

只输出 JSON：{"relevant": true 或 false, "confidence": 0 到 1 的小数}`;

const PARSE_PROMPT = `你是京东微信社群的用户需求解析引擎。输入是一段群成员发言（unit_text），可能附带该用户近几分钟的历史发言（context_text）。该发言已被上游判定为与商品相关。
任务：把发言解析成结构化的购买需求。

只输出一个 JSON 对象，不输出任何其他文字：
{
  "category": "归一化品类。用最常用的品类词，如红枣/大枣/枣子统一为枣；无法归一时用原词",
  "keywords": ["发言中出现的商品关键词原文"],
  "intent": "四选一：want_buy（想买）/ ask_rec（求推荐）/ compare（比价）/ complain（吐槽）",
  "price_pref": "价格意向，如便宜的、百元以内；发言未提及则为 null"
}

判定规则：
1. 吐槽不是需求。对已购商品的不满（如"枣子怎么不甜""上次买的洗衣液不好用"），intent 必须判 complain，即使句中出现了商品词。
2. 提及不等于想买。转发商品消息、议论别人买了什么，不判 want_buy；仅当发言表达获取意愿（想要、求链接、有没有、多少钱）才判 want_buy 或 ask_rec。
3. context_text 只用于补全 unit_text 的语义（如上文"有没有"＋当前"便宜点的枣子"），不得把上下文里已解析过的旧需求重复输出。
4. 不臆测。发言里没有的信息不输出，price_pref 宁缺毋滥。`;

async function callDeepSeek(systemPrompt, userText) {
  const key = state.config.deepseek_key;
  if (!key) {
    throw new Error('DeepSeek API Key 未配置，请在策略配置页填写');
  }

  const resp = await fetch(state.config.deepseek_base, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: state.config.deepseek_model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`DeepSeek API 调用失败 (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  try {
    return JSON.parse(content);
  } catch {
    // 尝试从内容中提取 JSON
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('DeepSeek 返回内容无法解析为 JSON: ' + content);
  }
}

// 第一段：BERT 替身——相关性判定
export async function judgeRelevance(unitText, contextText = '') {
  const userText = `unit_text: ${unitText}\ncontext_text: ${contextText || '(无)'}`;
  const result = await callDeepSeek(BERT_PROMPT, userText);
  return {
    relevant: result.relevant === true,
    confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
  };
}

// 第二段：DeepSeek 解析——结构化需求
export async function parseDemand(unitText, contextText = '') {
  const userText = `unit_text: ${unitText}\ncontext_text: ${contextText || '(无)'}`;
  const result = await callDeepSeek(PARSE_PROMPT, userText);
  return {
    category: result.category || '',
    keywords: result.keywords || [],
    intent: result.intent || 'complain',
    price_pref: result.price_pref || null,
  };
}

// 连通性测试
export async function testConnection() {
  try {
    const result = await callDeepSeek('你是连通性测试器。', '请回复 {"ok": true}');
    return { ok: true, message: 'DeepSeek API 连通正常', response: result };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// 无 Key 时的规则引擎替身（让骨架能跑通）
const RULE_MAP = [
  { cats: ['枣','红枣','大枣','枣子'], cat: '枣' },
  { cats: ['风扇','电风扇','落地扇','塔扇'], cat: '风扇' },
  { cats: ['纸巾','抽纸','卷纸'], cat: '纸品' },
  { cats: ['电饭煲','电饭锅','高压锅'], cat: '厨电' },
  { cats: ['保温杯','水杯','杯子'], cat: '水杯' },
  { cats: ['洗衣液','凝珠','洗洁精'], cat: '家清' },
  { cats: ['被子','凉被','四件套'], cat: '家纺' },
  { cats: ['手机','老人机','备用机'], cat: '手机' },
  { cats: ['猫粮','狗粮','猫砂'], cat: '猫粮' },
  { cats: ['米','大米','长粒香米'], cat: '米面' },
];

const COMPLAINT_MARKERS = ['不好用', '不甜', '不好吃', '坏了', '假货', '差评', '退货'];

export function ruleEngineRelevance(unitText) {
  const hasProduct = RULE_MAP.some(r => r.cats.some(c => unitText.includes(c)));
  const hasIntent = /有没有|求推荐|想买|多少钱|有活动|有啥|有吗/.test(unitText);
  const isComplaint = COMPLAINT_MARKERS.some(m => unitText.includes(m));
  const relevant = hasProduct || hasIntent || isComplaint;
  return { relevant, confidence: relevant ? 0.85 : 0.2 };
}

export function ruleEngineParse(unitText) {
  let category = '', keywords = [];
  for (const r of RULE_MAP) {
    const hits = r.cats.filter(c => unitText.includes(c));
    if (hits.length > 0) { category = r.cat; keywords = hits; break; }
  }
  const isComplaint = COMPLAINT_MARKERS.some(m => unitText.includes(m));
  const hasBuyIntent = /想买|求链接|有没有|有啥|有活动|有吗/.test(unitText);
  const hasRecIntent = /求推荐|推荐|哪个好/.test(unitText);
  const hasCompare = /比价|便宜|多少钱|划算|贵/.test(unitText);

  let intent = 'complain';
  if (isComplaint) intent = 'complain';
  else if (hasCompare) intent = 'compare';
  else if (hasRecIntent) intent = 'ask_rec';
  else if (hasBuyIntent) intent = 'want_buy';
  else if (category) intent = 'ask_rec';

  const priceMatch = unitText.match(/(便宜的|便宜点|百元以内|\d+元以内|性价比)/);
  return {
    category: category || '未知',
    keywords,
    intent,
    price_pref: priceMatch ? priceMatch[1] : null,
  };
}
