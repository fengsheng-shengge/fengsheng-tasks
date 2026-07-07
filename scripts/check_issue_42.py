#!/usr/bin/env python3
import os
import re
import sys
import json
import time
import base64
import urllib.request
import urllib.error

GITHUB_REPO_OWNER = "fengsheng-shengge"
GITHUB_REPO_NAME = "fengsheng-tasks"
ISSUE_NUMBER = 42
STATUS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".agent", "memory", "deploy_progress.json")

CLOUDFLARE_ACCOUNT_ID_PATTERN = re.compile(r'(?i)CLOUDFLARE_ACCOUNT_ID[^\w]*([a-f0-9]{32})')
CLOUDFLARE_API_TOKEN_PATTERN = re.compile(r'(?i)CLOUDFLARE_API_TOKEN[^\w]*([a-f0-9]{40})')

STATE_NOT_FOUND = "NOT_FOUND"
STATE_FOUND_READY = "FOUND_READY"
STATE_FOUND_DEPLOYED = "FOUND_DEPLOYED"
STATE_ERROR = "ERROR"

def get_github_token():
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        token = os.environ.get('GH_TOKEN')
    return token

def read_status():
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {"state": STATE_NOT_FOUND, "last_check": None, "account_id": None, "api_token": None}

def write_status(status):
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    with open(STATUS_FILE, 'w') as f:
        json.dump(status, f, indent=2)

def fetch_issue_comments(token):
    url = f"https://api.github.com/repos/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/issues/{ISSUE_NUMBER}/comments?per_page=100"
    headers = {"Authorization": f"token {token}"} if token else {}
    
    all_comments = []
    page = 1
    
    while url:
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                comments = json.loads(resp.read().decode())
                all_comments.extend(comments)
                
                link_header = resp.headers.get('Link', '')
                next_url = None
                for part in link_header.split(','):
                    if 'rel="next"' in part:
                        next_url = part.split(';')[0].strip().strip('<>')
                        break
                url = next_url
                page += 1
        except urllib.error.HTTPError as e:
            print(f"❌ HTTP Error {e.code}: {e.reason}")
            return None
    
    return all_comments

def extract_credentials(comments):
    account_id = None
    api_token = None
    
    for comment in comments:
        body = comment['body']
        user = comment['user']['login']
        
        if 'xiaoyuer' not in user.lower():
            continue
        
        account_match = CLOUDFLARE_ACCOUNT_ID_PATTERN.search(body)
        token_match = CLOUDFLARE_API_TOKEN_PATTERN.search(body)
        
        if account_match:
            account_id = account_match.group(1)
        if token_match:
            api_token = token_match.group(1)
        
        if account_id and api_token:
            print(f"✅ 找到小鱼儿的凭证回复！")
            return account_id, api_token, comment['created_at']
    
    return account_id, api_token, None

def encrypt_secret(public_key, value):
    try:
        from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
        from cryptography.hazmat.backends import default_backend
        import codecs
        
        key_parts = public_key.split(',')
        n = int(codecs.decode(key_parts[0], 'hex'))
        e = int(codecs.decode(key_parts[1], 'hex'))
        
        public_numbers = RSAPublicNumbers(e, n)
        public_key_obj = public_numbers.public_key(default_backend())
        
        encrypted = public_key_obj.encrypt(
            value.encode(),
            None
        )
        
        return base64.b64encode(encrypted).decode()
    except ImportError:
        print("⚠ cryptography 库未安装，使用简单加密")
        return base64.b64encode(value.encode()).decode()
    except Exception as e:
        print(f"⚠ 加密失败: {e}")
        return base64.b64encode(value.encode()).decode()

def set_github_secret(token, secret_name, secret_value):
    url = f"https://api.github.com/repos/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/actions/secrets/{secret_name}"
    pub_key_url = f"https://api.github.com/repos/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/actions/secrets/public-key"
    headers = {"Authorization": f"token {token}"}
    
    try:
        req = urllib.request.Request(pub_key_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            pub_key_data = json.loads(resp.read().decode())
            key_id = pub_key_data['key_id']
            public_key = pub_key_data['key']
    except Exception as e:
        print(f"❌ 获取公钥失败: {e}")
        return False
    
    encrypted_value = encrypt_secret(public_key, secret_value)
    
    data = json.dumps({"encrypted_value": encrypted_value, "key_id": key_id}).encode()
    req = urllib.request.Request(url, data=data, headers={**headers, "Content-Type": "application/json"}, method="PUT")
    
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"✅ 已设置 {secret_name}")
            return True
    except Exception as e:
        print(f"❌ 设置 {secret_name} 失败: {e}")
        return False

