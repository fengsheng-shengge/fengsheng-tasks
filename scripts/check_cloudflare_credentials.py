import os
import re
import json
import sys
import subprocess
from datetime import datetime

GITHUB_API_TOKEN = os.environ.get("GITHUB_API_TOKEN")
REPO_OWNER = "fengsheng-shengge"
REPO_NAME = "fengsheng-tasks"
ISSUE_NUMBER = 42

CLOUDFLARE_ACCOUNT_ID_PATTERN = re.compile(r'(CLOUDFLARE_ACCOUNT_ID|Account ID|account_id)\s*[=:]\s*([a-f0-9]{32})', re.IGNORECASE)
CLOUDFLARE_API_TOKEN_PATTERN = re.compile(r'(CLOUDFLARE_API_TOKEN|API Token|api_token)\s*[=:]\s*([A-Za-z0-9_-]{40,})', re.IGNORECASE)

def run_command(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip(), result.stderr.strip(), result.returncode

def get_issue_comments():
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues/{ISSUE_NUMBER}/comments"
    cmd = f'curl -s -H "Authorization: token {GITHUB_API_TOKEN}" "{url}"'
    stdout, stderr, returncode = run_command(cmd)
    if returncode != 0:
        print(f"❌ 获取评论失败: {stderr}")
        return []
    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        print(f"❌ 解析评论JSON失败: {stdout}")
        return []

def extract_credentials(comment_body):
    account_id_match = CLOUDFLARE_ACCOUNT_ID_PATTERN.search(comment_body)
    api_token_match = CLOUDFLARE_API_TOKEN_PATTERN.search(comment_body)
    
    credentials = {}
    if account_id_match:
        credentials["CLOUDFLARE_ACCOUNT_ID"] = account_id_match.group(2)
    if api_token_match:
        credentials["CLOUDFLARE_API_TOKEN"] = api_token_match.group(2)
    
    return credentials

def set_github_secret(secret_name, secret_value):
    cmd = f'''gh secret set {secret_name} --repo {REPO_OWNER}/{REPO_NAME} <<EOF
{secret_value}
EOF'''
    stdout, stderr, returncode = run_command(cmd)
    if returncode == 0:
        print(f"✅ 已设置 GitHub Secret: {secret_name}")
        return True
    else:
        print(f"❌ 设置 GitHub Secret {secret_name} 失败: {stderr}")
        return False

def trigger_deploy_workflow():
    cmd = f'''gh workflow run deploy.yml --repo {REPO_OWNER}/{REPO_NAME}'''
    stdout, stderr, returncode = run_command(cmd)
    if returncode == 0:
        print(f"✅ 已触发部署 workflow")
        return True
    else:
        print(f"❌ 触发部署 workflow 失败: {stderr}")
        return False

def check_credentials_already_set():
    cmd = f'''gh secret list --repo {REPO_OWNER}/{REPO_NAME}'''
    stdout, stderr, returncode = run_command(cmd)
    if returncode == 0:
        if "CLOUDFLARE_ACCOUNT_ID" in stdout and "CLOUDFLARE_API_TOKEN" in stdout:
            print("✅ Cloudflare Secrets 已配置")
            return True
    return False

def main():
    print(f"🔍 [{datetime.now().isoformat()}] 开始检查 Issue #{ISSUE_NUMBER} 的 Cloudflare 凭证...")
    
    if not GITHUB_API_TOKEN:
        print("❌ GITHUB_API_TOKEN 环境变量未设置")
        sys.exit(1)
    
    if check_credentials_already_set():
        print("ℹ️ 凭证已配置，跳过检查")
        return
    
    comments = get_issue_comments()
    print(f"📝 获取到 {len(comments)} 条评论")
    
    for comment in reversed(comments):
        comment_body = comment.get("body", "")
        user_login = comment.get("user", {}).get("login", "")
        
        credentials = extract_credentials(comment_body)
        
        if credentials:
            print(f"🎉 在用户 {user_login} 的评论中找到凭证！")
            print(f"   内容: {credentials}")
            
            success_count = 0
            if "CLOUDFLARE_ACCOUNT_ID" in credentials:
                if set_github_secret("CLOUDFLARE_ACCOUNT_ID", credentials["CLOUDFLARE_ACCOUNT_ID"]):
                    success_count += 1
            if "CLOUDFLARE_API_TOKEN" in credentials:
                if set_github_secret("CLOUDFLARE_API_TOKEN", credentials["CLOUDFLARE_API_TOKEN"]):
                    success_count += 1
            
            if success_count == 2:
                print("✅ 所有凭证已配置到 GitHub Secrets")
                print("🚀 触发部署...")
                trigger_deploy_workflow()
                return
            else:
                print("❌ 部分凭证配置失败，请检查")
                return
    
    print("ℹ️ 未在评论中找到 Cloudflare 凭证")

if __name__ == "__main__":
    main()
