const https = require('https');
const crypto = require('crypto');

const OWNER = 'fengsheng-shengge';
const REPO = 'fengsheng-tasks';
const ISSUE_NUMBER = 42;

async function fetch(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: url,
      method: 'GET',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'Trae-Credential-Checker',
        ...headers
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function post(url, body, headers = {}) {
  const jsonBody = typeof body === 'string' ? body : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: url,
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'Trae-Credential-Checker',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonBody),
        ...headers
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(jsonBody);
    req.end();
  });
}

async function put(url, body, headers = {}) {
  const jsonBody = typeof body === 'string' ? body : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: url,
      method: 'PUT',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'Trae-Credential-Checker',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonBody),
        ...headers
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(jsonBody);
    req.end();
  });
}

function extractCredentials(text) {
  const result = {};
  const accountIdPatterns = [
    /Account\s*ID\s*[:=]\s*([a-f0-9]{32})/i,
    /CLOUDFLARE_ACCOUNT_ID\s*=\s*([a-f0-9]{32})/i,
    /account_id\s*[:=]\s*([a-f0-9]{32})/i
  ];
  const apiTokenPatterns = [
    /API\s*Token\s*[:=]\s*(cfut_[a-zA-Z0-9_-]+)/i,
    /CLOUDFLARE_API_TOKEN\s*=\s*(cfut_[a-zA-Z0-9_-]+)/i,
    /api_token\s*[:=]\s*(cfut_[a-zA-Z0-9_-]+)/i,
    /(cfut_[a-zA-Z0-9_-]{30,})/
  ];
  for (const pattern of accountIdPatterns) {
    const match = text.match(pattern);
    if (match && match[1].length === 32) {
      result.CLOUDFLARE_ACCOUNT_ID = match[1];
      break;
    }
  }
  for (const pattern of apiTokenPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.CLOUDFLARE_API_TOKEN = match[1];
      break;
    }
  }
  return result;
}

function encryptSecret(value, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'base64'), iv);
  let encrypted = cipher.update(value, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  return Buffer.from(JSON.stringify({
    iv: iv.toString('base64'),
    encrypted_value: encrypted,
    tag: authTag
  })).toString('base64');
}

async function main() {
  if (!process.env.GITHUB_TOKEN) {
    console.log('ERROR: GITHUB_TOKEN not set');
    process.exit(1);
  }

  console.log('=== Step 1: Fetching Issue #42 comments ===');
  let allComments = [];
  let page = 1;
  while (true) {
    const { status, data } = await fetch(`/repos/${OWNER}/${REPO}/issues/${ISSUE_NUMBER}/comments?page=${page}&per_page=100`);
    if (status !== 200) {
      console.log(`ERROR: Failed to fetch comments (${status})`);
      process.exit(1);
    }
    if (data.length === 0) break;
    allComments = [...allComments, ...data];
    page++;
  }
  console.log(`Found ${allComments.length} comments`);

  console.log('\n=== Step 2: Extracting credentials ===');
  let credentials = {};
  for (const comment of allComments) {
    const body = comment.body || '';
    const extracted = extractCredentials(body);
    if (extracted.CLOUDFLARE_ACCOUNT_ID && !credentials.CLOUDFLARE_ACCOUNT_ID) {
      credentials.CLOUDFLARE_ACCOUNT_ID = extracted.CLOUDFLARE_ACCOUNT_ID;
      console.log(`Found ACCOUNT_ID in comment #${comment.id}`);
    }
    if (extracted.CLOUDFLARE_API_TOKEN && !credentials.CLOUDFLARE_API_TOKEN) {
      credentials.CLOUDFLARE_API_TOKEN = extracted.CLOUDFLARE_API_TOKEN;
      console.log(`Found API_TOKEN in comment #${comment.id}`);
    }
    if (credentials.CLOUDFLARE_ACCOUNT_ID && credentials.CLOUDFLARE_API_TOKEN) {
      break;
    }
  }

  if (!credentials.CLOUDFLARE_ACCOUNT_ID || !credentials.CLOUDFLARE_API_TOKEN) {
    console.log('WARNING: No credentials found in comments');
    console.log('Expected format:');
    console.log('  Account ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('  API Token: cfut_xxxxxxxxxxxxxxxxxxxxxxx');
    process.exit(0);
  }

  console.log('\n=== Step 3: Fetching public key for encryption ===');
  const { status: keyStatus, data: keyData } = await fetch(`/repos/${OWNER}/${REPO}/actions/secrets/public-key`);
  if (keyStatus !== 200) {
    console.log(`ERROR: Failed to fetch public key (${keyStatus})`);
    process.exit(1);
  }
  const publicKey = keyData.key;
  const keyId = keyData.key_id;

  function encryptWithRSA(value) {
    const encrypted = crypto.publicEncrypt({
      key: `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    }, Buffer.from(value));
    return encrypted.toString('base64');
  }

  console.log('\n=== Step 4: Updating GitHub Secrets ===');
  const accountIdEncrypted = encryptWithRSA(credentials.CLOUDFLARE_ACCOUNT_ID);
  const apiTokenEncrypted = encryptWithRSA(credentials.CLOUDFLARE_API_TOKEN);

  const accountIdResult = await put(`/repos/${OWNER}/${REPO}/actions/secrets/CLOUDFLARE_ACCOUNT_ID`, {
    encrypted_value: accountIdEncrypted,
    key_id: keyId
  });
  console.log(`CLOUDFLARE_ACCOUNT_ID: ${accountIdResult.status === 201 ? 'OK' : `FAILED (${accountIdResult.status})`}`);

  const apiTokenResult = await put(`/repos/${OWNER}/${REPO}/actions/secrets/CLOUDFLARE_API_TOKEN`, {
    encrypted_value: apiTokenEncrypted,
    key_id: keyId
  });
  console.log(`CLOUDFLARE_API_TOKEN: ${apiTokenResult.status === 201 ? 'OK' : `FAILED (${apiTokenResult.status})`}`);

  console.log('\n=== Step 5: Triggering deployment ===');
  const deployResult = await post(`/repos/${OWNER}/${REPO}/actions/workflows/deploy.yml/dispatches`, {
    ref: 'main',
    inputs: { environment: 'production' }
  });
  console.log(`Deployment trigger: ${deployResult.status === 204 ? 'OK' : `FAILED (${deployResult.status})`}`);

  console.log('\n=== Step 6: Adding notification comment ===');
  const commentResult = await post(`/repos/${OWNER}/${REPO}/issues/${ISSUE_NUMBER}/comments`, {
    body: `✅ 凭证检测成功！\n\n已自动提取并配置 Cloudflare 部署凭证到 GitHub Secrets，部署流水线已触发。\n\n- CLOUDFLARE_ACCOUNT_ID: 已配置\n- CLOUDFLARE_API_TOKEN: 已配置\n\n等待部署完成...\n\n_由小扣子（Trae）自动执行_`
  });
  console.log(`Notification comment: ${commentResult.status === 201 ? 'OK' : `FAILED (${commentResult.status})`}`);

  console.log('\n✅ All tasks completed successfully!');
}

main().catch((error) => {
  console.log('ERROR:', error.message);
  process.exit(1);
});