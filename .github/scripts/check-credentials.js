const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'fengsheng-shengge';
const REPO_NAME = 'fengsheng-tasks';
const ISSUE_NUMBER = 42;
const STATE_FILE = path.join(__dirname, '.last-processed-comment');

const XIAOYUER_ACCOUNTS = ['xiaoyuer-bot', 'xiaoyuer', 'coze-bot', 'coze', 'fengsheng-shengge'];

function getLastProcessedCommentId() {
  try {
    return parseInt(fs.readFileSync(STATE_FILE, 'utf-8').trim());
  } catch {
    return 0;
  }
}

function setLastProcessedCommentId(id) {
  fs.writeFileSync(STATE_FILE, id.toString());
}

function fetch(url) {
  const result = execSync(`curl -s -H "Authorization: token ${GITHUB_TOKEN}" "${url}"`, { encoding: 'utf-8' });
  return JSON.parse(result);
}

function extractCredentials(body) {
  const credentials = {};
  
  const accountIdPatterns = [
    /CLOUDFLARE_ACCOUNT_ID\s*[=:]\s*([a-f0-9]{32})/i,
    /Account\s+ID\s*[=:]\s*([a-f0-9]{32})/i,
    /account_id\s*[=:]\s*([a-f0-9]{32})/i,
    /([a-f0-9]{32})/
  ];
  
  const apiTokenPatterns = [
    /CLOUDFLARE_API_TOKEN\s*[=:]\s*([A-Za-z0-9_-]{40,})/i,
    /API\s*Token\s*[=:]\s*([A-Za-z0-9_-]{40,})/i,
    /api_token\s*[=:]\s*([A-Za-z0-9_-]{40,})/i,
    /apiToken\s*[=:]\s*([A-Za-z0-9_-]{40,})/i
  ];
  
  for (const pattern of accountIdPatterns) {
    const match = body.match(pattern);
    if (match && match[1].length === 32) {
      credentials.CLOUDFLARE_ACCOUNT_ID = match[1];
      break;
    }
  }
  
  for (const pattern of apiTokenPatterns) {
    const match = body.match(pattern);
    if (match && match[1].length >= 40) {
      credentials.CLOUDFLARE_API_TOKEN = match[1];
      break;
    }
  }
  
  return credentials;
}

function setSecret(name, value) {
  try {
    const keyResult = execSync(`curl -s -H "Authorization: token ${GITHUB_TOKEN}" "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/public-key"`, { encoding: 'utf-8' });
    const keyData = JSON.parse(keyResult);
    
    const crypto = require('crypto');
    const buffer = Buffer.from(value, 'utf-8');
    const encrypted = crypto.publicEncrypt({
      key: keyData.key,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    }, buffer).toString('base64');
    
    execSync(`curl -s -X PUT -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/json" "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/${name}" -d '{"encrypted_value":"${encrypted}","key_id":"${keyData.key_id}"}'`);
    console.log(`✓ Secret ${name} set successfully`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to set secret ${name}:`, error.message);
    return false;
  }
}

function triggerDeployment() {
  try {
    execSync(`curl -s -X POST -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/json" "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches" -d '{"event_type":"deploy-from-credentials"}'`);
    console.log('✓ Deployment triggered via repository_dispatch');
    return true;
  } catch (error) {
    console.error('✗ Failed to trigger deployment:', error.message);
    return false;
  }
}

function addIssueComment(body) {
  try {
    const escapedBody = body.replace(/"/g, '\\"');
    execSync(`curl -s -X POST -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/json" "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/comments" -d '{"body":"${escapedBody}"}'`);
    console.log('✓ Comment added to Issue #42');
    return true;
  } catch (error) {
    console.error('✗ Failed to add comment:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Checking Issue #42 for Cloudflare credentials...');
  
  if (!GITHUB_TOKEN) {
    console.error('✗ GITHUB_TOKEN not set');
    process.exit(1);
  }
  
  const lastId = getLastProcessedCommentId();
  console.log(`Last processed comment ID: ${lastId}`);
  
  const comments = fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/comments`);
  
  if (!Array.isArray(comments)) {
    console.error('✗ Failed to fetch comments:', comments);
    process.exit(1);
  }
  
  console.log(`Total comments in Issue #42: ${comments.length}`);
  
  let foundCredentials = null;
  let foundComment = null;
  
  for (const comment of comments) {
    if (comment.id <= lastId) continue;
    
    const author = comment.user.login.toLowerCase();
    if (!XIAOYUER_ACCOUNTS.includes(author)) continue;
    
    console.log(`\n📝 Checking comment by ${comment.user.login} (ID: ${comment.id})`);
    
    const credentials = extractCredentials(comment.body);
    
    if (credentials.CLOUDFLARE_ACCOUNT_ID && credentials.CLOUDFLARE_API_TOKEN) {
      foundCredentials = credentials;
      foundComment = comment;
      console.log(`✅ Found credentials in comment #${comment.id}`);
      console.log(`   Account ID: ${credentials.CLOUDFLARE_ACCOUNT_ID}`);
      console.log(`   API Token: ${credentials.CLOUDFLARE_API_TOKEN.substring(0, 10)}...`);
      break;
    }
  }
  
  if (!foundCredentials) {
    console.log('\n⚠ No new credentials found in Issue #42 comments');
    process.exit(0);
  }
  
  console.log('\n🔐 Setting GitHub Secrets...');
  
  const accountIdSet = setSecret('CLOUDFLARE_ACCOUNT_ID', foundCredentials.CLOUDFLARE_ACCOUNT_ID);
  const apiTokenSet = setSecret('CLOUDFLARE_API_TOKEN', foundCredentials.CLOUDFLARE_API_TOKEN);
  
  if (!accountIdSet || !apiTokenSet) {
    console.error('✗ Failed to set secrets');
    process.exit(1);
  }
  
  setLastProcessedCommentId(foundComment.id);
  
  console.log('\n🚀 Triggering deployment...');
  const deployTriggered = triggerDeployment();
  
  const commentBody = `✅ **Cloudflare 凭证已配置并触发部署！**\n\n- 从 @${foundComment.user.login} 的评论中提取了凭证\n- \`CLOUDFLARE_ACCOUNT_ID\` → GitHub Secrets ✓\n- \`CLOUDFLARE_API_TOKEN\` → GitHub Secrets ✓\n- 部署工作流已启动\n\n查看部署进度：https://github.com/${REPO_OWNER}/${REPO_NAME}/actions/workflows/deploy.yml`;
  
  addIssueComment(commentBody);
  
  console.log('\n🎉 Done! Credentials configured and deployment triggered.');
}

main().catch(console.error);