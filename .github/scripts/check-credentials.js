const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER || 'fengsheng-shengge';
const REPO_NAME = process.env.REPO_NAME || 'fengsheng-tasks';
const ISSUE_NUMBER = 42;

const XIAOYUER_ACCOUNTS = ['xiaoyuer-bot', 'xiaoyuer', 'coze-bot', 'coze', 'fengsheng-shengge'];

const STATE_FILE = path.join(__dirname, '.last-processed-comment');

function getLastProcessedCommentId() {
  try {
    return parseInt(fs.readFileSync(STATE_FILE, 'utf8').trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function saveLastProcessedCommentId(id) {
  fs.writeFileSync(STATE_FILE, id.toString());
}

async function fetchIssuesComments() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/comments`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (!response.ok) {
    console.error(`[ERROR] Failed to fetch comments: ${response.status} ${response.statusText}`);
    return [];
  }
  
  return response.json();
}

function extractCredentials(body) {
  const credentials = {};
  
  const accountIdPatterns = [
    /CLOUDFLARE_ACCOUNT_ID\s*[=:]\s*([a-f0-9]{32})/i,
    /Account\s*ID\s*[=:]\s*([a-f0-9]{32})/i,
    /account_id\s*[=:]\s*([a-f0-9]{32})/i,
    /accountid\s*[=:]\s*([a-f0-9]{32})/i,
    /([a-f0-9]{32})/g
  ];
  
  const apiTokenPatterns = [
    /CLOUDFLARE_API_TOKEN\s*[=:]\s*([A-Za-z0-9_-]{40,})/i,
    /API\s*Token\s*[=:]\s*([A-Za-z0-9_-]{40,})/i,
    /api_token\s*[=:]\s*([A-Za-z0-9_-]{40,})/i,
    /apitoken\s*[=:]\s*([A-Za-z0-9_-]{40,})/i
  ];
  
  for (const pattern of accountIdPatterns) {
    const match = body.match(pattern);
    if (match) {
      credentials.CLOUDFLARE_ACCOUNT_ID = match[1];
      break;
    }
  }
  
  for (const pattern of apiTokenPatterns) {
    const match = body.match(pattern);
    if (match) {
      credentials.CLOUDFLARE_API_TOKEN = match[1];
      break;
    }
  }
  
  return credentials;
}

async function getPublicKey() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/public-key`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (!response.ok) {
    console.error(`[ERROR] Failed to get public key: ${response.status} ${response.statusText}`);
    return null;
  }
  
  return response.json();
}

function encryptSecret(secretValue, publicKey) {
  const buffer = Buffer.from(secretValue, 'utf8');
  const key = Buffer.from(publicKey, 'base64');
  
  const encrypted = crypto.publicEncrypt({
    key: key,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, buffer);
  
  return encrypted.toString('base64');
}

async function setSecret(secretName, secretValue) {
  const publicKeyData = await getPublicKey();
  if (!publicKeyData) return false;
  
  const encryptedValue = encryptSecret(secretValue, publicKeyData.key);
  
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/${secretName}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      encrypted_value: encryptedValue,
      key_id: publicKeyData.key_id
    })
  });
  
  if (response.ok) {
    console.log(`[SUCCESS] Set secret: ${secretName}`);
    return true;
  } else {
    console.error(`[ERROR] Failed to set secret ${secretName}: ${response.status} ${response.statusText}`);
    return false;
  }
}

async function triggerDeploy() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event_type: 'deploy-from-credentials',
      client_payload: {
        source: 'check-credentials'
      }
    })
  });
  
  if (response.ok) {
    console.log('[SUCCESS] Triggered deploy workflow');
    return true;
  } else {
    console.error(`[ERROR] Failed to trigger deploy: ${response.status} ${response.statusText}`);
    return false;
  }
}

async function addIssueComment(comment) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/comments`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body: comment })
  });
  
  if (response.ok) {
    console.log('[SUCCESS] Added issue comment');
    return true;
  } else {
    console.error(`[ERROR] Failed to add comment: ${response.status} ${response.statusText}`);
    return false;
  }
}

async function main() {
  console.log('[INFO] Starting credential check for Issue #42...');
  
  if (!GITHUB_TOKEN) {
    console.error('[ERROR] GITHUB_TOKEN is not set');
    process.exit(1);
  }
  
  const lastProcessedId = getLastProcessedCommentId();
  console.log(`[INFO] Last processed comment ID: ${lastProcessedId}`);
  
  const comments = await fetchIssuesComments();
  console.log(`[INFO] Total comments fetched: ${comments.length}`);
  
  let foundCredentials = null;
  let latestCommentId = lastProcessedId;
  
  for (const comment of comments) {
    const commentId = comment.id;
    const author = comment.user.login;
    const body = comment.body;
    
    if (commentId > lastProcessedId) {
      console.log(`[INFO] Checking comment #${commentId} from ${author}`);
      
      if (XIAOYUER_ACCOUNTS.includes(author.toLowerCase())) {
        const credentials = extractCredentials(body);
        
        if (credentials.CLOUDFLARE_ACCOUNT_ID && credentials.CLOUDFLARE_API_TOKEN) {
          console.log('[INFO] Found valid Cloudflare credentials!');
          console.log(`[INFO] Account ID: ${credentials.CLOUDFLARE_ACCOUNT_ID}`);
          console.log(`[INFO] API Token: ${credentials.CLOUDFLARE_API_TOKEN.substring(0, 10)}...`);
          foundCredentials = credentials;
          latestCommentId = commentId;
          break;
        }
      }
      
      if (commentId > latestCommentId) {
        latestCommentId = commentId;
      }
    }
  }
  
  if (foundCredentials) {
    console.log('[INFO] Setting GitHub Secrets...');
    
    const setAccountId = await setSecret('CLOUDFLARE_ACCOUNT_ID', foundCredentials.CLOUDFLARE_ACCOUNT_ID);
    const setApiToken = await setSecret('CLOUDFLARE_API_TOKEN', foundCredentials.CLOUDFLARE_API_TOKEN);
    
    if (setAccountId && setApiToken) {
      console.log('[INFO] Triggering deployment...');
      const deployed = await triggerDeploy();
      
      if (deployed) {
        saveLastProcessedCommentId(latestCommentId);
        
        const notification = `✅ **Cloudflare 凭证已配置并触发部署！**\n\n检测到您在评论中提供了 Cloudflare 部署凭证，已自动完成以下操作：\n\n- ✅ 配置 CLOUDFLARE_ACCOUNT_ID\n- ✅ 配置 CLOUDFLARE_API_TOKEN\n- ✅ 触发 Cloudflare Pages 部署工作流\n\n部署完成后可访问：https://fengsheng.tech`;
        
        await addIssueComment(notification);
        
        console.log('[SUCCESS] All tasks completed successfully!');
        process.exit(0);
      }
    } else {
      console.error('[ERROR] Failed to set secrets');
      process.exit(1);
    }
  } else {
    console.log('[INFO] No new Cloudflare credentials found in comments');
    saveLastProcessedCommentId(latestCommentId);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[ERROR] Unexpected error:', err);
  process.exit(1);
});