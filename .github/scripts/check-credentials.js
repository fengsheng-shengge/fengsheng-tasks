#!/usr/bin/env node

const https = require('https');

const OWNER       = process.env.REPO_OWNER  || 'fengsheng-shengge';
const REPO        = process.env.REPO_NAME   || 'fengsheng-tasks';
const ISSUE_NUM   = parseInt(process.env.ISSUE_NUMBER || '42', 10);
const TOKEN       = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const XIAOYUER_LOGINS = (process.env.XIAOYUER_LOGINS || 'xiaoyuer-bot,xiaoyuer,coze-bot,coze')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
const STATE_FILE  = process.env.STATE_FILE || '.credentials-state.json';

if (!TOKEN) {
  console.error('❌ 缺少 GITHUB_TOKEN 环境变量');
  process.exit(1);
}

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

function extractCredentials(text) {
  const result = { accountId: null, apiToken: null };

  if (!text) return result;

  const norm = text.replace(/\r\n?/g, '\n');

  const acctPatterns = [
    /(?:^|\n)\s*(?:CLOUDFLARE_)?ACCOUNT[_\s-]?ID\s*[:\uFF1A=]\s*([A-Za-z0-9_-]{6,})\b/i,
    /(?:^|\n)\s*\u8D26\u53F7\s*ID\s*[:\uFF1A=]\s*([A-Za-z0-9_-]{6,})\b/i,
  ];
  for (const p of acctPatterns) {
    const m = norm.match(p);
    if (m) { result.accountId = m[1]; break; }
  }

  const tokenPatterns = [
    /(?:^|\n)\s*(?:CLOUDFLARE_)?API[_\s-]?TOKEN\s*[:\uFF1A=]\s*([A-Za-z0-9_-]{20,})\b/i,
    /(?:^|\n)\s*API\s*\u5BC6\u94A5\s*[:\uFF1A=]\s*([A-Za-z0-9_-]{20,})\b/i,
  ];
  for (const p of tokenPatterns) {
    const m = norm.match(p);
    if (m) { result.apiToken = m[1]; break; }
  }

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

function getRepoPublicKey() {
  return httpsRequest(
    'GET',
    `/repos/${OWNER}/${REPO}/actions/secrets/public-key`,
  );
}

function encryptSecretSealed(publicKeyB64, secretValue) {
  const tweet  = require('tweetnacl');
  const tu     = require('tweetnacl-util');
  const key    = tu.decodeBase64(publicKeyB64);
  const msg    = tu.decodeUTF8(secretValue);
  const ephKp  = tweet.box_keyPair();
  const nonce  = new Uint8Array(24);
  const ct     = tweet.box(msg, nonce, key, ephKp.secretKey);
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

async function triggerDeploy() {
  await httpsRequest('POST', `/repos/${OWNER}/${REPO}/dispatches`, {
    event_type: 'deploy-from-credentials',
  });
}

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
    if (page > 20) break;
  }
  return all;
}

async function addComment(issueNumber, body) {
  return httpsRequest('POST', `/repos/${OWNER}/${REPO}/issues/${issueNumber}/comments`, { body });
}

(async () => {
  const now = new Date().toISOString();
  console.log(`\n[${now}] 启动凭证检查`);
  console.log(`  仓库: ${OWNER}/${REPO}`);
  console.log(`  Issue: #${ISSUE_NUM}`);
  console.log(`  小鱼儿候选账号: ${XIAOYUER_LOGINS.join(', ')}`);

  const state = loadState();
  const processedSet = new Set(state.processedCommentIds || []);

  const comments = await listIssueComments(ISSUE_NUM);
  console.log(`  拉取到 ${comments.length} 条评论`);

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

  console.log('  → 配置 CLOUDFLARE_ACCOUNT_ID ...');
  await upsertSecret('CLOUDFLARE_ACCOUNT_ID', creds.accountId);
  console.log('  → 配置 CLOUDFLARE_API_TOKEN ...');
  await upsertSecret('CLOUDFLARE_API_TOKEN', creds.apiToken);
  console.log('  ✅ Secrets 已写入');

  console.log('  → 触发 deploy.yml ...');
  await triggerDeploy();
  console.log('  ✅ 部署已触发');

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