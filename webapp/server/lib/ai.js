// AI 判定段：直调 DeepSeek API，两段判定
// 第一段：相关性判定（BERT 语义层）（分类提示词）
// 第二段：DeepSeek 解析——结构化需求

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

// 第一段：相关性判定（BERT 语义层）
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

// 无 Key 时的内置规则引擎（与内置演示数据同一套词表与判定口径，保证结论一致）
const RULE_MAP = [
  { cats: ["枣","红枣","大枣","枣子"], cat: "枣" },
  { cats: ["风扇","电风扇","落地扇","塔扇"], cat: "风扇" },
  { cats: ["纸巾","抽纸","卷纸"], cat: "纸品" },
  { cats: ["电饭煲","电饭锅","高压锅"], cat: "厨电" },
  { cats: ["保温杯","水杯","杯子","玻璃杯"], cat: "水杯" },
  { cats: ["洗衣液","凝珠","洗洁精","垃圾袋","洁厕","消毒液","消毒"], cat: "家清" },
  { cats: ["被子","凉被","四件套","枕头","毛巾","床垫"], cat: "家纺" },
  { cats: ["手机","老人机","备用机"], cat: "手机" },
  { cats: ["猫粮","狗粮","猫砂","宠物","宠物零食"], cat: "猫粮" },
  { cats: ["米","大米","香米","挂面","面条","油","酱油","醋","蚝油","调味"], cat: "米面" },
  { cats: ["火鸡面","泡面","方便面","辣条","薯片","零食","饼干","坚果","巧克力","糖果","雪饼","猪肉脯"], cat: "零食" },
  { cats: ["苹果","脐橙","橙子","香蕉","车厘子","蓝莓","猕猴桃","火龙果","水果"], cat: "水果" },
  { cats: ["可乐","矿泉水","果汁","咖啡","牛奶","酸奶","茶","啤酒","饮料"], cat: "饮料" },
  { cats: ["水饺","饺子","面包","燕麦","麦片","自热","速食"], cat: "速食" },
  { cats: ["鸡蛋","鸡胸肉","蔬菜","生鲜","肉"], cat: "生鲜" },
  { cats: ["炒锅","菜刀","砧板","水壶","保鲜盒","锅","刀","碗","筷"], cat: "厨具" },
  { cats: ["加湿器","吹风机","扫地","台灯","破壁","家电"], cat: "家电" },
  { cats: ["收纳","衣架"], cat: "收纳" },
  { cats: ["浴巾","拖鞋","卫浴"], cat: "卫浴" },
  { cats: ["耳机","充电宝","数据线","音箱","数码","电脑","平板"], cat: "数码" },
  { cats: ["T恤","衬衫","卫衣","外套","牛仔裤","运动裤","裙子","运动鞋","帆布鞋","内衣","袜子","帽子","围巾","衣服","裤子","鞋","服饰"], cat: "服饰" },
  { cats: ["洗发水","沐浴露","牙膏","牙刷","个护"], cat: "个护" },
  { cats: ["口红","面膜","粉底","美妆","妆"], cat: "美妆" },
  { cats: ["篮球","瑜伽垫","羽毛球","跳绳","书","笔","笔记本","玩具"], cat: "文体" },
  { cats: ["维生素","钙片","枸杞","保健","养生"], cat: "保健" }
];

const COMPLAINT_MARKERS = ['不好用', '不甜', '不好吃', '坏了', '假货', '差评', '退货'];

export function ruleEngineRelevance(t) {
  const hasProduct = RULE_MAP.some(r => r.cats.some(c => t.includes(c)));
  const hasIntent = /有没有|求推荐|想买|要买|买|下单|多少钱|有活动|有啥|有吗|推荐|哪个好|需要|想要|要/.test(t);
  const isComplaint = COMPLAINT_MARKERS.some(m => t.includes(m));
  const relevant = hasProduct || hasIntent || isComplaint;
  return { relevant, confidence: relevant ? 0.85 : 0.2, isComplaint };
}

export function ruleEngineParse(t) {
  let category = '', keywords = [];
  for (const r of RULE_MAP) {
    const hits = r.cats.filter(c => t.includes(c));
    if (hits.length > 0) { category = r.cat; keywords = hits; break; }
  }
  const isComplaint = COMPLAINT_MARKERS.some(m => t.includes(m));
  const hasBuy = /想买|要买|买点|买|下单|来点|囤点|求链接|有没有|有啥|有活动|有吗/.test(t);
  const hasRec = /求推荐|推荐|哪个好/.test(t);
  const hasCompare = /比价|便宜|多少钱|划算|贵|以内/.test(t);

  let intent = 'complain';
  if (isComplaint) intent = 'complain';
  else if (hasCompare) intent = 'compare';
  else if (hasRec) intent = 'ask_rec';
  else if (hasBuy) intent = 'want_buy';
  else if (category) intent = 'ask_rec';

  const priceMatch = t.match(/(便宜的|便宜点|百元以内|\d+元以内|性价比|以内)/);
  return {
    category: category || '未知',
    keywords,
    intent,
    price_pref: priceMatch ? priceMatch[1] : null,
  };
}
