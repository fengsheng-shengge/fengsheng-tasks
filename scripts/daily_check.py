#!/usr/bin/env python3
# ============================================================
# 风声 · 全站巡检脚本 v1.0
# 小扣子（CTO）· 2026.06.22
# 用法: python3 scripts/daily_check.py [--json]
# ============================================================

import urllib.request
import urllib.error
import urllib.parse
import socket
import ssl
import json
import sys
import os
import time
import re
import argparse
from datetime import datetime
from xml.etree import ElementTree

BASE_URL = os.environ.get('CHECK_URL', 'https://fengsheng.tech')
TIMEOUT = 10
WARN_RESPONSE = 3.0
CRIT_RESPONSE = 5.0

PAGES = [
    ('首页', '/', '200正常'),
    ('知识底座', '/knowledge.html', '200正常'),
    ('品质测评', '/quality-test/', '200正常'),
    ('关怀测评', '/care-test/', '200正常'),
    ('能力测评', '/assessment.html', '200正常'),
    ('客户解码', '/reply/', '200正常'),
    ('带看报告', '/s1-report/', '200正常'),
    ('管理看板', '/dashboard/', '200正常'),
    ('培养师', '/breeder.html', '200正常'),
    ('技能规范', '/skills.html', '200正常'),
    ('业务字典', '/standard.html', '200正常'),
    ('合作伙伴', '/partner.html', '200正常'),
    ('关于我们', '/about.html', '200正常'),
    ('培养课程', '/course.html', '200正常'),
    ('服务工具', '/works.html', '200正常'),
    ('说文解道', '/shuowenjiedao.html', '200正常'),
    ('示例页', '/sample.html', '200正常'),
    ('404页面', '/404.html', '200正常'),
]

APIS = [
    ('健康检查', '/api/ping', 'GET'),
    ('数据库健康', '/api/stats/health', 'GET'),
    ('数据总览', '/api/stats/summary', 'GET'),
]

def log(msg, level='INFO'):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    colors = {'INFO': '36', 'OK': '32', 'WARN': '33', 'CRIT': '31'}
    color = colors.get(level, '0')
    print(f'[\033[{color}m{level}\033[0m] {ts} {msg}')

def http_request(path, method='GET'):
    url = BASE_URL + path
    start = time.time()
    try:
        req = urllib.request.Request(url, method=method)
        req.add_header('User-Agent', 'FengShengBot/1.0 DailyHealthCheck')
        resp = urllib.request.urlopen(req, timeout=TIMEOUT)
        elapsed = time.time() - start
        body = resp.read().decode('utf-8', errors='replace')
        return resp.status, elapsed, body
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        return e.code, elapsed, ''
    except Exception as e:
        elapsed = time.time() - start
        return 0, elapsed, str(e)

def check_pages():
    results = []
    for name, path, _ in PAGES:
        code, elapsed, body = http_request(path)
        status = 'OK'
        if code == 0 or code >= 500:
            status = 'CRIT'
        elif code >= 400:
            status = 'CRIT'
        elif elapsed > WARN_RESPONSE:
            status = 'WARN'
        results.append({'name': name, 'path': path, 'code': code, 'elapsed': round(elapsed, 3), 'status': status})
        tag = '✓' if status == 'OK' else ('⚠' if status == 'WARN' else '✗')
        log(f'{tag} {name} ({path}) → {code}, {elapsed:.3f}s', status)
    return results

def check_apis():
    results = []
    for name, path, method in APIS:
        code, elapsed, body = http_request(path, method)
        status = 'OK'
        if code != 200:
            status = 'CRIT'
        elif elapsed > WARN_RESPONSE:
            status = 'WARN'
        results.append({'name': name, 'path': path, 'code': code, 'elapsed': round(elapsed, 3), 'status': status, 'body': body[:200]})
        tag = '✓' if status == 'OK' else ('⚠' if status == 'WARN' else '✗')
        log(f'{tag} API {name} ({path}) → {code}, {elapsed:.3f}s', status)
    return results

