#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GitHub Actions 调度 + 轮询 + 取日志（替代本机缺失的 gh CLI）。

用法：
  python3 scripts/gh_dispatch.py dispatch <workflow.yml> [key=value ...]
  python3 scripts/gh_dispatch.py wait <run_id> [--timeout 900]
  python3 scripts/gh_dispatch.py log <run_id>
  python3 scripts/gh_dispatch.py runs [workflow.yml]

凭据：环境变量 GH_TOKEN（未设时自动从 macOS keychain 的 github.com 凭据取）
"""
import base64, json, os, re, subprocess, sys, time, urllib.error, urllib.request

GH = 'https://api.github.com'
REPO = os.environ.get('GH_REPO', 'fengsheng-shengge/fengsheng-tasks')


def token():
    t = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
    if t:
        return t.strip()
    p = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n',
                       capture_output=True, text=True)
    m = re.search(r'^password=(.+)$', p.stdout, re.M)
    return m.group(1).strip() if m else ''


def api(path, method='GET', body=None, raw=False):
    h = {'Authorization': 'Bearer ' + token(),
         'Accept': 'application/vnd.github+json'}
    data = json.dumps(body).encode() if body is not None else None
    if data:
        h['Content-Type'] = 'application/json'
    req = urllib.request.Request(GH + path, data=data, method=method, headers=h)
    try:
        r = urllib.request.urlopen(req, timeout=60)
        payload = r.read()
        if raw:
            return r.status, payload
        return r.status, json.loads(payload.decode('utf-8', 'replace'))
    except urllib.error.HTTPError as e:
        raw_b = e.read().decode('utf-8', 'replace')
        try:
            return e.code, json.loads(raw_b)
        except Exception:
            return e.code, {'raw': raw_b[:500]}
    except Exception as e:
        return 0, {'raw': str(e)[:300]}


def cmd_dispatch(argv):
    if len(argv) < 2:
        print('用法: dispatch <workflow.yml> [k=v ...]')
        return 1
    wf = argv[1]
    inputs = {}
    for kv in argv[2:]:
        if '=' in kv:
            k, v = kv.split('=', 1)
            inputs[k] = v
    st, d = api('/repos/%s/actions/workflows/%s/dispatches' % (REPO, wf),
                'POST', {'ref': 'main', 'inputs': inputs})
    if st in (204, 201):
        print('✓ 已触发 %s inputs=%s' % (wf, inputs))
    else:
        print('✗ 触发失败 HTTP %s: %s' % (st, json.dumps(d, ensure_ascii=False)[:400]))
        return 1
    # 找到最新 run
    for _ in range(30):
        st2, d2 = api('/repos/%s/actions/workflows/%s/runs?per_page=1' % (REPO, wf))
        runs = (d2 or {}).get('workflow_runs') or []
        if runs:
            print('run_id=%s status=%s' % (runs[0]['id'], runs[0]['status']))
            return 0
        time.sleep(2)
    print('✗ 未找到 run')
    return 1


def cmd_wait(argv):
    run_id = argv[1]
    timeout = 900
    if '--timeout' in argv:
        timeout = int(argv[argv.index('--timeout') + 1])
    t0 = time.time()
    last = None
    while time.time() - t0 < timeout:
        st, d = api('/repos/%s/actions/runs/%s' % (REPO, run_id))
        r = (d or {}).get('run') or d or {}
        status = r.get('status'), r.get('conclusion')
        if status != last:
            print('  status=%s conclusion=%s' % status)
            last = status
        if status[0] == 'completed':
            print('完成: %s / %s' % status)
            return 0
        time.sleep(10)
    print('超时')
    return 1


def cmd_log(argv):
    run_id = argv[1]
    st, d = api('/repos/%s/actions/runs/%s/logs' % (REPO, run_id), raw=True)
    if st != 200:
        print('取日志失败 HTTP %s' % st)
        return 1
    try:
        txt = zlib_decompress(d)
    except Exception:
        txt = d.decode('utf-8', 'replace')
    out = []
    for line in txt.splitlines():
        if line.startswith('::group::') or line.startswith('::endgroup::'):
            continue
        out.append(line)
    print('\n'.join(out))
    return 0


def zlib_decompress(b):
    import gzip, io, zipfile
    if b[:2] == b'PK':
        z = zipfile.ZipFile(io.BytesIO(b))
        parts = []
        for n in z.namelist():
            if n.endswith('.txt'):
                parts.append(z.read(n).decode('utf-8', 'replace'))
        return '\n'.join(parts)
    return gzip.decompress(b).decode('utf-8', 'replace')


def cmd_runs(argv):
    path = '/repos/%s/actions/runs?per_page=15' % REPO
    if len(argv) > 1:
        path = '/repos/%s/actions/workflows/%s/runs?per_page=10' % (REPO, argv[1])
    st, d = api(path)
    for r in ((d or {}).get('workflow_runs') or []):
        print('#%-12s %-26s %-12s %-12s %s' % (r['id'], r['name'][:26], r['status'],
                                               r.get('conclusion'), r['created_at']))
    return 0


if __name__ == '__main__':
    if not token():
        print('拿不到 GitHub token')
        sys.exit(1)
    c = sys.argv[1] if len(sys.argv) > 1 else 'runs'
    {'dispatch': cmd_dispatch, 'wait': cmd_wait, 'log': cmd_log,
     'runs': cmd_runs}.get(c, cmd_runs)(sys.argv[2:])
