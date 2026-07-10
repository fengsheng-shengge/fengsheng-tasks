#!/usr/bin/env python3
"""
每小时检查 GitHub Issue #42，查看小鱼儿是否回复了 Cloudflare 部署凭证。
如果找到凭证，提取并配置到 GitHub Secrets，然后触发部署。
"""

import os
import re
import json
import requests
from datetime import datetime

# 配置
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')
REPO_OWNER = 'fengsheng-shengge'
REPO_NAME = 'fengsheng-tasks'
ISSUE_NUMBER = 42

# 多种凭证格式的正则表达式
ACCOUNT_ID_PATTERNS = [
    # 英文格式
    r'(?:CLOUDFLARE_)?ACCOUNT[_\s-]?ID[\s:=]+([a-f0-9]{32})',
    r'account[_\s]?id[\s:=是：]+([a-f0-9]{32})',
    # 中文格式
    r'账号?\s*ID[\s:=：]+([a-f0-9]{32})',
    r'账户ID[\s:=：]+([a-f0-9]{32})',
    # 环境变量格式
    r'CLOUDFLARE_ACCOUNT_ID\s*=\s*([a-f0-9]{32})',
    # 简单格式
    r'Account ID[\s:=：]+([a-f0-9]{32})',
]

API_TOKEN_PATTERNS = [
    # 英文格式
    r'(?:CLOUDFLARE_)?API[_\s-]?TOKEN[\s:=]+([A-Za-z0-9_-]{30,})',
    r'api[_\s]?token[\s:=是：]+([A-Za-z0-9_-]{30,})',
    # 中文格式
    r'令牌[\s:=：]+([A-Za-z0-9_-]{30,})',
    r'Token[\s:=：]+([A-Za-z0-9_-]{30,})',
    # 环境变量格式
    r'CLOUDFLARE_API_TOKEN\s*=\s*([A-Za-z0-9_-]{30,})',
    # 简单格式
    r'API Token[\s:=：]+([A-Za-z0-9_-]{30,})',
]

# 编译所有模式
ACCOUNT_ID_REGEXES = [re.compile(pattern, re.IGNORECASE) for pattern in ACCOUNT_ID_PATTERNS]
API_TOKEN_REGEXES = [re.compile(pattern, re.IGNORECASE) for pattern in API_TOKEN_PATTERNS]

# 小鱼儿的 GitHub 用户名（需要根据实际情况调整）
XIAOYUER_USERNAMES = ['xiaoyuer', '小鱼儿', 'xiaoyuer-coze', 'coze-bot']

def get_issue_comments():
    """获取 Issue 的所有评论"""
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    all_comments = []
    page = 1
    
    while True:
        url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues/{ISSUE_NUMBER}/comments'
        params = {'per_page': 100, 'page': page}
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            print(f"Error fetching comments: {response.status_code}")
            print(response.text)
            break
        
        comments = response.json()
        
        if not comments:
            break
        
        all_comments.extend(comments)
        page += 1
    
    return all_comments

def extract_credentials(text):
    """从文本中提取 Cloudflare 凭证（支持多种格式）"""
    credentials = {}
    
    # 尝试所有 Account ID 模式
    for pattern in ACCOUNT_ID_REGEXES:
        match = pattern.search(text)
        if match:
            credentials['account_id'] = match.group(1)
            break
    
    # 尝试所有 API Token 模式
    for pattern in API_TOKEN_REGEXES:
        match = pattern.search(text)
        if match:
            credentials['api_token'] = match.group(1)
            break
    
    return credentials

def is_xiaoyuer_comment(comment):
    """检查评论是否来自小鱼儿"""
    username = comment.get('user', {}).get('login', '').lower()
    return any(name.lower() in username for name in XIAOYUER_USERNAMES)

def set_github_secret(secret_name, secret_value):
    """设置 GitHub Secret"""
    from cryptography.fernet import Fernet
    import base64
    
    # 获取仓库公钥
    url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/actions/secrets/public-key'
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Error getting public key: {response.status_code}")
        return False
    
    public_key = response.json()['key']
    key_id = response.json()['key_id']
    
    # 使用 libsodium 加密
    try:
        from nacl import encoding, public
        public_key_bytes = base64.b64decode(public_key)
        sealed_box = public.SealedBox(public.PublicKey(public_key_bytes))
        encrypted = sealed_box.encrypt(secret_value.encode('utf-8'))
        encrypted_value = base64.b64encode(encrypted).decode('utf-8')
    except ImportError:
        print("Warning: PyNaCl not available, using alternative method")
        # 如果没有 PyNaCl，使用明文存储（不推荐，但作为备选）
        encrypted_value = base64.b64encode(secret_value.encode('utf-8')).decode('utf-8')
    
    # 设置 secret
    url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/actions/secrets/{secret_name}'
    data = {
        'encrypted_value': encrypted_value,
        'key_id': key_id
    }
    
    response = requests.put(url, headers=headers, json=data)
    
    if response.status_code in [201, 204]:
        print(f"✓ Successfully set secret: {secret_name}")
        return True
    else:
        print(f"✗ Failed to set secret {secret_name}: {response.status_code}")
        print(response.text)
        return False

