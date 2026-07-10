#!/usr/bin/env python3
import json
import os
import re
import sys
from datetime import datetime, UTC

GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')
OWNER = 'fengsheng-shengge'
REPO = 'fengsheng-tasks'
ISSUE_NUMBER = 42
DEPLOY_PROGRESS_FILE = '.agent/memory/deploy_progress.json'

def get_issue_comments():
    import urllib.request
    import urllib.error
    
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/issues/{ISSUE_NUMBER}/comments'
    headers = {'Authorization': f'token {GITHUB_TOKEN}'} if GITHUB_TOKEN else {}
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f'Error fetching comments: HTTP {e.code}')
        return None
    except Exception as e:
        print(f'Error fetching comments: {e}')
        return None

def extract_credentials(comments):
    account_id_pattern = re.compile(r'CLOUDFLARE_ACCOUNT_ID\s*[=:]\s*([a-f0-9]{32})', re.IGNORECASE)
    api_token_pattern = re.compile(r'CLOUDFLARE_API_TOKEN\s*[=:]\s*([a-zA-Z0-9_-]{40,})', re.IGNORECASE)
    
    for comment in comments:
        body = comment['body']
        user = comment['user']['login']
        
        account_id_match = account_id_pattern.search(body)
        api_token_match = api_token_pattern.search(body)
        
        if account_id_match and api_token_match:
            print(f'✓ Found credentials from user: {user}')
            print(f'  Comment date: {comment["created_at"]}')
            return {
                'account_id': account_id_match.group(1),
                'api_token': api_token_match.group(1),
                'user': user,
                'date': comment['created_at']
            }
    
    return None

def get_deploy_progress():
    if os.path.exists(DEPLOY_PROGRESS_FILE):
        with open(DEPLOY_PROGRESS_FILE, 'r') as f:
            return json.load(f)
    return {'state': 'NOT_FOUND', 'last_checked': None, 'credentials': None}

def save_deploy_progress(state, credentials=None):
    progress = {
        'state': state,
        'last_checked': datetime.now(UTC).isoformat(),
        'credentials': credentials
    }
    os.makedirs(os.path.dirname(DEPLOY_PROGRESS_FILE), exist_ok=True)
    with open(DEPLOY_PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2)

def mask_token(token):
    if len(token) <= 6:
        return token
    return token[:3] + '*' * (len(token) - 6) + token[-3:]

def set_github_secret(secret_name, value):
    import urllib.request
    import urllib.error
    
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/actions/secrets/{secret_name}'
    
    try:
        from nacl import encoding, public
        public_key_url = f'https://api.github.com/repos/{OWNER}/{REPO}/actions/secrets/public-key'
        req = urllib.request.Request(public_key_url, headers={'Authorization': f'token {GITHUB_TOKEN}'})
        with urllib.request.urlopen(req) as resp:
            key_data = json.loads(resp.read().decode())
        
        public_key = public.PublicKey(key_data['key'].encode('utf-8'), encoding.Base64Encoder())
        sealed_box = public.SealedBox(public_key)
        encrypted_value = sealed_box.encrypt(value.encode('utf-8'))
        
        data = {
            'encrypted_value': encoding.Base64Encoder().encode(encrypted_value).decode('utf-8'),
            'key_id': key_data['key_id']
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={
                'Authorization': f'token {GITHUB_TOKEN}',
                'Content-Type': 'application/json'
            },
            method='PUT'
        )
        with urllib.request.urlopen(req) as resp:
            return resp.status == 201
    except ImportError:
        print('  ⚠ PyNaCl not available, skipping secret encryption')
        return False
    except Exception as e:
        print(f'  ⚠ Error setting secret: {e}')
        return False

def trigger_deploy():
    import urllib.request
    
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/actions/workflows/deploy.yml/dispatches'
    data = json.dumps({'ref': 'main'}).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Authorization': f'token {GITHUB_TOKEN}',
            'Content-Type': 'application/json'
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status == 204
    except Exception as e:
        print(f'  ⚠ Error triggering deploy: {e}')
        return False

def main():
    dry_run = os.environ.get('DRY_RUN', '0') == '1'
    force_recheck = os.environ.get('FORCE_RECHECK', '0') == '1'
    
    print(f'=== 🔍 Checking Issue #{ISSUE_NUMBER} for Cloudflare credentials ===')
    print(f'  Dry Run: {dry_run}')
    print(f'  Force Recheck: {force_recheck}')
    print(f'  Timestamp: {datetime.now(UTC).isoformat()}')
    print()
    
    progress = get_deploy_progress()
    
    if progress['state'] == 'FOUND_DEPLOYED' and not force_recheck:
        print('  ✅ Already deployed, skipping check')
        print(f'  Last checked: {progress["last_checked"]}')
        return 0
    
    comments = get_issue_comments()
    if comments is None:
        print('  ❌ Failed to fetch comments')
        save_deploy_progress('ERROR')
        return 1
    
    print(f'  Total comments: {len(comments)}')
    
    credentials = extract_credentials(comments)
    
    if credentials:
        print(f'\n  🎉 Found Cloudflare credentials:')
        print(f'    Account ID: {credentials["account_id"]}')
        print(f'    API Token: {mask_token(credentials["api_token"])}')
        print(f'    From: {credentials["user"]}')
        
        if dry_run:
            print('\n  ⚠ DRY RUN - Not setting secrets or triggering deploy')
            save_deploy_progress('FOUND_READY', {
                'account_id': credentials['account_id'],
                'api_token_masked': mask_token(credentials['api_token'])
            })
            return 0
        
        print('\n  Setting GitHub Secrets...')
        if set_github_secret('CLOUDFLARE_ACCOUNT_ID', credentials['account_id']):
            print('    ✓ CLOUDFLARE_ACCOUNT_ID set')
        else:
            print('    ✗ Failed to set CLOUDFLARE_ACCOUNT_ID')
        
        if set_github_secret('CLOUDFLARE_API_TOKEN', credentials['api_token']):
            print('    ✓ CLOUDFLARE_API_TOKEN set')
        else:
            print('    ✗ Failed to set CLOUDFLARE_API_TOKEN')
        
        print('\n  Triggering deploy workflow...')
        if trigger_deploy():
            print('    ✓ Deploy triggered successfully')
            save_deploy_progress('FOUND_DEPLOYED', {
                'account_id': credentials['account_id'],
                'api_token_masked': mask_token(credentials['api_token'])
            })
        else:
            print('    ✗ Failed to trigger deploy')
            save_deploy_progress('FOUND_READY', {
                'account_id': credentials['account_id'],
                'api_token_masked': mask_token(credentials['api_token'])
            })
        
        return 0
    else:
        print('  ❌ No Cloudflare credentials found in comments')
        save_deploy_progress('NOT_FOUND')
        return 0

if __name__ == '__main__':
    sys.exit(main())