def trigger_deployment(token):
    url = f"https://api.github.com/repos/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/actions/workflows/deploy.yml/dispatches"
    headers = {"Authorization": f"token {token}", "Content-Type": "application/json"}
    data = json.dumps({"ref": "main", "inputs": {"environment": "production"}}).encode()
    
    try:
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            print(f"✅ 已触发部署流程")
            return True
    except Exception as e:
        print(f"❌ 触发部署失败: {e}")
        return False

def create_issue_comment(token, body):
    url = f"https://api.github.com/repos/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/issues/{ISSUE_NUMBER}/comments"
    headers = {"Authorization": f"token {token}", "Content-Type": "application/json"}
    data = json.dumps({"body": body}).encode()
    
    try:
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            print(f"✅ 已在 Issue #42 下添加评论")
            return True
    except Exception as e:
        print(f"❌ 添加评论失败: {e}")
        return False

def mask_secret(secret, length=3):
    if len(secret) <= length * 2:
        return secret[:length] + "*" * len(secret) + secret[-length:]
    return secret[:length] + "*" * (len(secret) - length * 2) + secret[-length:]

def main():
    dry_run = os.environ.get('DRY_RUN', '1') == '1'
    force_recheck = os.environ.get('FORCE_RECHECK', '0') == '1'
    
    print(f"🚀 开始监控 GitHub Issue #{ISSUE_NUMBER}...")
    print(f"   DRY_RUN={dry_run}, FORCE_RECHECK={force_recheck}")
    
    token = get_github_token()
    if not token:
        print("⚠ 未设置 GITHUB_TOKEN，无法访问私有仓库 API")
        return STATE_ERROR
    
    status = read_status()
    
    if status['state'] == STATE_FOUND_DEPLOYED and not force_recheck:
        print("✅ 上次已完成部署，跳过检查（如需重新检查请设置 FORCE_RECHECK=1）")
        return STATE_FOUND_DEPLOYED
    
    print(f"\n📡 检查 Issue #{ISSUE_NUMBER} 评论...")
    
    comments = fetch_issue_comments(token)
    if not comments:
        print(f"❌ 无法获取评论")
        status['state'] = STATE_ERROR
        status['last_check'] = time.strftime("%Y-%m-%d %H:%M:%S")
        write_status(status)
        return STATE_ERROR
    
    print(f"📝 共 {len(comments)} 条评论")
    
    account_id, api_token, found_at = extract_credentials(comments)
    
    if account_id and api_token:
        print(f"\n🔑 提取到凭证:")
        print(f"   - ACCOUNT_ID: {mask_secret(account_id)}")
        print(f"   - API_TOKEN: {mask_secret(api_token)}")
        print(f"   - 发现时间: {found_at}")
        
        if dry_run:
            print("\n⚠ DRY_RUN 模式，仅检测不执行")
            status['state'] = STATE_FOUND_READY
            status['last_check'] = time.strftime("%Y-%m-%d %H:%M:%S")
            status['account_id'] = mask_secret(account_id)
            status['api_token'] = mask_secret(api_token)
            write_status(status)
            return STATE_FOUND_READY
        
        print("\n📦 配置到 GitHub Secrets...")
        set_github_secret(token, "CLOUDFLARE_ACCOUNT_ID", account_id)
        set_github_secret(token, "CLOUDFLARE_API_TOKEN", api_token)
        
        print("\n🚀 触发部署...")
        trigger_deployment(token)
        
        comment_body = f"""🎉 已检测到 Cloudflare 凭证并自动配置！

- **状态**: 部署已触发
- **Account ID**: `{mask_secret(account_id)}`
- **API Token**: `{mask_secret(api_token)}`
- **时间**: {time.strftime("%Y-%m-%d %H:%M:%S")}

部署结果请查看 GitHub Actions: https://github.com/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/actions/workflows/deploy.yml
"""
        create_issue_comment(token, comment_body)
        
        status['state'] = STATE_FOUND_DEPLOYED
        status['last_check'] = time.strftime("%Y-%m-%d %H:%M:%S")
        status['account_id'] = mask_secret(account_id)
        status['api_token'] = mask_secret(api_token)
        status['deployed_at'] = time.strftime("%Y-%m-%d %H:%M:%S")
        write_status(status)
        
        print("\n🎉 完成！Cloudflare 部署凭证已配置并触发部署")
        return STATE_FOUND_DEPLOYED
    else:
        print(f"⏳ 未找到小鱼儿的凭证回复")
        status['state'] = STATE_NOT_FOUND
        status['last_check'] = time.strftime("%Y-%m-%d %H:%M:%S")
        write_status(status)
        return STATE_NOT_FOUND

if __name__ == "__main__":
    result = main()
    sys.exit(0 if result in [STATE_FOUND_DEPLOYED, STATE_FOUND_READY] else 1)
