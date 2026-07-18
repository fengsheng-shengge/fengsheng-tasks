const https = require('https');
const crypto = require('crypto');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER || 'fengsheng-shengge';
const REPO_NAME = process.env.REPO_NAME || 'fengsheng-tasks';
const ISSUE_NUMBER = parseInt(process.env.ISSUE_NUMBER || '42');

const XIAOYUER_ACCOUNTS = ['xiaoyuer-bot', 'xiaoyuer', 'coze-bot', 'coze', 'fengsheng-shengge'];

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}${path}`,
      method,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Trae-Credential-Checker'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(json)}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(`Parse Error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function extractCredentials(body) {
  const credentials = {};
  
  const accountIdMatch = body.match(/Account[\s_-]?ID[:=]\s*([a-f0-9]{32})/i);
  if (accountIdMatch) {
    credentials.CLOUDFLARE_ACCOUNT_ID = accountIdMatch[1];
  }

  const apiTokenMatch = body.match(/API[\s_-]?Token[:=]\s*([A-Za-z0-9_-]{40,})/i);
  if (apiTokenMatch) {
    credentials.CLOUDFLARE_API_TOKEN = apiTokenMatch[1];
  }

  const envAccountId = body.match(/CLOUDFLARE_ACCOUNT_ID[\s=]*([a-f0-9]{32})/i);
  if (envAccountId) {
    credentials.CLOUDFLARE_ACCOUNT_ID = envAccountId[1];
  }

  const envApiToken = body.match(/CLOUDFLARE_API_TOKEN[\s=]*([A-Za-z0-9_-]{40,})/i);
  if (envApiToken) {
    credentials.CLOUDFLARE_API_TOKEN = envApiToken[1];
  }

  return credentials;
}

async function getPublicKey() {
  const result = await apiRequest('GET', '/actions/secrets/public-key');
  return {
    key_id: result.key_id,
    key: result.key
  };
}

function encryptSecret(secretValue, publicKey) {
  const buffer = Buffer.from(secretValue, 'utf8');
  const key = Buffer.from(publicKey, 'base64');
  
  const encrypted = crypto.publicEncrypt({
    key: key,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
  }, buffer);
  
  return encrypted.toString('base64');
}

async function setSecret(secretName, secretValue) {
  const { key_id, key } = await getPublicKey();
  const encryptedValue = encryptSecret(secretValue, key);
  
  await apiRequest('PUT', `/actions/secrets/${secretName}`, {
    encrypted_value: encryptedValue,
    key_id: key_id
  });
}

async function triggerDeploy() {
  await apiRequest('POST', '/dispatches', {
    event_type: 'deploy-from-credentials'
  });
}

async function addIssueComment(message) {
  await apiRequest('POST', `/issues/${ISSUE_NUMBER}/comments`, {
    body: message
  });
}

async function checkStateFile() {
  try {
    const fs = require('fs');
    const path = require('path');
    const statePath = path.join(__dirname, 'processed-comments.json');
    
    if (fs.existsSync(statePath)) {
      const content = fs.readFileSync(statePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.log('No state file found, starting fresh');
  }
  return { processedCommentIds: [] };
}

async function saveStateFile(state) {
  const fs = require('fs');
  const path = require('path');
  const statePath = path.join(__dirname, 'processed-comments.json');
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

async function main() {
  console.log('=== 🔍 开始检查 Issue #42 凭证 ===');
  
  try {
    const state = await checkStateFile();
    
    console.log(`📡 获取 Issue #${ISSUE_NUMBER} 评论...`);
    let comments = [];
    let page = 1;
    
    while (true) {
      const pageComments = await apiRequest('GET', `/issues/${ISSUE_NUMBER}/comments?per_page=100&page=${page}`);
      if (pageComments.length === 0) break;
      comments = comments.concat(pageComments);
      page++;
    }
    
    console.log(`📥 共获取 ${comments.length} 条评论`);
    
    const newComments = comments.filter(c => !state.processedCommentIds.includes(c.id));
    console.log(`✨ 新增 ${newComments.length} 条未处理评论`);
    
    let foundCredentials = null;
    let foundComment = null;
    
    for (const comment of newComments) {
      const userLogin = comment.user.login.toLowerCase();
      
      if (!XIAOYUER_ACCOUNTS.includes(userLogin)) {
        continue;
      }
      
      console.log(`🔍 检查评论 #${comment.id} (${comment.user.login})`);
      
      const credentials = extractCredentials(comment.body);
      
      if (credentials.CLOUDFLARE_ACCOUNT_ID && credentials.CLOUDFLARE_API_TOKEN) {
        foundCredentials = credentials;
        foundComment = comment;
        console.log('✅ 找到完整凭证！');
        break;
      }
    }
    
    if (!foundCredentials) {
      console.log('🚫 未找到有效的 Cloudflare 凭证');
      
      if (newComments.length > 0) {
        state.processedCommentIds = state.processedCommentIds.concat(newComments.map(c => c.id));
        await saveStateFile(state);
      }
      
      console.log('=== ✅ 检查完成，无新凭证 ===');
      return;
    }
    
    console.log('🔐 配置 GitHub Secrets...');
    
    await setSecret('CLOUDFLARE_ACCOUNT_ID', foundCredentials.CLOUDFLARE_ACCOUNT_ID);
    console.log('   ✓ CLOUDFLARE_ACCOUNT_ID');
    
    await setSecret('CLOUDFLARE_API_TOKEN', foundCredentials.CLOUDFLARE_API_TOKEN);
    console.log('   ✓ CLOUDFLARE_API_TOKEN');
    
    console.log('🚀 触发部署...');
    await triggerDeploy();
    console.log('   ✓ 部署已触发');
    
    console.log('💬 在 Issue 回复通知...');
    const message = `✅ **凭证已配置完成！**\n\n检测到 @${foundComment.user.login} 提供的 Cloudflare 部署凭证，已自动配置到 GitHub Secrets 并触发部署。\n\n- **Account ID**: \`${foundCredentials.CLOUDFLARE_ACCOUNT_ID}\`\n- **API Token**: \`${foundCredentials.CLOUDFLARE_API_TOKEN.slice(0, 8)}...\`\n\n部署状态：👉 [查看 Actions](https://github.com/${REPO_OWNER}/${REPO_NAME}/actions/workflows/deploy.yml)`;
    
    await addIssueComment(message);
    console.log('   ✓ 通知已发送');
    
    state.processedCommentIds = state.processedCommentIds.concat(newComments.map(c => c.id));
    await saveStateFile(state);
    
    console.log('=== 🎉 凭证配置与部署触发完成 ===');
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    
    try {
      const errorMessage = `⚠️ **凭证检查脚本执行失败**\n\n错误信息：\`${error.message}\`\n\n请检查 GitHub Token 权限或网络连接。`;
      await addIssueComment(errorMessage);
    } catch (e) {
      console.error('发送错误通知失败:', e.message);
    }
    
    process.exit(1);
  }
}

main();
