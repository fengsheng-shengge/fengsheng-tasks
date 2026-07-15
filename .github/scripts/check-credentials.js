const https = require('https');
const nacl = require('tweetnacl');

const TOKEN = process.env.GITHUB_TOKEN;
const REPOSITORY = process.env.REPOSITORY;
const OWNER = REPOSITORY.split('/')[0];
const REPO = REPOSITORY.split('/')[1];
const ISSUE_NUMBER = 42;

const XIAOYUER_ACCOUNTS = ['xiaoyuer-bot', 'xiaoyuer', 'coze-bot', 'coze', 'fengsheng-shengge'];

async function fetch(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function post(url, body) {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(body);
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(json)
      }
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ status: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    req.write(json);
    req.end();
  });
}

async function put(url, body) {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(body);
    const options = {
      method: 'PUT',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(json)
      }
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ status: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    req.write(json);
    req.end();
  });
}

function extractCredentials(body) {
  const credentials = {};
  
  const accountIdPatterns = [
    /CLOUDFLARE_ACCOUNT_ID\s*[=:]\s*([a-f0-9]{32})/i,
    /Account\s*ID\s*[=:]\s*([a-f0-9]{32})/i,
    /account_id\s*[=:]\s*([a-f0-9]{32})/i,
    /account-id\s*[=:]\s*([a-f0-9]{32})/i
  ];
  
  const apiTokenPatterns = [
    /CLOUDFLARE_API_TOKEN\s*[=:]\s*([a-zA-Z0-9_-]{40,})/i,
    /API\s*Token\s*[=:]\s*([a-zA-Z0-9_-]{40,})/i,
    /api_token\s*[=:]\s*([a-zA-Z0-9_-]{40,})/i,
    /api-token\s*[=:]\s*([a-zA-Z0-9_-]{40,})/i
  ];
  
  for (const pattern of accountIdPatterns) {
    const match = body.match(pattern);
    if (match) {
      credentials.accountId = match[1];
      break;
    }
  }
  
  for (const pattern of apiTokenPatterns) {
    const match = body.match(pattern);
    if (match) {
      credentials.apiToken = match[1];
      break;
    }
  }
  
  return credentials;
}

async function getPublicKey() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/actions/secrets/public-key`;
  const result = await fetch(url);
  return {
    key: result.key,
    keyId: result.key_id
  };
}

function encrypt(plaintext, publicKey) {
  const key = Buffer.from(publicKey, 'base64');
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const message = Buffer.from(plaintext, 'utf8');
  const encrypted = nacl.secretbox(message, nonce, key);
  const combined = Buffer.concat([nonce, Buffer.from(encrypted)]);
  return combined.toString('base64');
}

async function setSecret(name, value) {
  const { key, keyId } = await getPublicKey();
  const encryptedValue = encrypt(value, key);
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/actions/secrets/${name}`;
  await put(url, {
    encrypted_value: encryptedValue,
    key_id: keyId
  });
}

async function triggerDeploy() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/dispatches`;
  await post(url, {
    event_type: 'deploy-from-credentials'
  });
}

async function addComment(message) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${ISSUE_NUMBER}/comments`;
  await post(url, { body: message });
}

async function main() {
  console.log(`🔍 检查 Issue #${ISSUE_NUMBER} 中是否有小鱼儿回复的 Cloudflare 凭证...`);
  
  const commentsUrl = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${ISSUE_NUMBER}/comments`;
  const comments = await fetch(commentsUrl);
  
  console.log(`📝 共找到 ${comments.length} 条评论`);
  
  for (const comment of comments) {
    const user = comment.user.login;
    const body = comment.body;
    
    if (!XIAOYUER_ACCOUNTS.includes(user.toLowerCase())) {
      continue;
    }
    
    console.log(`🔑 检查用户 ${user} 的评论...`);
    
    const credentials = extractCredentials(body);
    
    if (credentials.accountId && credentials.apiToken) {
      console.log(`✅ 找到凭证！Account ID: ${credentials.accountId.slice(0, 8)}... API Token: ${credentials.apiToken.slice(0, 8)}...`);
      
      try {
        console.log('📦 配置 CLOUDFLARE_ACCOUNT_ID...');
        await setSecret('CLOUDFLARE_ACCOUNT_ID', credentials.accountId);
        
        console.log('📦 配置 CLOUDFLARE_API_TOKEN...');
        await setSecret('CLOUDFLARE_API_TOKEN', credentials.apiToken);
        
        console.log('🚀 触发部署...');
        await triggerDeploy();
        
        console.log('📧 在 Issue 中回复通知...');
        await addComment(`✅ 已检测到 Cloudflare 凭证，已配置到 GitHub Secrets 并触发部署！\n\n- CLOUDFLARE_ACCOUNT_ID: ${credentials.accountId.slice(0, 8)}...\n- CLOUDFLARE_API_TOKEN: ${credentials.apiToken.slice(0, 8)}...\n\n部署流水线已启动：https://github.com/${REPOSITORY}/actions/workflows/deploy.yml`);
        
        console.log('🎉 完成！');
        return;
      } catch (error) {
        console.error(`❌ 配置失败: ${error.message}`);
        await addComment(`❌ 配置失败: ${error.message}`);
        return;
      }
    }
  }
  
  console.log('ℹ️ 未找到有效的 Cloudflare 凭证');
}

main().catch(console.error);