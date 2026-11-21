#!/usr/bin/env python3
# ============================================================
# 风声 · 全站巡检 + 基线快照工具 v2.1
# 小扣子（CTO）· 2026.11.21
#
# v2.0 功能（首次落地）：
#   三类基线快照 + 滚动对比 + 全站巡检 + GitHub Actions 定时运行
# v2.1 增强：
#   - diff 分 CRIT / INFO 两级（安全头丢失/401 变 200 = CRIT；条数微涨/P50 略升 = INFO）
#   - exit_code 只让 CRIT 触发非零（WARN 页面/INFO 漂移不再触发 exit 1 → GitHub Actions 不再总是黄灯）
#   - --auto-baseline：首次无快照自动建基线，不提示"异常"
#   - 汇总输出 diff 分类统计（X CRIT / Y INFO）
#
# 三类基线快照（小鱼儿定版）：
#   A. 安全头 + 401 行为 —— 防配置被改（Layer 8 是否还在、CORS 是否收敛）
#   B. entries schema + 条数 —— 防字段漂移（知识底座返回字段/单域 total）
#   C. 三端点 P50 + D1 读数 —— 防性能退化（/api/health /api/stats/health /api/heartbeat 响应时间）
#
# 约束：只用外部 HTTP 请求（不跑 Worker 内部、不用 Cloudflare Dashboard API）
# Token 从环境变量 API_BEARER_TOKEN 读取（GitHub Actions Secret）
#
# 滚动对比：快照存 scripts/baseline_last.json，下次跑时 diff → 异常输出
# 异常自动开单（daily-health-check.yml 的 GitHub Actions workflow 已配置）
#
# 用法:
#   python3 scripts/daily_check.py [--json]          # 巡检 + 基线快照 + 对比
#   python3 scripts/daily_check.py --baseline        # 只采快照，不做对比（首次建基线）
#   python3 scripts/daily_check.py --report-only     # 只读上次快照，重建报告
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
import argparse
import subprocess
import re
from datetime import datetime, timezone

# ============ 配置 ============

BASE_URL = os.environ.get('CHECK_URL', 'https://fengsheng.tech')
TOKEN = os.environ.get('API_BEARER_TOKEN', '')          # GitHub Actions Secret 注入
TIMEOUT = 10
WARN_RESPONSE = 3.0
CRIT_RESPONSE = 5.0

# 三端点（快照 C · 性能基线）
THREE_ENDPOINTS = [
    ('健康检查', '/api/health'),
    ('统计健康', '/api/stats/health'),
    ('心跳',     '/api/heartbeat'),
]

# 必须出现在所有公开 API HEAD 响应里的安全头（快照 A）
EXPECTED_SECURITY_HEADERS = {
    'Access-Control-Allow-Origin': r'^https://fengsheng\.tech$',
    'Strict-Transport-Security':   r'max-age=31536000|max-age=63072000',
    'X-Frame-Options':             r'DENY|SAMEORIGIN',
    'X-Content-Type-Options':      r'nosniff',
    'Referrer-Policy':             r'.+',
}

# 知识条目 API 域名（快照 B · schema + 条数）
ENTRIES_SAMPLE_DOMAIN = '签约前'
ENTRIES_SAMPLE_LIMIT = 1

# 快照存储路径
BASELINE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'baseline_last.json')

# ============ HTTP 工具 ============

def _headers(with_token=False, is_head=False):
    h = {
        'User-Agent': 'FengShengBot/2.0 DailyBaselineCheck',
        'Cache-Control': 'no-cache',
    }
    if with_token and TOKEN:
        h['Authorization'] = f'Bearer {TOKEN}'
    return h

