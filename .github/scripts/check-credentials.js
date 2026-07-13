#!/usr/bin/env node
/**
 * check-credentials.js
 *
 * 每小时检查 GitHub Issue #42，查看小鱼儿（Coze）是否已回复
 * Cloudflare 部署凭证（Account ID + API Token）。
 *
 * - 如果回复中包含凭证，提取并配置到 GitHub Secrets
 * - 然后触发 deploy.yml 部署流程
 * - 重复检查时具备幂等性：已成功处理的 comment 不会被重复处理
 *
 * 用法：
 *   GITHUB_TOKEN=... REPO_OWNER=... REPO_NAME=... node check-credentials.js
 *
 * 凭证匹配规则（任一命中即视为包含）：
 *   Account ID: 32 位十六进制
 *   API Token:  40 位字母数字
 *   也支持键值对写法（不区分大小写、允许中文冒号）：
 *     Account ID: xxxx
 *     API Token: xxxx
 *     CLOUDFLARE_ACCOUNT_ID=xxxx
 *     CLOUDFLARE_API_TOKEN=xxxx
 */

const https = require('https');

const OWNER       = process.env.REPO_OWNER  || 'fengsheng-shengge';
const REPO        = process.env.REPO_NAME   || 'fengsheng-tasks';
const ISSUE_NUM   = parseInt(process.env.ISSUE_NUMBER || '42', 10);
const TOKEN       = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
// 小鱼儿在 GitHub 上的用户名（按实际情况调整）
const XIAOYUER_LOGINS = (process.env.XIAOYUER_LOGINS || 'xiaoyuer-bot,xiaoyuer,coze-bot,coze')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
// 状态文件，保存最后处理的 comment id，避免重复配置
const STATE_FILE  = process.env.STATE_FILE || '.credentials-state.json';

if (!TOKEN) {
  console.error('❌ 缺少 GITHUB_TOKEN 环境变量');
  process.exit(1);
}

// ---------- 工具函数 ----------

function httpsRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com',
      port: 443,
      path,
      method,
      headers: {
        'User-Agent': 'xiaokouzi-check-credentials',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Authorization': `Bearer ${TOKEN}`,
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let chunks = '';
      res.on('data', c => (chunks += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(chunks ? JSON.parse(chunks) : {}); }
          catch (e) { resolve({}); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${chunks}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function loadState() {
  try {
    return JSON.parse(require('fs').readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { processedCommentIds: [], lastRunAt: null };
  }
}

function saveState(state) {
  require('fs').writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * 从评论文本中提取 Cloudflare 凭证
 * 优先识别"键值对"形式，没有键再退回到"裸值"形式
 */
function extractCredentials(text) {
  const result = { accountId: null, apiToken: null };

  if (!text) return result;

  // 统一换行符
  const norm = text.replace(/\r\n?/g, '\n');

  // 1) 键值对：Account ID / CLOUDFLARE_ACCOUNT_ID / Cloudflare Account ID
  const acctPatterns = [
    /(?:^|\n)\s*(?:CLOUDFLARE_)?ACCOUNT[_\s-]?ID\s*[:\uFF1A=]\s*([A-Za-z0-9_-]{6,})\b/i,
    /(?:^|\n)\s*\u8D26\u53F7\s*ID\s*[:\uFF1A=]\s*([A-Za-z0-9_-]{6,})\b/i,
  ];
  for (const p of acctPatterns) {
    const m = norm.match(p);
    if (m) { result.accountId = m[1]; break; }
  }

  // 2) 键值对：API Token / CLOUDFLARE_API_TOKEN
  const tokenPatterns = [
    /(?:^|\n)\s*(?:CLOUDFLARE_)?API[_\s-]?TOKEN\s*[:\uFF1A=]\s*([A-Za-z0-9_-]{20,})\b/i,
    /(?:^|\n)\s*API\s*\u5BC6\u94A5\s*[:\uFF1A=]\s*([A-Za-z0-9_-]{20,})\b/i,
  ];
  for (const p of tokenPatterns) {
    const m = norm.match(p);
    if (m) { result.apiToken = m[1]; break; }
  }

  // 3) 裸值兜底（仅在没识别到键时尝试）
  if (!result.accountId) {
    const m = norm.match(/\b([a-f0-9]{32})\b/i);
    if (m) result.accountId = m[1];
  }
  if (!result.apiToken) {
    const m = norm.match(/\b([A-Za-z0-9_-]{40})\b/);
    if (m) result.apiToken = m[1];
  }

  return result;
}

// ---------- 仓库级 Secret 加密 ----------

function getRepoPublicKey() {
  return httpsRequest(
    'GET',
    `/repos/${OWNER}/${REPO}/actions/secrets/public-key`,
  );
}

// 使用 libsodium sealed box (curve25519xsalsa20poly1305)
function encryptSecretSealed(publicKeyB64, secretValue) {
  const tweet  = require('tweetnacl');
  const tu     = require('tweetnacl-util');
  const key    = tu.decodeBase64(publicKeyB64);
  const msg    = tu.decodeUTF8(secretValue);
  // sealed box = box(msg, zeroNonce, pk, ephemeralSk)
  const ephKp  = tweet.box_keyPair();
  const nonce  = new Uint8Array(24); // zero nonce
  const ct     = tweet.box(msg, nonce, key, ephKp.secretKey);
  // sealed_box = ephemeral_pk (32) + ciphertext
  const out    = new Uint8Array(ephKp.publicKey.length + ct.length);
  out.set(ephKp.publicKey, 0);
  out.set(ct, ephKp.publicKey.length);
  return Buffer.from(out).toString('base64');
}

async function upsertSecret(name, value) {
  const pub = await getRepoPublicKey();
  const encrypted_value = encryptSecretSealed(pub.key, value);
  await httpsRequest('PUT', `/repos/${OWNER}/${REPO}/actions/secrets/${name}`, {
    encrypted_value,
    key_id: pub.key_id,
  });
}

// ---------- 触发 deploy 工作流 ----------

async function triggerDeploy() {
  // 触发方式：repository_dispatch 事件，deploy.yml 内增加 on: repository_dispatch: types: [deploy-from-credentials]
  await httpsRequest('POST', `/repos/${OWNER}/${REPO}/dispatches`, {
    event_type: 'deploy-from-credentials',
  });
}

// ---------- 评论拉取 ----------

async function listIssueComments(issueNumber) {
  const all = [];
  let page = 1;
  while (true) {
    const batch = await httpsRequest(
      'GET',
      `/repos/${OWNER}/${REPO}/issues/${issueNumber}/comments?per_page=100&page=${page}`,
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
    if (page > 20) break; // 防御性
  }
  return all;
}

async function addComment(issueNumber, body) {
  return httpsRequest('POST', `/repos/${OWNER}/${REPO}/issues/${issueNumber}/comments`, { body });
}

// ---------- 主流程 ----------

(async () => {
  const now = new Date().toISOString();
  console.log(`\n[${now}] 启动凭证检查`);
  console.log(`  仓库: ${OWNER}/${REPO}`);
  console.log(`  Issue: #${ISSUE_NUM}`);
  console.log(`  小鱼儿候选账号: ${XIAOYUER_LOGINS.join(', ')}`);

  const state = loadState();
  const processedSet = new Set(state.processedCommentIds || []);

  // 1) 拉取所有评论
  const comments = await listIssueComments(ISSUE_NUM);
  console.log(`  拉取到 ${comments.length} 条评论`);

  // 2) 筛选小鱼儿的评论
  const xiaoyuerComments = comments.filter(c => {
    const login = (c.user && c.user.login || '').toLowerCase();
    return XIAOYUER_LOGINS.includes(login);
  });
  console.log(`  小鱼儿评论: ${xiaoyuerComments.length} 条`);

  if (xiaoyuerComments.length === 0) {
    console.log('  ⏳ 小鱼儿尚未回复，下次继续检查');
    state.lastRunAt = now;
    saveState(state);
    return;
  }

  // 3) 倒序遍历（最新优先），找到第一条未处理且包含完整凭证的评论
  xiaoyuerComments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  let picked = null;
  let creds = null;
  for (const c of xiaoyuerComments) {
    if (processedSet.has(c.id)) continue;
    const extracted = extractCredentials(c.body || '');
    if (extracted.accountId && extracted.apiToken) {
      picked = c;
      creds = extracted;
      break;
    }
  }

  if (!picked) {
    console.log('  ⏳ 小鱼儿已回复但未提供完整凭证（Account ID + API Token）');
    state.lastRunAt = now;
    saveState(state);
    return;
  }

  console.log(`  ✅ 找到目标评论: id=${picked.id} url=${picked.html_url}`);

  // 4) 配置到 GitHub Secrets
  console.log('  → 配置 CLOUDFLARE_ACCOUNT_ID ...');
  await upsertSecret('CLOUDFLARE_ACCOUNT_ID', creds.accountId);
  console.log('  → 配置 CLOUDFLARE_API_TOKEN ...');
  await upsertSecret('CLOUDFLARE_API_TOKEN', creds.apiToken);
  console.log('  ✅ Secrets 已写入');

  // 5) 触发部署
  console.log('  → 触发 deploy.yml ...');
  await triggerDeploy();
  console.log('  ✅ 部署已触发');

  // 6) 标记该评论已处理 + 在 Issue 内回复
  processedSet.add(picked.id);
  state.processedCommentIds = Array.from(processedSet);
  state.lastProcessedCommentId = picked.id;
  state.lastProcessedAt = now;
  saveState(state);

  await addComment(ISSUE_NUM,
    `✅ 小扣子已收到小鱼儿在 [comment](${picked.html_url}) 中提供的凭证，\n` +
    `并已自动配置到 GitHub Secrets 与触发部署。\n\n` +
    `- CLOUDFLARE_ACCOUNT_ID：已更新\n` +
    `- CLOUDFLARE_API_TOKEN：已更新（值已脱敏）\n` +
    `- 部署状态：见 [Actions](https://github.com/${OWNER}/${REPO}/actions)\n\n` +
    `如需轮换凭证，请在本 Issue 新建一条评论，我会按同样规则处理。`
  );
  console.log('  ✅ 通知评论已发布');
})().catch(err => {
  console.error('❌ 处理失败:', err.message);
  process.exit(1);
});
