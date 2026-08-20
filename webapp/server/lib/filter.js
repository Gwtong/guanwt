// 前置过滤：规则挡掉噪声，不花模型成本
// 规则来自第二课 §3.1
const ROBOT_NAMES = ['机器人小助手', '机器人', '小助手'];
const ADMIN_MARKERS = ['[营销卡片]', '[推广]', '[广告]'];

// 超短消息阈值（字符数）
const SHORT_THRESHOLD = 3;

// 纯表情/无语义文本特征
const NOISE_PATTERNS = [
  /^\[图片\]$/, /^\[表情\]$/, /^\[语音\]$/, /^\[拍一拍\]$/,
  /^(收到|好的|嗯|哦|哈|哈哈|哈哈哈哈|嗯嗯|哦哦|1|\+1)$/,
  /^接[龙名]/,
];

export function preFilter(msg) {
  // 1. 非文本过滤（演示版消息都是文本，但保留这个检查位）
  //    图片/表情包/语音已在前端消息文件中标为 [图片] 等

  // 2. 身份过滤：机器人自身消息、群主与管理员的营销消息
  if (ROBOT_NAMES.includes(msg.user)) return { pass: false, reason: '机器人消息' };
  if (ADMIN_MARKERS.some(m => msg.text.startsWith(m))) return { pass: false, reason: '营销消息' };

  // 3. 长度过滤：超短消息、纯表情文本
  const trimmed = msg.text.trim();
  if (trimmed.length <= SHORT_THRESHOLD && !msg.at) {
    return { pass: false, reason: '超短消息' };
  }
  if (NOISE_PATTERNS.some(p => p.test(trimmed))) {
    return { pass: false, reason: '无语义噪声' };
  }

  return { pass: true, reason: '' };
}