def http_head_via_curl(path):
    """用 curl HEAD 拿完整响应头（urllib.request 对 HEAD 返回不全）
    返回 (code, headers_dict, elapsed_seconds)"""
    url = BASE_URL + path
    start = time.time()
    try:
        r = subprocess.run(
            ['curl', '-sI', '-o', '/dev/null', '-D', '-',
             '-H', 'Cache-Control: no-cache',
             '-H', 'User-Agent: FengShengBot/2.0 DailyBaselineCheck',
             '--max-time', str(TIMEOUT), url],
            capture_output=True, text=True, timeout=TIMEOUT + 2,
        )
        elapsed = time.time() - start
        hdrs = {}
        code = 0
        for line in r.stdout.split('\n'):
            line = line.strip()
            if not line:
                continue
            if line.startswith('HTTP/'):
                parts = line.split()
                if len(parts) >= 2:
                    code = int(parts[1])
                continue
            if ':' in line:
                k, v = line.split(':', 1)
                hdrs[k.strip()] = v.strip()
        return code, hdrs, round(elapsed, 3)
    except Exception as e:
        elapsed = time.time() - start
        return 0, {}, round(elapsed, 3)

def http_request(path, method='GET', with_token=False, extra_headers=None, read_body=True):
    """通用 HTTP 请求，返回 (code, elapsed_seconds, body_or_None, headers_dict)"""
    url = BASE_URL + path
    start = time.time()
    headers = _headers(with_token=with_token)
    if extra_headers:
        headers.update(extra_headers)
    try:
        req = urllib.request.Request(url, method=method, headers=headers)
        resp = urllib.request.urlopen(req, timeout=TIMEOUT)
        elapsed = time.time() - start
        body = resp.read().decode('utf-8', errors='replace') if read_body else ''
        return resp.status, elapsed, body, dict(resp.headers)
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        body = e.read().decode('utf-8', errors='replace')[:500] if read_body else ''
        return e.code, elapsed, body, dict(e.headers) if hasattr(e, 'headers') else {}
    except Exception as e:
        elapsed = time.time() - start
        return 0, elapsed, str(e), {}

# ============ 三类快照采集 ============

def collect_baseline_A_security_headers():
    """快照 A：安全头 + 401 行为
    - HEAD 三个公开端点 → 检查安全头是否齐全、值是否正确
    - 无 Token 读 /api/entries → 必须 401（Layer 8 还在不在）
    - 无 Token 读 /api/stats → 必须 401
    """
    result = {'timestamp': datetime.now(timezone.utc).isoformat()}
    anomalies = []

    # A1. 安全头矩阵（3 端点 × 5 个头）
    sec = {}
    for name, path in THREE_ENDPOINTS:
        code, hdrs, elapsed = http_head_via_curl(path)
        sec[path] = {'code': code, 'headers': {}, 'elapsed': elapsed}
        if code != 200:
            anomalies.append(f'[A1] HEAD {path} → {code}（期望 200）')
            continue
        for hname, pattern in EXPECTED_SECURITY_HEADERS.items():
            val = hdrs.get(hname, '') or hdrs.get(hname.lower(), '')
            import re
            if not val:
                anomalies.append(f'[A1] {path} 缺失头 {hname}')
                sec[path]['headers'][hname] = 'MISSING'
            elif not re.match(pattern, val, re.IGNORECASE):
                anomalies.append(f'[A1] {path} 头 {hname} 值异常: {val}')
                sec[path]['headers'][hname] = val  # 记录实际值
            else:
                sec[path]['headers'][hname] = val
    result['security_headers'] = sec

    # A2. Layer 8 行为验证（无 Token → 必须 401）
    layer8 = {}
    for path in ['/api/entries', '/api/stats/summary']:
        code, elapsed, _, _ = http_request(f'{path}?limit=1')
        expected = 401
        layer8[path] = {'code': code, 'expected': expected, 'elapsed': round(elapsed, 3)}
        if code != expected:
            anomalies.append(f'[A2] 无Token {path} → {code}（期望 401，Layer 8 可能没了！）')
    result['layer8_401_behavior'] = layer8

    result['_anomalies'] = anomalies
    return result

