#!/usr/bin/env python3
"""
检查 GitHub Issue #42 中小鱼儿是否回复了 Cloudflare 凭证
如果找到凭证，配置到 GitHub Secrets 并触发部署
"""

import os
import re
import sys
import json
import requests
from datetime import datetime
from typing import Optional, Tuple

# 配置
REPO_OWNER = "fengsheng-shengge"
REPO_NAME = "fengsheng-tasks"
ISSUE_NUMBER = 42

# 从环境变量获取 GitHub Token
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# 颜色输出
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

def log_info(msg: str):
    print(f"{Colors.BLUE}[INFO]{Colors.NC} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {msg}")

def log_success(msg: str):
    print(f"{Colors.GREEN}[SUCCESS]{Colors.NC} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {msg}")

def log_warning(msg: str):
    print(f"{Colors.YELLOW}[WARNING]{Colors.NC} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {msg}")

def log_error(msg: str):
    print(f"{Colors.RED}[ERROR]{Colors.NC} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {msg}")

def get_issue_comments(token: str) -> list:
    """获取 Issue 的所有评论"""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues/{ISSUE_NUMBER}/comments"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {token}"
    }
    
    all_comments = []
    page = 1
    
    while True:
        params = {"per_page": 100, "page": page, "sort": "created", "direction": "desc"}
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            log_error(f"获取评论失败: {response.status_code} - {response.text}")
            return []
        
        comments = response.json()
        if not comments:
            break
        
        all_comments.extend(comments)
        
        # 检查是否有更多页
        link_header = response.headers.get("Link", "")
        if 'rel="next"' not in link_header:
            break
        
        page += 1
    
    return all_comments

def parse_cloudflare_credentials(text: str) -> Tuple[Optional[str], Optional[str]]:
    """从文本中解析 Cloudflare 凭证"""
    account_id = None
    api_token = None
    
    # 模式1: 明确标记的 Account ID
    # 格式: CLOUDFLARE_ACCOUNT_ID: xxx 或 Account ID: xxx 或 账号ID: xxx
    patterns_account = [
        r'(?:CLOUDFLARE_)?ACCOUNT[_\s-]?ID[\s:：]*[`"]?([a-f0-9]{32})[`"]?',
        r'账号ID[\s:：]*[`"]?([a-f0-9]{32})[`"]?',
        r'Account ID[\s:：]*[`"]?([a-f0-9]{32})[`"]?',
    ]
    
    for pattern in patterns_account:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            account_id = match.group(1)
            break
    
    # 模式2: 明确标记的 API Token
    # Cloudflare API Token 格式: 通常约40-100个字符
    patterns_token = [
        r'(?:CLOUDFLARE_)?API[_\s-]?TOKEN[\s:：]*[`"]?([A-Za-z0-9_-]{40,})[`"]?',
        r'API[\s]?Token[\s:：]*[`"]?([A-Za-z0-9_-]{40,})[`"]?',
        r'API令牌[\s:：]*[`"]?([A-Za-z0-9_-]{40,})[`"]?',
    ]
    
    for pattern in patterns_token:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            api_token = match.group(1)
            break
    
    # 模式3: 独立的32位十六进制字符串（可能是 Account ID）
    if not account_id:
        hex_matches = re.findall(r'\b([a-f0-9]{32})\b', text)
        if hex_matches:
            # 选择最可能是 Account ID 的那个（通常在开头或独立成行）
            for match in hex_matches:
                account_id = match
                break
    
    # 模式4: 独立的长字符串（可能是 API Token）
    if not api_token:
        # Cloudflare API Token 通常包含字母和数字，长度约40+
        token_matches = re.findall(r'\b([A-Za-z0-9_-]{40,})\b', text)
        for match in token_matches:
            # 排除看起来像 URL 或哈希的字符串
            if not match.startswith('http') and not match.startswith('ghp_'):
                api_token = match
                break
    
    return account_id, api_token

def check_for_xiaoyuer_comments(comments: list) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """检查小鱼儿的评论中是否包含凭证"""
    # 小鱼儿可能的用户名
    xiaoyuer_usernames = ['xiaoyuer', '小鱼儿', 'coze-bot', 'coze_bot', 'fengsheng-shengge']
    
    # 按时间倒序检查（最新的评论优先）
    for comment in comments:
        body = comment.get('body', '')
        user = comment.get('user', {}).get('login', '').lower()
        user_display = comment.get('user', {}).get('login', '')
        created_at = comment.get('created_at', '')
        
        # 检查是否是小鱼儿的评论
        is_xiaoyuer = any(name in user for name in xiaoyuer_usernames)
        
        # 或者检查评论内容是否包含特定标记（凭证关键词）
        has_credential_marker = any(marker in body.lower() for marker in [
            'account id', 'api token', '凭证', 'credential', 'cloudflare'
        ])
        
        if is_xiaoyuer or has_credential_marker:
            log_info(f"检查评论 (用户: {user_display}, 时间: {created_at})")
            
            account_id, api_token = parse_cloudflare_credentials(body)
            
            if account_id and api_token:
                log_success(f"在 {user_display} 的评论中找到凭证!")
                return account_id, api_token, user_display
    
    return None, None, None

