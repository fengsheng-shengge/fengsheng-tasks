#!/usr/bin/env python3
"""
定时检查 GitHub Issue #42，查找小鱼儿回复的 Cloudflare 凭证
每小时运行一次，发现凭证后配置到 GitHub Secrets 并触发部署

使用方式:
  python scripts/check_cloudflare_credentials.py --extract comments.json
"""

import os
import re
import json
import time
import subprocess
import argparse
import sys
from datetime import datetime

# 配置
GITHUB_OWNER = "fengsheng-shengge"
GITHUB_REPO = "fengsheng-tasks"
ISSUE_NUMBER = 42
CHECK_INTERVAL = 3600  # 每小时检查一次（秒）

# 小鱼儿的可能用户名模式
XIAOYUER_PATTERNS = [
    "小鱼儿",
    "xiaoyuer",
    "xiao_yu_er",
    "xiaoyu",
]

# Cloudflare 凭证提取正则
ACCOUNT_ID_PATTERN = r'(?:account[_\s-]?id|账户[_\s-]?id|AccountId)[\s:：]*[`\'"]?([a-f0-9]{32})[`\'"]?'
API_TOKEN_PATTERN = r'(?:api[_\s-]?token|api[_\s-]?令牌|ApiToken)[\s:：]*[`\'"]?([A-Za-z0-9_-]{40,})[`\'"]?'

# 也支持直接粘贴的格式（更宽松）
ACCOUNT_ID_DIRECT = r'Account\s*ID[:\s]+([a-f0-9]{32})'
API_TOKEN_DIRECT = r'API\s*Token[:\s]+([A-Za-z0-9_-]{40,})'

# 支持代码块格式
ACCOUNT_ID_CODE_BLOCK = r'```\s*\n([a-f0-9]{32})\s*\n```'
API_TOKEN_CODE_BLOCK = r'```\s*\n([A-Za-z0-9_-]{40,})\s*\n```'