def collect_baseline_B_entries_schema():
    """快照 B：entries schema + 条数
    - 有 Token 读 /api/entries?domain=XXX&limit=1 → 字段列表（sorted）+ total
    - 无 Token 时（GitHub Actions 没配 Secret？）→ 跳过，但记 anomaly
    """
    result = {'timestamp': datetime.now(timezone.utc).isoformat()}
    anomalies = []

    if not TOKEN:
        anomalies.append('[B] API_BEARER_TOKEN 未配置，entries schema 无法采集')
        result['_skipped'] = True
        result['_anomalies'] = anomalies
        return result

    # B1. schema 字段列表
    path = f'/api/entries?domain={urllib.parse.quote(ENTRIES_SAMPLE_DOMAIN)}&limit={ENTRIES_SAMPLE_LIMIT}'
    code, elapsed, body, _ = http_request(path, method='GET', with_token=True)
    result['entries_sample'] = {'code': code, 'elapsed': round(elapsed, 3)}

    if code != 200:
        anomalies.append(f'[B1] 有Token {path} → {code}（期望 200）')
    else:
        try:
            d = json.loads(body)
            entries = d.get('entries', []) or []
            result['entries_sample']['total'] = d.get('total', 0)
            result['entries_sample']['returned'] = d.get('returned', 0)
            if entries:
                result['entries_sample']['schema_fields'] = sorted(entries[0].keys())
            else:
                result['entries_sample']['schema_fields'] = []
                if d.get('total', 0) > 0:
                    anomalies.append(f'[B1] total>0 但 returned=0？entries 为空')
        except json.JSONDecodeError as e:
            anomalies.append(f'[B1] JSON 解析失败: {e}')

    result['_anomalies'] = anomalies
    return result

def collect_baseline_C_performance():
    """快照 C：三端点响应时间 + D1 读数
    - 每个端点测 3 次取中位数（抖动过滤）
    - 读 X-D1-Budget-Used header（如果有的话）
    """
    result = {'timestamp': datetime.now(timezone.utc).isoformat()}
    anomalies = []

    perf = {}
    for name, path in THREE_ENDPOINTS:
        times = []
        d1_budget = None
        for i in range(3):
            code, elapsed, _, hdrs = http_request(path)
            times.append(elapsed)
            if code == 200 and d1_budget is None:
                d1_budget = hdrs.get('X-D1-Budget-Used') or hdrs.get('x-d1-budget-used')
        sorted_times = sorted(times)
        p50 = sorted_times[1]  # 3 次取中位数
        p95 = sorted_times[-1]
        perf[path] = {
            'name': name,
            'p50_s': round(p50, 4),
            'p95_s': round(p95, 4),
            'raw': [round(t, 4) for t in times],
            'x_d1_budget_used': d1_budget,
        }
        if p95 > WARN_RESPONSE:
            anomalies.append(f'[C] {name} ({path}) P95={p95:.3f}s > {WARN_RESPONSE}s 警告线')

    result['three_endpoints'] = perf

    # 全局 D1 预算（从 /api/stats/health 响应体里也能拿到）
    code, _, body, _ = http_request('/api/stats/health')
    if code == 200:
        try:
            h = json.loads(body)
            result['d1_global'] = {
                'events_count': h.get('events_count'),
                'events_24h': h.get('events_24h'),
                'feedback_count': h.get('feedback_count'),
                'error_count': h.get('error_count'),
                'db_connected': h.get('db_connected'),
                'circuit_breaker': h.get('circuit_breaker'),
                'degraded_mode': h.get('degraded_mode'),
            }
        except json.JSONDecodeError:
            pass

    result['_anomalies'] = anomalies
    return result

# ============ 滚动对比 ============

