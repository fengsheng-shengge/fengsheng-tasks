const https = require('https');
const crypto = require('crypto');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPOSITORY = process.env.REPOSITORY || 'fengsheng-shengge/fengsheng-tasks';
const ISSUE_NUMBER = 42;

const XIAOYUER_USERS = ['xiaoyuer-bot', 'xiaoyuer', 'coze-bot', 'coze', 'fengsheng-shengge'];

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      ...options,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function extractCredentials(commentBody) {
  const credentials = {};
  
  const accountIdPatterns = [
    /CLOUDFLARE_ACCOUNT_ID[\s=:]+([a-f0-9]{32})/i,
    /Account[\s_-]?ID[\s=:]+([a-f0-9]{32})/i,
    /account_id[\s=:]+([a-f0-9]{32})/i
  ];
  
  const apiTokenPatterns = [
    /CLOUDFLARE_API_TOKEN[\s=:]+([a-zA-Z0-9_]{30,})/i,
    /API[\s_-]?Token[\s=:]+([a-zA-Z0-9_]{30,})/i,
    /api_token[\s=:]+([a-zA-Z0-9_]{30,})/i
  ];
  
  for (const pattern of accountIdPatterns) {
    const match = commentBody.match(pattern);
    if (match) {
      credentials.accountId = match[1];
      break;
    }
  }
  
  for (const pattern of apiTokenPatterns) {
    const match = commentBody.match(pattern);
    if (match) {
      credentials.apiToken = match[1];
      break;
    }
  }
  
  return credentials;
}

function encryptSecret(secretValue, publicKey) {
  const buffer = Buffer.from(publicKey, 'base64');
  const key = buffer.slice(0, 32);
  const nonce = crypto.randomBytes(24);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce.slice(0, 12));
  let encrypted = cipher.update(secretValue, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([nonce, authTag, encrypted]).toString('base64');
}

async function setSecret(name, value) {
  const { key, key_id } = await fetch(`https://api.github.com/repos/${REPOSITORY}/actions/secrets/public-key`);
  const encryptedValue = encryptSecret(value, key);
  await fetch(`https://api.github.com/repos/${REPOSITORY}/actions/secrets/${name}`, {
    method: 'PUT',
    body: { encrypted_value: encryptedValue, key_id }
  });
  console.log(`✅ Secret ${name} updated`);
}

async function triggerDeploy() {
  await fetch(`https://api.github.com/repos/${REPOSITORY}/dispatches`, {
    method: 'POST',
    body: { event_type: 'deploy-from-credentials' }
  });
  console.log('✅ Deployment triggered via repository_dispatch');
}

async function addComment(message) {
  await fetch(`https://api.github.com/repos/${REPOSITORY}/issues/${ISSUE_NUMBER}/comments`, {
    method: 'POST',
    body: { body: message }
  });
  console.log('✅ Comment added to Issue #42');
}

async function main() {
  console.log(`🔍 Checking Issue #${ISSUE_NUMBER} for Cloudflare credentials...`);
  
  try {
    const comments = await fetch(`https://api.github.com/repos/${REPOSITORY}/issues/${ISSUE_NUMBER}/comments`);
    
    for (const comment of comments) {
      const userLogin = comment.user.login.toLowerCase();
      
      if (!XIAOYUER_USERS.includes(userLogin)) {
        continue;
      }
      
      console.log(`📝 Checking comment from @${comment.user.login}...`);
      
      const credentials = extractCredentials(comment.body);
      
      if (credentials.accountId && credentials.apiToken) {
        console.log(`🎉 Found credentials in comment #${comment.id}!`);
        console.log(`   Account ID: ${credentials.accountId}`);
        console.log(`   API Token: ${credentials.apiToken.substring(0, 10)}...`);
        
        await setSecret('CLOUDFLARE_ACCOUNT_ID', credentials.accountId);
        await setSecret('CLOUDFLARE_API_TOKEN', credentials.apiToken);
        
        await triggerDeploy();
        
        await addComment(`✅ 已成功提取并配置 Cloudflare 部署凭证！\n\n- **Account ID**: 已配置到 \`CLOUDFLARE_ACCOUNT_ID\`\n- **API Token**: 已配置到 \`CLOUDFLARE_API_TOKEN\`\n- **部署状态**: 已触发自动部署 workflow\n\n部署完成后可访问 https://fengsheng.tech 验证。`);
        
        process.exit(0);
        return;
      }
    }
    
    console.log('🔔 No credentials found in Issue #42 comments. Will check again in 1 hour.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