def log(message: str):
    """带时间戳的日志"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")


def run_mcp_github_tool(tool_name: str, args: dict) -> dict:
    """通过 MCP 调用 GitHub API"""
    # 这个脚本需要在外部被调用，这里只是模拟
    # 实际实现会在主 agent 中执行
    pass


def extract_credentials(text: str) -> tuple:
    """从文本中提取 Cloudflare 凭证"""
    account_id = None
    api_token = None
    
    log(f"正在解析文本内容（长度: {len(text)} 字符）...")
    
    # 尝试各种格式匹配
    
    # 1. 带标签格式 "Account ID: xxx" 或 "账户ID: xxx"
    patterns = [
        (ACCOUNT_ID_PATTERN, 'account_id_pattern'),
        (r'Account\s*ID[\s:：]+([a-f0-9]{32})', 'account_id_direct'),
        (r'账户\s*ID[\s:：]+([a-f0-9]{32})', 'account_id_chinese'),
        (r'AccountId[:\s]+([a-f0-9]{32})', 'account_id_camel'),
    ]
    
    for pattern, name in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            account_id = match.group(1)
            log(f"  ✓ Account ID 匹配 ({name}): {account_id[:8]}...")
            break
    
    # 2. API Token 格式
    token_patterns = [
        (API_TOKEN_PATTERN, 'api_token_pattern'),
        (r'API\s*Token[\s:：]+([A-Za-z0-9_-]{40,})', 'api_token_direct'),
        (r'API\s*令牌[\s:：]+([A-Za-z0-9_-]{40,})', 'api_token_chinese'),
        (r'ApiToken[:\s]+([A-Za-z0-9_-]{40,})', 'api_token_camel'),
    ]
    
    for pattern, name in token_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            api_token = match.group(1)
            log(f"  ✓ API Token 匹配 ({name}): {api_token[:8]}...")
            break
    
    # 3. 代码块格式（如果上面都没匹配到）
    if not account_id:
        # 在文本中查找32位十六进制字符串（Account ID特征）
        hex32_matches = re.findall(r'\b([a-f0-9]{32})\b', text)
        for potential_id in hex32_matches:
            # 简单验证：Cloudflare Account ID 是32位hex
            account_id = potential_id
            log(f"  ✓ Account ID 提取（直接hex32）: {account_id[:8]}...")
            break
    
    if not api_token:
        # 查找40+字符的字母数字字符串（API Token特征）
        token_matches = re.findall(r'\b([A-Za-z0-9_-]{40,})\b', text)
        for potential_token in token_matches:
            # 排除明显不是token的（如URL、文件名等）
            if not potential_token.startswith('http') and '/' not in potential_token:
                api_token = potential_token
                log(f"  ✓ API Token 提取（直接字符串）: {api_token[:8]}...")
                break
    
    return account_id, api_token


def is_xiaoyuer_comment(comment: dict) -> bool:
    """判断评论是否来自小鱼儿"""
    user_login = comment.get('user', {}).get('login', '').lower()
    user_name = comment.get('user', {}).get('name', '') or ''
    body = comment.get('body', '')
    
    # 检查用户名是否匹配小鱼儿模式
    for pattern in XIAOYUER_PATTERNS:
        if pattern.lower() in user_login.lower():
            return True
        if pattern in user_name:
            return True
    
    # 检查评论内容是否包含小鱼儿签名
    if '——小鱼儿' in body or 'By 小鱼儿' in body or 'by 小鱼儿' in body:
        return True
    
    return False


def check_issue_comments(comments: list) -> tuple:
    """检查评论中是否有小鱼儿的凭证回复"""
    for comment in comments:
        if is_xiaoyuer_comment(comment):
            body = comment.get('body', '')
            account_id, api_token = extract_credentials(body)
            if account_id and api_token:
                return account_id, api_token, comment.get('html_url', '')
    return None, None, None


def configure_github_secrets(account_id: str, api_token: str) -> bool:
    """配置 GitHub Secrets（需要 gh CLI 或 API）"""
    log("配置 GitHub Secrets...")
    
    # 使用 gh CLI 设置 secrets
    try:
        # 设置 CLOUDFLARE_ACCOUNT_ID
        result1 = subprocess.run(
            ['gh', 'secret', 'set', 'CLOUDFLARE_ACCOUNT_ID', '--repo', f'{GITHUB_OWNER}/{GITHUB_REPO}'],
            input=account_id.encode(),
            capture_output=True
        )
        
        # 设置 CLOUDFLARE_API_TOKEN
        result2 = subprocess.run(
            ['gh', 'secret', 'set', 'CLOUDFLARE_API_TOKEN', '--repo', f'{GITHUB_OWNER}/{GITHUB_REPO}'],
            input=api_token.encode(),
            capture_output=True
        )
        
        if result1.returncode == 0 and result2.returncode == 0:
            log("✓ GitHub Secrets 配置成功")
            return True
        else:
            log(f"✗ Secrets 配置失败: {result1.stderr.decode()} {result2.stderr.decode()}")
            return False
    except FileNotFoundError:
        log("✗ gh CLI 未安装，无法设置 Secrets")
        return False


def trigger_deployment() -> bool:
    """触发部署工作流"""
    log("触发 Cloudflare Pages 部署...")
    
    try:
        result = subprocess.run(
            ['gh', 'workflow', 'run', 'deploy.yml', '--repo', f'{GITHUB_OWNER}/{GITHUB_REPO}'],
            capture_output=True
        )
        
        if result.returncode == 0:
            log("✓ 部署工作流已触发")
            return True
        else:
            log(f"✗ 部署触发失败: {result.stderr.decode()}")
            return False
    except Exception as e:
        log(f"✗ 部署触发异常: {e}")
        return False


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='检查 GitHub Issue #42 的 Cloudflare 凭证')
    parser.add_argument('--extract', type=str, help='从指定的 JSON 文件中提取凭证（GitHub Actions 使用）')
    parser.add_argument('--test', type=str, help='测试提取功能，传入示例文本')
    parser.add_argument('--run-daemon', action='store_true', help='启动定时检查守护进程')
    
    args = parser.parse_args()
    
    if args.extract:
        # 从 JSON 文件提取凭证（GitHub Actions 模式）
        log(f"从 {args.extract} 提取凭证...")
        try:
            with open(args.extract, 'r') as f:
                comments = json.load(f)
            
            # 遍历评论查找小鱼儿的回复
            for comment in comments:
                body = comment.get('body', '')
                user = comment.get('user', {}).get('login', '')
                
                log(f"检查评论 #{comment.get('id', 'unknown')} by {user}")
                
                # 检查是否是小鱼儿
                is_xiaoyuer = is_xiaoyuer_comment(comment)
                
                if is_xiaoyuer or 'cloudflare' in body.lower() or '凭证' in body:
                    log(f"  → 检查评论内容...")
                    account_id, api_token = extract_credentials(body)
                    
                    if account_id and api_token:
                        log("ACCOUNT_ID_FOUND")
                        log(f"ACCOUNT_ID: {account_id}")
                        log(f"API_TOKEN: {api_token}")
                        return
                        
            log("未找到凭证")
            
        except FileNotFoundError:
            log(f"错误: 文件 {args.extract} 不存在")
            sys.exit(1)
        except json.JSONDecodeError:
            log(f"错误: {args.extract} 不是有效的 JSON 文件")
            sys.exit(1)
            
    elif args.test:
        # 测试模式
        log("测试提取功能...")
        account_id, api_token = extract_credentials(args.test)
        if account_id:
            log(f"Account ID: {account_id}")
        if api_token:
            log(f"API Token: {api_token}")
        if not account_id and not api_token:
            log("未提取到凭证")
            
    elif args.run_daemon:
        # 守护进程模式
        log("=" * 60)
        log("Cloudflare 凭证检查器启动")
        log(f"监控 Issue: #{ISSUE_NUMBER}")
        log(f"检查间隔: {CHECK_INTERVAL} 秒")
        log("=" * 60)
        
        while True:
            try:
                log("检查 Issue 评论...")
                # 实际检查逻辑会在外部调用
                # 这里只是框架
                
                log("等待下次检查...")
                time.sleep(CHECK_INTERVAL)
                
            except KeyboardInterrupt:
                log("收到退出信号，停止检查")
                break
            except Exception as e:
                log(f"检查异常: {e}")
                time.sleep(60)  # 异常后等待1分钟重试
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