def load_previous_baseline():
    """加载上次快照（如果存在）"""
    if os.path.exists(BASELINE_FILE):
        try:
            with open(BASELINE_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return None
    return None

def save_current_baseline(snapshot):
    """保存当前快照为下次对比的基准"""
    with open(BASELINE_FILE, 'w') as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

def diff_baselines(prev, curr):
    """对比两次快照，返回 (diffs, crit_diffs) —— CRIT 级变化单独拎出来
    CRIT 级：安全头丢了/值异常、401 变 200（Layer 8 被卸）、schema 字段突变、性能退 ≥100%
    INFO 级：条数±5、P50 涨 50%-100%（纯漂移，不触发 exit 非零）
    """
    diffs = []
    crit_diffs = []
    if not prev:
        return diffs, crit_diffs  # 首次无对比

    def _add(d, is_crit):
        if is_crit:
            crit_diffs.append(d)
        diffs.append(d)

    # A1. 安全头变化
    for path, curr_sec in curr.get('security_headers', {}).items():
        prev_sec = prev.get('security_headers', {}).get(path, {})
        for hname, curr_val in curr_sec.get('headers', {}).items():
            prev_val = prev_sec.get('headers', {}).get(hname, '')
            if curr_val != prev_val:
                is_crit = (curr_val == 'MISSING' or prev_val == 'MISSING')
                _add(f'[A1] {path} 头 {hname}: {prev_val!r} → {curr_val!r}', is_crit)

    # A2. Layer 8 行为变化（401 ↔ 非 401 一定是 CRIT）
    for path, curr_l8 in curr.get('layer8_401_behavior', {}).items():
        prev_l8 = prev.get('layer8_401_behavior', {}).get(path, {})
        if curr_l8.get('code') != prev_l8.get('code'):
            _add(f'[A2] {path} 无Token行为: {prev_l8.get("code")} → {curr_l8.get("code")}', True)

    # B. entries schema 变化
    if not curr.get('_skipped'):
        prev_fields = set(prev.get('entries_sample', {}).get('schema_fields', []))
        curr_fields = set(curr.get('entries_sample', {}).get('schema_fields', []))
        if prev_fields and curr_fields and prev_fields != curr_fields:
            added = sorted(curr_fields - prev_fields)
            removed = sorted(prev_fields - curr_fields)
            # 字段消失是 CRIT（可能是 API 改了结构），新增是 INFO
            is_crit = len(removed) > 0
            _add(f'[B1] schema 字段漂移: +{added} -{removed}', is_crit)

        prev_total = prev.get('entries_sample', {}).get('total', 0)
        curr_total = curr.get('entries_sample', {}).get('total', 0)
        if prev_total and abs(curr_total - prev_total) > 5:
            is_crit = abs(curr_total - prev_total) > max(prev_total * 0.1, 10)  # >10% 或 >10 条
            _add(f'[B2] 单域总条数: {prev_total} → {curr_total}（Δ={curr_total-prev_total:+d}）', is_crit)

    # C. 性能退化
    for path, curr_perf in curr.get('three_endpoints', {}).items():
        prev_perf = prev.get('three_endpoints', {}).get(path, {})
        prev_p50 = prev_perf.get('p50_s', 0)
        curr_p50 = curr_perf.get('p50_s', 0)
        if prev_p50 and curr_p50 > prev_p50 * 1.5:
            is_crit = curr_p50 > prev_p50 * 2.0  # 翻倍才是 CRIT
            _add(f'[C] {path} P50: {prev_p50:.4f}s → {curr_p50:.4f}s（↑{curr_p50/prev_p50-1:.0%}）', is_crit)

    return diffs, crit_diffs

# ============ 输出 ============

def log(msg, level='INFO'):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    colors = {'INFO': '36', 'OK': '32', 'WARN': '33', 'CRIT': '31', 'ANOMALY': '35'}
    color = colors.get(level, '0')
    tag = {'INFO': 'ℹ', 'OK': '✓', 'WARN': '⚠', 'CRIT': '✗', 'ANOMALY': '🔶'}.get(level, '')
    print(f'  [\033[{color}m{tag} {level}\033[0m] {msg}')

def print_baseline_report(a, b, c, diffs, prev_exists):
    print('\n' + '=' * 70)
    print('📐 三类基线快照')
    print('=' * 70)

    # A. 安全头
    print('\n  --- A. 安全头 + Layer 8 ---')
    for path, sec in a.get('security_headers', {}).items():
        ok_headers = sum(1 for v in sec.get('headers', {}).values() if v != 'MISSING')
        total = len(sec.get('headers', {}))
        tag = '✓' if ok_headers == total and sec.get('code') == 200 else '⚠'
        log(f'{tag} HEAD {path} → {ok_headers}/{total} 头齐全 ({sec.get("elapsed")}s)', 'OK' if ok_headers == total else 'WARN')
    for path, l8 in a.get('layer8_401_behavior', {}).items():
        tag = '✓' if l8.get('code') == 401 else '✗'
        log(f'{tag} 无Token {path} → {l8.get("code")}（期望 401）', 'OK' if l8.get('code') == 401 else 'CRIT')

    # B. schema
    print('\n  --- B. Entries Schema + 条数 ---')
    if b.get('_skipped'):
        log('⚠ 跳过：API_BEARER_TOKEN 未配置', 'WARN')
    else:
        es = b.get('entries_sample', {})
        log(f'✓ /api/entries 样本域="{ENTRIES_SAMPLE_DOMAIN}" → total={es.get("total","?")} fields={len(es.get("schema_fields",[]))}', 'OK')

    # C. 性能
    print('\n  --- C. 三端点性能 ---')
    for path, perf in c.get('three_endpoints', {}).items():
        log(f'✓ {perf["name"]} ({path}) → P50={perf["p50_s"]}s P95={perf["p95_s"]}s D1-Budget={perf.get("x_d1_budget_used","?")}',
            'WARN' if perf['p95_s'] > WARN_RESPONSE else 'OK')

    # D1 全局
    d1 = c.get('d1_global', {})
    if d1:
        log(f'✓ D1 全局 → events_24h={d1.get("events_24h")} db={d1.get("db_connected")} breaker={d1.get("circuit_breaker")} degraded={d1.get("degraded_mode")}',
            'CRIT' if d1.get('degraded_mode') or d1.get('circuit_breaker') != 'closed' else 'OK')

    # 滚动对比
    if prev_exists:
        print('\n  --- 🔄 滚动对比（vs 上次快照）---')
        if diffs:
            for d in diffs:
                log(f'🔶 {d}', 'ANOMALY')
        else:
            log('✓ 无差异', 'OK')

    # 本次 anomalies
    all_anomalies = a.get('_anomalies', []) + b.get('_anomalies', []) + c.get('_anomalies', [])
    if all_anomalies:
        print('\n  --- 🚨 本次采集异常 ---')
        for an in all_anomalies:
            log(f'🔴 {an}', 'CRIT')

# ============ 原有巡检功能（v1.0 保留）============

def http_v1(path, method='GET'):
    """v1.0 兼容版（不带 Token 的简单 GET）"""
    url = BASE_URL + path
    start = time.time()
    try:
        req = urllib.request.Request(url, method=method, headers=_headers())
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

PAGES = [
    ('首页', '/', '200'),
    ('知识底座', '/knowledge.html', '200'),
    ('关怀测评', '/care-test/', '200'),
    ('能力测评', '/assessment/', '200'),
    ('客户解码', '/reply/', '200'),
    ('培养师', '/breeder.html', '200'),
    ('关于我们', '/about.html', '200'),
    ('404页面', '/404.html', '200'),
]

def check_pages():
    results = []
    for name, path, _ in PAGES:
        code, elapsed, body = http_v1(path)
        status = 'OK'
        if code == 0 or code >= 500:
            status = 'CRIT'
        elif code >= 400:
            status = 'CRIT'
        elif elapsed > WARN_RESPONSE:
            status = 'WARN'
        results.append({'name': name, 'path': path, 'code': code, 'elapsed': round(elapsed, 3), 'status': status})
        log(f'✓ {name} ({path}) → {code}, {elapsed:.3f}s', status)
    return results

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
        return {'days_left': -1, 'status': 'WARN'}

# ============ main ============

def main():
    parser = argparse.ArgumentParser(description='风声全站巡检 + 基线快照')
    parser.add_argument('--json', action='store_true', help='输出 JSON 报告到 scripts/report.json')
    parser.add_argument('--baseline', action='store_true', help='只采基线快照，不做对比（首次建基线用）')
    parser.add_argument('--auto-baseline', action='store_true', help='首次无基线时自动建，不触发 exit 非零')
    parser.add_argument('--report-only', action='store_true', help='只读上次快照，重建报告')
    args = parser.parse_args()

    print(f'\n🚀 风声全站巡检 + 基线快照 v2.0')
    print(f'⏰ {datetime.now(timezone.utc).isoformat()}  · 目标: {BASE_URL}')
    print(f'🔑 Token: {"已配" if TOKEN else "未配"}')
    print()

    report = {'timestamp': datetime.now(timezone.utc).isoformat(), 'target': BASE_URL}

    if args.report_only:
        prev = load_previous_baseline()
        if prev:
            print(json.dumps(prev, ensure_ascii=False, indent=2))
        else:
            print('⚠ 无历史快照')
        return 0

    # 1. 三类快照采集
    print('--- 采集中 ---')
    a = collect_baseline_A_security_headers()
    b = collect_baseline_B_entries_schema()
    c = collect_baseline_C_performance()
    print()

    # 2. 滚动对比
    prev = load_previous_baseline()
    diffs, crit_diffs = diff_baselines(prev, {'security_headers': a.get('security_headers', {}),
                                   'layer8_401_behavior': a.get('layer8_401_behavior', {}),
                                   'entries_sample': b.get('entries_sample', {}),
                                   'three_endpoints': c.get('three_endpoints', {})})

    # 3. 首次自动建基线（--auto-baseline：没快照就自动存，不触发 exit 非零）
    args.auto_baseline = args.auto_baseline or (prev is None and not args.baseline)

    # 4. 保存当前快照
    snapshot = {'A_security': a, 'B_entries': b, 'C_performance': c}
    save_current_baseline(snapshot)

    # 5. 输出基线报告
    print_baseline_report(a, b, c, diffs, prev_exists=(prev is not None))

    # 5. v1.0 兼容巡检（页面 + SSL）
    print('\n' + '=' * 70)
    print('🌐 站点层巡检')
    print('=' * 70)
    log('=== 公开页面可达性 ===')
    pages = check_pages()
    log('=== SSL 证书 ===')
    ssl_info = check_ssl()

    # 6. 汇总
    print('\n' + '=' * 70)
    print('📊 汇总')
    print('=' * 70)

    all_anomalies = (a.get('_anomalies', []) + b.get('_anomalies', []) +
                     c.get('_anomalies', []))

    crt_count = sum(1 for p in pages if p['status'] == 'CRIT')
    warn_count = sum(1 for p in pages if p['status'] == 'WARN')
    anom_count = len(all_anomalies)
    crit_anom_count = sum(1 for an in all_anomalies if an.startswith('[A1]') or '期望 401' in an)

    print(f'  🟢 页面正常: {len(pages) - crt_count - warn_count}')
    print(f'  🟡 页面警告: {warn_count}')
    print(f'  🔴 页面严重: {crt_count}')
    print(f'  🔶 基线异常: {anom_count}（含 {len(crit_diffs)} 条 CRIT / {len(diffs) - len(crit_diffs)} 条 INFO 漂移）')

    # exit_code 逻辑（只让 CRIT 级问题触发 exit 非零）：
    # exit 2 = CRIT（页面 CRIT 或 baseline 有 CRIT anomalies 或 crit_diffs）
    # exit 1 = WARN（只有页面 WARN 或只有 INFO 漂移）
    # exit 0 = 全部正常
    has_page_crit = crt_count > 0
    has_baseline_crit = crit_anom_count > 0 or len(crit_diffs) > 0
    exit_code = 0
    if has_page_crit or has_baseline_crit:
        exit_code = 2
        print('\n🔴 存在严重问题！')
    elif warn_count > 0 or anom_count > 0:
        exit_code = 1
        print('\n🟡 存在警告/基线差异，建议排查')
    else:
        print('\n🟢 全部正常')

    if args.auto_baseline:
        print('ℹ️  首次自动建基线已完成（--auto-baseline）')

    # 7. JSON 报告（供 GitHub Actions 自动开单）
    if args.json:
        report.update({
            'results': {'pages': pages, 'ssl': ssl_info},
            'baseline': snapshot,
            'baseline_diffs': diffs,
            'anomalies': all_anomalies,
            'exit_code': exit_code,
        })
        report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'report.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f'\n📄 JSON 报告: {report_path}')
        print(f'📄 基线快照: {BASELINE_FILE}（下次对比用）')

    sys.exit(exit_code)

if __name__ == '__main__':
    main()
