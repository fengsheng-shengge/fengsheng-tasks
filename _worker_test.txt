// FengSheng Pages Worker - handles all API routes
// Version: v20260720-1600 - anti-bot + anti-crawling defense
//   + issue #191: 合作意向留资 (partner_intent) & IP 设计 AI 头像生成 (/ip-design)

// 模块化业务处理 (api/ 目录, 由 Workerd 模块加载器解析相对 ESM 导入)
const COZE_API = 'https://api.coze.cn';
const BOT_ID_PLACEHOLDER = '***MASKED***'; // Bot ID from env var FS_BOT_ID，禁止硬编码
const WX_API = 'https://api.weixin.qq.com/sns/jscode2session';