def set_github_secret(token: str, secret_name: str, secret_value: str) -> bool:
    """设置 GitHub Secret"""
    import base64
    from nacl import encoding, public
    
    # 获取仓库公钥
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/actions/secrets/public-key"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {token}"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        log_error(f"获取公钥失败: {response.status_code}")
        return False
    
    key_data = response.json()
    public_key = key_data['key']
    key_id = key_data['key_id']
    
    # 加密 secret
    public_key_bytes = base64.b64decode(public_key)
    sealed_box = public.SealedBox(public.PublicKey(public_key_bytes))
    encrypted = sealed_box.encrypt(secret_value.encode())
    encrypted_value = base64.b64encode(encrypted).decode()
    
    # 设置 secret
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/actions/secrets/{secret_name}"
    data = {
        "encrypted_value": encrypted_value,
        "key_id": key_id
    }
    
    response = requests.put(url, headers=headers, json=data)
    if response.status_code in [201, 204]:
        return True
    else:
        log_error(f"设置 {secret_name} 失败: {response.status_code}")
        return False

def trigger_deployment(token: str) -> bool:
    """触发部署 workflow"""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/actions/workflows/deploy.yml/dispatches"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {token}"
    }
    data = {
        "ref": "main",
        "inputs": {
            "environment": "production"
        }
    }
    
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 204:
        return True
    else:
        log_error(f"触发部署失败: {response.status_code} - {response.text}")
        return False

def add_issue_comment(token: str, body: str) -> bool:
    """添加 Issue 评论"""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues/{ISSUE_NUMBER}/comments"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {token}"
    }
    data = {"body": body}
    
    response = requests.post(url, headers=headers, json=data)
    return response.status_code == 201

def main():
    log_info("=" * 50)
    log_info("检查 GitHub Issue #42 - Cloudflare 凭证")
    log_info("=" * 50)
    
    if not GITHUB_TOKEN:
        log_error("未设置 GITHUB_TOKEN 环境变量")
        sys.exit(1)
    
    # 获取评论
    log_info("获取 Issue 评论...")
    comments = get_issue_comments(GITHUB_TOKEN)
    
    if not comments:
        log_warning("没有找到评论或获取失败")
        sys.exit(0)
    
    log_info(f"找到 {len(comments)} 条评论")
    
    # 检查小鱼儿的评论
    account_id, api_token, user = check_for_xiaoyuer_comments(comments)
    
    if account_id and api_token:
        log_success("找到 Cloudflare 凭证!")
        log_info(f"Account ID: {account_id[:8]}...{account_id[-4:]}")
        log_info(f"API Token: {api_token[:8]}...{api_token[-4:]}")
        
        # 设置 GitHub Secrets
        log_info("正在配置 GitHub Secrets...")
        
        try:
            if set_github_secret(GITHUB_TOKEN, "CLOUDFLARE_ACCOUNT_ID", account_id):
                log_success("CLOUDFLARE_ACCOUNT_ID 已设置")
            else:
                log_error("设置 CLOUDFLARE_ACCOUNT_ID 失败")
                sys.exit(1)
            
            if set_github_secret(GITHUB_TOKEN, "CLOUDFLARE_API_TOKEN", api_token):
                log_success("CLOUDFLARE_API_TOKEN 已设置")
            else:
                log_error("设置 CLOUDFLARE_API_TOKEN 失败")
                sys.exit(1)
        except ImportError:
            log_warning("缺少 PyNaCl 库，无法加密 Secrets")
            log_info("请手动设置 Secrets:")
            log_info(f"  CLOUDFLARE_ACCOUNT_ID = {account_id}")
            log_info(f"  CLOUDFLARE_API_TOKEN = {api_token}")
            log_info(f"  访问: https://github.com/{REPO_OWNER}/{REPO_NAME}/settings/secrets/actions")
            sys.exit(0)
        
        # 添加评论确认
        comment_body = f"""## 🔐 Cloudflare 凭证已配置

感谢 @{user} 提供的凭证！

| 状态 | 操作 |
|------|------|
| ✅ | CLOUDFLARE_ACCOUNT_ID 已设置到 GitHub Secrets |
| ✅ | CLOUDFLARE_API_TOKEN 已设置到 GitHub Secrets |
| ⏳ | 正在触发部署... |

部署完成后将自动验证网站可访问性。

---
*此评论由自动检查脚本生成*
"""
        add_issue_comment(GITHUB_TOKEN, comment_body)
        
        # 触发部署
        log_info("正在触发部署...")
        if trigger_deployment(GITHUB_TOKEN):
            log_success("部署已触发!")
            log_info(f"查看进度: https://github.com/{REPO_OWNER}/{REPO_NAME}/actions")
        else:
            log_error("触发部署失败")
            sys.exit(1)
    else:
        log_info("未找到 Cloudflare 凭证")
        log_info("等待小鱼儿回复...")
    
    log_info("=" * 50)

if __name__ == "__main__":
    main()
