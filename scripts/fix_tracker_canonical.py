#!/usr/bin/env python3
"""批量添加 tracker.js 和 canonical 标签"""
import os, re

# 需要添加 tracker.js 的文件
TRACKER_FILES = ['agent-academy.html', 'skills.html', 'standard.html', 'okr.html', 'partner.html', 'sample.html']

# 所有需要 canonical 的根级HTML文件（不含子目录index和v2-demo）
CANONICAL_FILES = [
    'index.html', 'about.html', 'course.html', 'works.html', 'shuowenjiedao.html',
    'agent-academy.html', 'skills.html', 'standard.html', 'okr.html', 'partner.html',
    'sample.html', 'breeder.html', 'assessment.html', 'knowledge.html', '404.html',
]

BASE_URL = 'https://fengsheng.tech'

def add_tracker(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'tracker.js' in content:
        return False
    # 在 </body> 前插入
    content = content.replace('</body>', '<script src="/tracker.js" async></script>\n</body>', 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    return True

def add_canonical(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'rel="canonical"' in content:
        return False
    
    # 确定URL
    url_path = '/' + filepath if filepath != 'index.html' else '/'
    
    canonical_tag = f'<link rel="canonical" href="{BASE_URL}{url_path}">'
    
    # 在 </head> 前插入
    content = content.replace('</head>', f'{canonical_tag}\n</head>', 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    return True

# 添加 tracker.js
print("=== 添加 tracker.js ===")
for f in TRACKER_FILES:
    if os.path.exists(f):
        if add_tracker(f):
            print(f"  ✓ {f} 已添加 tracker.js")
        else:
            print(f"  ⊘ {f} 已有 tracker.js")
    else:
        print(f"  ✗ {f} 不存在")

# 添加 canonical
print("\n=== 添加 canonical ===")
for f in CANONICAL_FILES:
    if os.path.exists(f):
        if add_canonical(f):
            print(f"  ✓ {f} 已添加 canonical")
        else:
            print(f"  ⊘ {f} 已有 canonical")
    else:
        print(f"  ✗ {f} 不存在")
