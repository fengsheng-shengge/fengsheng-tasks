#!/usr/bin/env python3
"""
检查 GitHub Issue #42 中小鱼儿是否回复了 Cloudflare 凭证
如果找到凭证，配置到 GitHub Secrets 并触发部署

使用方式:
    python scripts/check_cloudflare_credentials.py

环境变量:
    GITHUB_TOKEN: GitHub Personal Access Token (需要 repo 和 workflow 权限)
    GITHUB_REPOSITORY: 仓库名称 (格式: owner/repo)
"""

import os
import re
import sys
import json
import subprocess
from datetime import datetime

# 配置
ISSUE_NUMBER = 42
REPO = os.environ.get('GITHUB_REPOSITORY', 'fengsheng-shengge/fengsheng-tasks')
TOKEN = os.environ.get('GITHUB_TOKEN')

def log(message):
    """打印带时间戳的日志"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] {message}")

def run_gh_command(args):
    """运行 gh 命令并返回输出"""
    cmd = ['gh'] + args
    env = os.environ.copy()
    if TOKEN:
        env['GH_TOKEN'] = TOKEN
    
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if result.returncode != 0:
        log(f"命令失败: {' '.join(cmd)}")
        log(f"错误: {result.stderr}")
        return None
    return result.stdout.strip()

def get_issue_comments():
    """获取 Issue 的所有评论"""
    log(f"获取 Issue #{ISSUE_NUMBER} 的评论...")
    
    # 使用 gh api 获取评论
    result = run_gh_command([
        'api',
        f'repos/{REPO}/issues/{ISSUE_NUMBER}/comments',
        '--paginate'
    ])
    
    if not result:
        return []
    
    try:
        comments = json.loads(result)
        log(f"获取到 {len(comments)} 条评论")
        return comments
    except json.JSONDecodeError as e:
        log(f"解析评论失败: {e}")
        return []

def extract_credentials(text):
    """从文本中提取 Cloudflare 凭证"""
    credentials = {}
    
    # 匹配 Account ID (通常是 32 位十六进制字符)
    account_id_patterns = [
        r'Account\s*ID[:\s]*[`\'"]?([a-f0-9]{32})[`\'"]?',
        r'CLOUDFLARE_ACCOUNT_ID[:\s]*[`\'"]?([a-f0-9]{32})[`\'"]?',
        r'账号ID[:\s]*[`\'"]?([a-f0-9]{32})[`\'"]?',
        r'账户ID[:\s]*[`\'"]?([a-f0-9]{32})[`\'"]?',
    ]
    
    # 匹配 API Token (通常以 'eyJ' 开头或是一长串字符)
    api_token_patterns = [
        r'API\s*Token[:\s]*[`\'"]?([A-Za-z0-9_-]{40,})[`\'"]?',
        r'CLOUDFLARE_API_TOKEN[:\s]*[`\'"]?([A-Za-z0-9_-]{40,})[`\'"]?',
        r'Token[:\s]*[`\'"]?([A-Za-z0-9_-]{40,})[`\'"]?',
        r'令牌[:\s]*[`\'"]?([A-Za-z0-9_-]{40,})[`\'"]?',
    ]
    
    # 尝试提取 Account ID
    for pattern in account_id_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            credentials['account_id'] = match.group(1)
            log(f"找到 Account ID: {match.group(1)[:8]}...")
            break
    
    # 尝试提取 API Token
    for pattern in api_token_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            credentials['api_token'] = match.group(1)
            log(f"找到 API Token: {match.group(1)[:10]}...")
            break
    
    return credentials

def set_github_secret(name, value):
    """设置 GitHub Secret"""
    log(f"设置 GitHub Secret: {name}...")
    
    # 使用 gh secret set 命令
    process = subprocess.Popen(
        ['gh', 'secret', 'set', name, '--repo', REPO],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    stdout, stderr = process.communicate(input=value)
    
    if process.returncode == 0:
        log(f"Secret {name} 设置成功")
        return True
    else:
        log(f"Secret {name} 设置失败: {stderr}")
        return False

def trigger_deployment():
    """触发部署 workflow"""
    log("触发部署...")
    
    result = run_gh_command([
        'workflow', 'run', 'deploy.yml',
        '--repo', REPO,
        '--ref', 'main'
    ])
    
    if result is not None:
        log("部署已触发")
        return True
    return False

def add_comment(body):
    """在 Issue 中添加评论"""
    log("添加评论到 Issue...")
    
    result = run_gh_command([
        'issue', 'comment', str(ISSUE_NUMBER),
        '--repo', REPO,
        '--body', body
    ])
    
    return result is not None

def main():
    log("=" * 60)
    log("开始检查 Cloudflare 凭证")
    log("=" * 60)
    
    if not TOKEN:
        log("错误: 未设置 GITHUB_TOKEN 环境变量")
        sys.exit(1)
    
    # 获取评论
    comments = get_issue_comments()
    
    if not comments:
        log("未找到评论，继续等待...")
        sys.exit(0)
    
    # 查找包含凭证的评论
    found_credentials = {}
    credential_comment_author = None
    credential_comment_time = None
    
    # 关键词过滤 - 寻找小鱼儿的回复
    keywords = ['小鱼儿', 'xiaoyuer', 'account', 'token', '凭证', 'id', 'api']
    
    for comment in comments:
        author = comment.get('user', {}).get('login', '')
        body = comment.get('body', '')
        created_at = comment.get('created_at', '')
        
        # 检查是否包含凭证关键词
        body_lower = body.lower()
        if any(kw in body_lower for kw in keywords):
            log(f"检查评论 (作者: {author}, 时间: {created_at})")
            
            # 尝试提取凭证
            creds = extract_credentials(body)
            if creds:
                found_credentials.update(creds)
                credential_comment_author = author
                credential_comment_time = created_at
    
    if not found_credentials:
        log("未找到完整的凭证信息，继续等待...")
        sys.exit(0)
    
    # 检查是否找到了完整的凭证
    if 'account_id' not in found_credentials or 'api_token' not in found_credentials:
        log("找到部分凭证，但不完整:")
        log(f"  - Account ID: {'已找到' if 'account_id' in found_credentials else '未找到'}")
        log(f"  - API Token: {'已找到' if 'api_token' in found_credentials else '未找到'}")
        sys.exit(0)
    
    log(f"找到完整凭证! (由 {credential_comment_author} 于 {credential_comment_time} 提供)")
    
    # 设置 GitHub Secrets
    success = True
    success &= set_github_secret('CLOUDFLARE_ACCOUNT_ID', found_credentials['account_id'])
    success &= set_github_secret('CLOUDFLARE_API_TOKEN', found_credentials['api_token'])
    
    if not success:
        log("设置 Secrets 失败")
        sys.exit(1)
    
    log("Secrets 配置成功!")
    
    # 触发部署
    if trigger_deployment():
        # 添加成功评论
        comment_body = f"""## Cloudflare 凭证已配置

感谢 @{credential_comment_author} 提供凭证！

**配置状态:**
- `CLOUDFLARE_ACCOUNT_ID` 已设置
- `CLOUDFLARE_API_TOKEN` 已设置
- 部署已触发

**下一步:**
- 请查看 [Actions](https://github.com/{REPO}/actions) 页面确认部署状态
- 部署完成后访问 https://fengsheng.tech 验证

---
*此评论由自动化脚本生成于 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
        add_comment(comment_body)
        
        # 关闭 Issue
        run_gh_command([
            'issue', 'close', str(ISSUE_NUMBER),
            '--repo', REPO,
            '--comment', '凭证已配置，部署已触发，关闭此 Issue。'
        ])
        
        log("=" * 60)
        log("任务完成!")
        log("=" * 60)
    else:
        log("触发部署失败")
        sys.exit(1)

if __name__ == '__main__':
    main()