def check_sitemap():
    code, elapsed, body = http_request('/sitemap.xml')
    try:
        root = ElementTree.fromstring(body)
        ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = root.findall('.//sm:loc', ns)
        status = 'OK' if len(urls) >= 18 else 'WARN'
        log(f'✓ sitemap.xml → {len(urls)} 个URL, {elapsed:.3f}s', status)
        return {'count': len(urls), 'code': code, 'elapsed': round(elapsed, 3), 'status': status}
    except Exception as e:
        log(f'✗ sitemap.xml 解析失败: {e}', 'CRIT')
        return {'count': 0, 'code': code, 'elapsed': round(elapsed, 3), 'status': 'CRIT'}

def check_ssl():
    try:
        ctx = ssl.create_default_context()
        conn = ssl.create_connection(('fengsheng.tech', 443), timeout=5)
        with ctx.wrap_socket(conn, server_hostname='fengsheng.tech') as s:
            cert = s.getpeercert()
            not_after = cert.get('notAfter')
            dt = datetime.strptime(not_after, '%b %d %H:%M:%S %Y %Z')
            days_left = (dt - datetime.now()).days
            status = 'OK' if days_left > 30 else ('WARN' if days_left > 7 else 'CRIT')
            log(f'✓ SSL证书 → 剩余 {days_left} 天', status)
        return {'days_left': days_left, 'status': status}
    except Exception as e:
        log(f'⚠ SSL检查(非阻塞): {e}', 'WARN')
        return {'days_left': -1, 'status': 'WARN', 'error': str(e)}

def check_redirects():
    tests = [
        ('/care-test', 308),
        ('/quality-test', 308),
        ('/reply', 308),
        ('/s1-report', 308),
        ('/dashboard', 308),
        ('/service', 301),
    ]
    results = []
    for path, expected in tests:
        code, elapsed, _ = http_request(path)
        status = 'OK' if code == expected or (code >= 300 and code < 400) else 'CRIT'
        results.append({'path': path, 'code': code, 'expected': expected, 'status': status})
        tag = '✓' if status == 'OK' else '✗'
        log(f'{tag} redirect {path} → {code} (期望{expected})', status)
    return results

def print_summary(results):
    print('\n' + '='*70)
    print('📊 全站巡检总结报告')
    print('='*70)
    total = sum(len(v) for v in results.values())
    counts = {}
    for section, items in results.items():
        if isinstance(items, list):
            for it in items:
                st = it.get('status', 'UNKNOWN')
                counts[st] = counts.get(st, 0) + 1
        elif isinstance(items, dict) and 'status' in items:
            counts[items['status']] = counts.get(items['status'], 0) + 1

    print(f'  总检查项: {total}')
    print(f'  🟢 正常:   {counts.get("OK", 0)}')
    print(f'  🟡 警告:   {counts.get("WARN", 0)}')
    print(f'  🔴 严重:   {counts.get("CRIT", 0)}')

    has_crit = counts.get('CRIT', 0) > 0
    has_warn = counts.get('WARN', 0) > 0

    if has_crit:
        print('\n🔴 存在严重问题！请立即处理')
        return 2
    elif has_warn:
        print('\n🟡 存在警告，建议排查')
        return 1
    else:
        print('\n🟢 全部正常')
        return 0

def main():
    parser = argparse.ArgumentParser(description='风声全站巡检')
    parser.add_argument('--json', action='store_true', help='输出JSON格式报告')
    args = parser.parse_args()

    print(f'\n🚀 风声全站巡检开始 · 目标: {BASE_URL}')
    print(f'⏰ 时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}\n')

    results = {}

    log('=== 页面层检查 ===')
    results['pages'] = check_pages()

    print()
    log('=== API层检查 ===')
    results['apis'] = check_apis()

    print()
    log('=== 数据层检查 ===')
    results['sitemap'] = check_sitemap()
    results['ssl'] = check_ssl()

    print()
    log('=== 重定向规则检查 ===')
    results['redirects'] = check_redirects()

    exit_code = print_summary(results)

    if args.json:
        report = {
            'timestamp': datetime.now().isoformat(),
            'target': BASE_URL,
            'results': results,
        }
        report_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts', 'report.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f'\n📄 JSON报告已保存: {report_path}')

    sys.exit(exit_code)

if __name__ == '__main__':
    main()
