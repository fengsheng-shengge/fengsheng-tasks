// api/ip-design.js
// ============================================================
//  IP 角色设计 · AI 头像生成
//  对应 GitHub issue #191 任务2
//  --------------------------------------------------------
//  路由: POST /ip-design
//  请求体:
//    {
//      "desc": "角色描述",
//      "styles": ["商务风","亲民风","活力风","简约文艺","科技感","可爱卡通"]
//    }
//  返回体:
//    [
//      { "style": "商务风", "url": "https://..." },
//      { "style": "亲民风", "url": "https://..." },
//      ...
//    ]
//
//  当前状态: MOCK (返回占位图 URL).
//  真实文生图 API 接入位置见 generateAvatarReal() 与文件底部说明.
// ============================================================

// 前端约定的 6 种风格
export const SUPPORTED_STYLES = ['商务风', '亲民风', '活力风', '简约文艺', '科技感', '可爱卡通'];

const MAX_DESC = 500;       // 描述最大长度
const MAX_STYLES = 6;       // 单次最多生成 6 种风格

// ============================================================
//  Mock 开关
//  - true : 走 mockAvatarUrl() 占位图
//  - false: 走 generateAvatarReal() 真实文生图
//  注意: 即便置为 false, 若 env 未配置 IP_DESIGN_API / IP_DESIGN_API_KEY,
//        仍会自动降级回 mock, 保证服务可用.
// ============================================================
const USE_MOCK = true;

/**
 * 路由处理器: POST /ip-design
 */
export async function handleIpDesign(request, env) {
  // 1. 解析 & 校验入参
  let body;
  try {
    body = await parseBodyJson(request);
  } catch {
    return jsonResponse({ error: '请求体不是合法 JSON' }, 400);
  }

  const desc = clip(body && body.desc, MAX_DESC);
  const styles = pickStyles(body && body.styles);

  if (!desc) {
    return jsonResponse({ error: 'desc 不能为空' }, 400);
  }
  if (styles.length === 0) {
    return jsonResponse({ error: 'styles 不能为空' }, 400);
  }

  // 2. 逐风格生成头像 (mock 或真实)
  const results = [];
  for (const style of styles) {
    const prompt = buildPrompt(desc, style);
    let url;
    if (USE_MOCK || !env.IP_DESIGN_API || !env.IP_DESIGN_API_KEY) {
      url = await mockAvatarUrl(desc, style);
    } else {
      try {
        url = await generateAvatarReal(prompt, env);
      } catch (err) {
        // 真实 API 失败时降级 mock, 保证前端可用
        console.error('ip-design: real API failed, fallback to mock:', err.message);
        url = await mockAvatarUrl(desc, style);
      }
    }
    results.push({ style, url });
  }

  // 3. 返回数组 (与前端契约一致)
  return jsonResponse(results);
}

// ------------------------------------------------------------
//  Prompt 构造
// ------------------------------------------------------------
function buildPrompt(desc, style) {
  return [
    '为一个 IP 角色设计头像, 正方形构图, 头像比例, 简洁背景, 高质量.',
    `风格: ${style}.`,
    `角色描述: ${desc}.`,
  ].join(' ');
}

// ============================================================
//  MOCK 实现: 返回占位图 URL
//  使用 DiceBear 开源头像 API (无需 Key, 确定性可复现).
//  真实文生图接入后, 此函数保留作为降级方案.
// ============================================================
async function mockAvatarUrl(desc, style) {
  const seed = encodeURIComponent(`${style}-${desc}`.slice(0, 64));
  // 把中文风格映射到 DiceBear 的画风, 让每种风格视觉上有差异
  const styleMap = {
    '商务风': 'bottts-neutral',
    '亲民风': 'avataaars',
    '活力风': 'adventurer',
    '简约文艺': 'thumbs',
    '科技感': 'bottts',
    '可爱卡通': 'lorelei',
  };
  const dicebearStyle = styleMap[style] || 'bottts-neutral';
  return `https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${seed}&backgroundColor=f7f4ef`;
}

// ============================================================
//  真实文生图 API 接入位置 (占位实现)
//  --------------------------------------------------------
//  接入步骤:
//   1. 在 Cloudflare Pages → 项目 → Settings → Environment variables 配置:
//        IP_DESIGN_API      文生图服务地址
//        IP_DESIGN_API_KEY  对应 API Key
//        IP_DESIGN_MODEL    (可选) 模型名, 默认 seedream-4.0
//   2. 把本文件顶部 USE_MOCK 改为 false
//   3. 按所选服务商文档调整下方 fetch 的请求体与返回解析
//
//  下方以火山方舟 Seedream (Volcano Engine) 文生图为例,
//  兼容 OpenAI Images API 风格的返回结构 (data[0].url / b64_json).
//  如改用 Coze / 通义万相 / Stability 等, 仅需改写本函数.
// ============================================================
async function generateAvatarReal(prompt, env) {
  const apiUrl = env.IP_DESIGN_API;          // 例: https://ark.cn-beijing.volces.com/api/v3/images/generations
  const apiKey = env.IP_DESIGN_API_KEY;

  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.IP_DESIGN_MODEL || 'seedream-4.0',
      prompt,
      size: '1024x1024',
      n: 1,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`text-to-image API ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();

  // 适配不同服务商返回结构:
  //  - OpenAI / Volcano Seedream / 通义: data.data[0].url 或 data.data[0].b64_json
  //  - Coze: data.data[0].url
  const item = data && data.data && data.data[0];
  if (!item) throw new Error('text-to-image API: 返回 data 为空');
  if (item.url) return item.url;
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  throw new Error('text-to-image API: 返回中未找到 url');
}

// ------------------------------------------------------------
//  工具函数
// ------------------------------------------------------------
function pickStyles(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const s of raw) {
    if (typeof s !== 'string') continue;
    const v = s.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= MAX_STYLES) break;
  }
  return out;
}

function clip(v, max) {
  const s = (v == null ? '' : String(v)).trim();
  return s.slice(0, max);
}

async function parseBodyJson(request) {
  const text = await request.text();
  if (!text) return null;
  return JSON.parse(text);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