def trigger_deployment():
    """触发部署工作流"""
    url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/actions/workflows/deploy.yml/dispatches'
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    data = {
        'ref': 'main',
        'inputs': {
            'triggered_by': 'credential_check',
            'timestamp': datetime.now().isoformat()
        }
    }
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 204:
        print("✓ Successfully triggered deployment workflow")
        return True
    else:
        print(f"✗ Failed to trigger deployment: {response.status_code}")
        print(response.text)
        return False

def add_issue_comment(message):
    """在 Issue 中添加评论"""
    url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues/{ISSUE_NUMBER}/comments'
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    data = {'body': message}
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 201:
        print(f"✓ Successfully added comment to issue")
        return True
    else:
        print(f"✗ Failed to add comment: {response.status_code}")
        return False

def main():
    """主函数"""
    print(f"\n{'='*60}")
    print(f"检查 Issue #{ISSUE_NUMBER} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    # 检查环境变量
    if not GITHUB_TOKEN:
        print("✗ Error: GITHUB_TOKEN environment variable not set")
        return
    
    # 获取评论
    print("→ Fetching issue comments...")
    comments = get_issue_comments()
    print(f"  Found {len(comments)} comments")
    
    # 查找小鱼儿的评论并提取凭证
    found_credentials = {}
    latest_xiaoyuer_comment = None
    
    for comment in comments:
        if is_xiaoyuer_comment(comment):
            credentials = extract_credentials(comment['body'])
            if credentials:
                found_credentials.update(credentials)
                latest_xiaoyuer_comment = comment
    
    if not found_credentials:
        print("\n✗ No Cloudflare credentials found in comments from 小鱼儿")
        print("  Waiting for next check...")
        return
    
    print(f"\n✓ Found credentials in comment from {latest_xiaoyuer_comment['user']['login']}")
    print(f"  Comment date: {latest_xiaoyuer_comment['created_at']}")
    print(f"  Credentials found:")
    for key in found_credentials:
        print(f"    - {key}: {'*' * 20}")
    
    # 检查是否已经配置过
    secrets_url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/actions/secrets'
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    response = requests.get(secrets_url, headers=headers)
    existing_secrets = response.json().get('secrets', [])
    existing_secret_names = [s['name'] for s in existing_secrets]
    
    # 配置 GitHub Secrets
    print("\n→ Configuring GitHub Secrets...")
    success = True
    
    if 'account_id' in found_credentials:
        if 'CLOUDFLARE_ACCOUNT_ID' not in existing_secret_names:
            if set_github_secret('CLOUDFLARE_ACCOUNT_ID', found_credentials['account_id']):
                print("  ✓ CLOUDFLARE_ACCOUNT_ID configured")
            else:
                success = False
        else:
            print("  - CLOUDFLARE_ACCOUNT_ID already exists, updating...")
            if set_github_secret('CLOUDFLARE_ACCOUNT_ID', found_credentials['account_id']):
                print("  ✓ CLOUDFLARE_ACCOUNT_ID updated")
            else:
                success = False
    
    if 'api_token' in found_credentials:
        if 'CLOUDFLARE_API_TOKEN' not in existing_secret_names:
            if set_github_secret('CLOUDFLARE_API_TOKEN', found_credentials['api_token']):
                print("  ✓ CLOUDFLARE_API_TOKEN configured")
            else:
                success = False
        else:
            print("  - CLOUDFLARE_API_TOKEN already exists, updating...")
            if set_github_secret('CLOUDFLARE_API_TOKEN', found_credentials['api_token']):
                print("  ✓ CLOUDFLARE_API_TOKEN updated")
            else:
                success = False
    
    if success:
        # 添加确认评论
        comment_message = f"""## ✅ 凭证已配置

检测到小鱼儿提供的 Cloudflare 凭证，已成功配置到 GitHub Secrets。

**配置详情：**
- CLOUDFLARE_ACCOUNT_ID: ✓ 已设置
- CLOUDFLARE_API_TOKEN: ✓ 已设置

**下一步：** 正在触发部署流程...

---
*自动检测时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
*触发来源: 凭证自动检测脚本*
"""
        add_issue_comment(comment_message)
        
        # 触发部署
        print("\n→ Triggering deployment...")
        trigger_deployment()
        
        print("\n✓ All done! Deployment workflow has been triggered.")
    else:
        print("\n✗ Failed to configure some secrets. Please check manually.")
        add_issue_comment("⚠️ 检测到凭证但配置失败，请手动检查 GitHub Secrets 设置。")

if __name__ == '__main__':
    main()
