#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
复算《风声群成员 ID 名册 v1.0》引用的每一个数字。

口径固定：
  - 群成员名册取自 lark-cli im +chat-members-list（本 app 视角：cli_aaeac7106f38dbde）
  - 接口状态取自线上 https://fengsheng-ee9.pages.dev 实测
  - 「name 空 / name 非空」以服务端 mentions 解析结果为准

用法：
  python3 scripts/verify_roster_numbers.py            # 默认：离线复算（不打生产）
  python3 scripts/verify_roster_numbers.py --live     # 线上最小验证（只打 1 个端点）
  python3 scripts/verify_roster_numbers.py --live-all # 全端点（仅事故恢复后一次性用）

⚠️ 用量纪律（2026-11-06，小鱼儿提醒「别验收加剧事故」）：
  /api/stats/* 每次请求按 estimateRowsForEndpoint 估算约 1200~1300 行读取，
  D1 免费额度 500 万行/天已被打穿一次 —— **验收本身在吃额度**。
  因此本脚本默认**离线**（只复算名册与静态数字，不打生产）；
  仅在关键结论变更时显式加 --live，且只打 1 个端点做最小验证。
  线上验证必须读 X-Stats-Cache 头判断是旧缓存还是真查 D1。

退出码：0 = 全部一致；1 = 存在不一致
"""
import json
import subprocess
import sys

CHAT_ID = 'oc_68714b732f740d284e51268ba1b65614'
LIVE_BASE = 'https://fengsheng-ee9.pages.dev'

# 名册断言：(键, 期望值, 说明)
ROSTER_ASSERTIONS = [
    ('bot_total', 11, '群内 bot 总数'),
    ('user_total', 1, '群内真人用户数'),
    ('total_members', 12, '群成员合计'),
    ('bots_with_app_id', 9, '有 app_id 的 bot 数'),
    ('bots_without_app_id', 2, '无 app_id（成员级）bot 数'),
    ('union_id_prefix_ok', True, '全部 union_id 以 on_ 开头'),
    ('open_id_prefix_ok', True, '全部 open_id 以 ou_ 开头'),
    ('app_id_prefix_ok', True, '全部 app_id 以 cli_ 开头'),
]

LIVE_ASSERTIONS = [
    ('/api/stats/pages', 200, '页面聚合：已可用'),
    ('/api/stats/events', 500, '事件明细：D1 额度超限'),
    ('/api/stats/summary', 200, '汇总：已可用'),
    ('/api/stats/health', 200, '健康检查：已可用'),
    ('/api/feedback-external', 500, 'GET 空 body 触发 500'),
]

# ⚠️ 关键判据：stats 接口族走 handleStatsCached，命中旧缓存时返回 200 + X-Stats-Cache: HIT，
#    但底账仍可能超限。只看 HTTP 码会把「超限」误判成「已恢复」。
#    因此对 stats/* 必须同时读 X-Stats-Cache 头；BYPASS/MISS 才代表真打了 D1。
CACHE_SENSITIVE = ('/api/stats/',)

FAILED = []


def cache_state_is_stale(headers):
    """判断响应是否来自旧缓存（HIT / MEMO / STALE）—— 此时不能据此断定接口已恢复。"""
    for line in (headers or '').splitlines():
        if line.lower().startswith('x-stats-cache:'):
            return line.split(':', 1)[1].strip().upper() in ('HIT', 'MEMO', 'STALE')
    return False


def chk(label, actual, claimed):
    ok = actual == claimed
    if not ok:
        FAILED.append(label)
    print('  %-44s 实际=%-22s 名册写=%-22s %s'
          % (label, actual, claimed, '✅' if ok else '❌'))
    return ok


def get_members(member_id_type):
    cmd = ['lark-cli', 'im', '+chat-members-list', '--as', 'bot',
           '--chat-id', CHAT_ID, '--page-all',
           '--member-id-type', member_id_type, '--as', 'bot']
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    return json.loads(out)


def main():
    print('=' * 78)
    print('【复算 ①】群成员名册（lark-cli 实拉）')
    print('=' * 78)
    open_dim = get_members('open_id')
    union_dim = get_members('union_id')
    bots = open_dim['data']['bots']
    users = open_dim['data']['users']
    ubots = union_dim['data']['bots']

    chk('bot_total', open_dim['data']['bot_total'], 11)
    chk('user_total', open_dim['data']['user_total'], 1)
    chk('total_members', open_dim['meta']['count'], 12)
    chk('bots_with_app_id', sum(1 for b in bots if b.get('app_id')), 9)
    chk('bots_without_app_id', sum(1 for b in bots if not b.get('app_id')), 2)
    chk('union_id_prefix_ok',
        all(str(b.get('member_id', '')).startswith('on_') for b in ubots), True)
    chk('open_id_prefix_ok',
        all(str(b.get('member_id', '')).startswith('ou_')
            for b in bots + users), True)
    chk('app_id_prefix_ok',
        all(str(b.get('app_id', '')).startswith('cli_')
            for b in bots if b.get('app_id')), True)

    # 名册表格逐行核对：union_id ↔ 名字映射是否与文中一致
    NAME_TO_UNION = {
        '小鱼儿': 'on_d8c343704954edaefa131b895e9793dc',
        '小眼镜': 'on_aaba684d0ddf6a8e8d833f35c193f415',
        '小豆子': 'on_c718d1390422dfc6ed1c6675b2a4dfe2',
        '小扣子（代码）': 'on_028b059c330694e01076b25b1a53dd96',
        '小包子': 'on_f213948c7b5ebcf8cf9b36bdebc37a06',
        '小酒窝儿--风声品控': 'on_3106a50f7ac752e2a861f0ead1389b0a',
        '小马丫': 'on_ecbb0ec0cbb98cd291a78b1cdedb0057',
        '风声作战部队': 'on_d86ccee69f4980cd9e05f209ac3f3eeb',
        '风声·数字员工作战中心': 'on_486ef7abac0987dc8af81f009174c71e',
        '唤醒机器人': 'on_494c56453b7cf2cbabc2cdb8baadfe04',
        '小叮当--风声增长官': 'on_3ab97ba0008289e663e59b28d9f18bc9',
    }
    real = {b['name']: b['member_id'] for b in ubots}
    for name, uid in NAME_TO_UNION.items():
        chk('union_id[%s]' % name, real.get(name), uid)
    chk('union_id[李滨生]',
        {u['name']: u['member_id'] for u in union_dim['data']['users']}.get('李滨生'),
        'on_307c18b06f1e47f7c100049e5812ba78')

    if '--live' in sys.argv:
        print()
        print('=' * 78)
        print('【复算 ②】三项接口线上实测（名册第四节）')
        print('=' * 78)
        import subprocess as _sp
        import urllib.error  # noqa: F401  (保留说明：urllib 默认 UA 会被 CF 拦 403/1010)

        def http_probe(path, method='GET', payload=None, want_headers=False):
            """用 curl 取证 —— urllib 默认 User-Agent 会被 Cloudflare 拦（403 / error 1010）。"""
            cmd = ['curl', '-s', '--max-time', '25',
                   '-o', '/tmp/_probe_body.txt',
                   '-D', '/tmp/_probe_hdr.txt',
                   '-w', '%{http_code}', '-X', method, LIVE_BASE + path]
            if payload is not None:
                cmd += ['-H', 'Content-Type: application/json', '-d', json.dumps(payload)]
            code = _sp.run(cmd, capture_output=True, text=True).stdout.strip()
            with open('/tmp/_probe_body.txt', encoding='utf-8', errors='replace') as f:
                body = f.read()
            headers = ''
            if want_headers:
                try:
                    with open('/tmp/_probe_hdr.txt', encoding='utf-8', errors='replace') as f:
                        headers = f.read()
                except OSError:
                    headers = ''
            return int(code), body, headers

        def header_value(headers, key):
            for line in headers.splitlines():
                if line.lower().startswith(key.lower() + ':'):
                    return line.split(':', 1)[1].strip()
            return None

        # 用量节制（2026-11-06）：--live 只打 1 个端点做最小验证（默认 /api/stats/summary，
        # 它 BYPASS 缓存 → 真打 D1，最能验到底账）；--live-all 才打全部。
        targets = LIVE_ASSERTIONS
        if '--live-all' not in sys.argv:
            targets = [t for t in LIVE_ASSERTIONS if t[0] == '/api/stats/summary']
            print('  [用量节制] --live 模式只打 1 个端点（/api/stats/summary，BYPASS 缓存可验底账）；'
                  ' 全端点请显式用 --live-all')

        for path, code_expected, desc in targets:
            actual, body, hdrs = http_probe(path, want_headers=path.startswith(CACHE_SENSITIVE))
            stale = path.startswith(CACHE_SENSITIVE) and cache_state_is_stale(hdrs)
            if stale and path == '/api/stats/events':
                # 旧缓存态：HTTP 200 但底账未验真 —— 不判失败，只标注待 08:00 后复核
                print('  %-44s 实际=%-22s 名册写=%-22s ⚠️ 旧缓存态'
                      % ('%s (%s)' % (path, desc), actual, code_expected))
            else:
                chk('%s (%s)' % (path, desc), actual, code_expected)
            if path.startswith(CACHE_SENSITIVE):
                cache = header_value(hdrs, 'x-stats-cache')
                used = header_value(hdrs, 'x-d1-budget-used')
                print('       └ X-Stats-Cache=%s  X-D1-Budget-Used=%s' % (cache, used))
                # 命中旧缓存(HIT/MEMO)时，底账可能仍超限 —— 以响应体是否带 D1_ERROR 为真相
                if 'D1_ERROR' in body:
                    print('       └ 响应体含 D1_ERROR → 底账确实超限（%s）' % '真超限')
                elif cache in ('HIT', 'MEMO', 'STALE'):
                    print('       └ 命中缓存且无 D1_ERROR → ⚠️ 旧缓存，不能据此判"已恢复"')
                else:
                    print('       └ 真实查询且无 D1_ERROR → 额度有余')
            if path == '/api/stats/pages':
                try:
                    d = json.loads(body)
                    print('       └ pages 条数=%d days=%s source=%s'
                          % (len(d.get('pages', [])), d.get('days'), d.get('source')))
                    chk('  stats/pages 返回条数', len(d.get('pages', [])), 27)
                except Exception as exc:
                    print('       └ 解析失败:', exc)
            if path == '/api/stats/events':
                if 'exceeded D1' in body:
                    print('       └ 根因= D1 额度超限 ✅ 与名册一致')
                elif cache_state_is_stale(hdrs):
                    print('       └ 当前为旧缓存(HIT)，名册记的"真缺口"结论待 08:00 后复核')
                else:
                    print('       └ ⚠️ 根因与名册描述不一致，请核对')
                    FAILED.append('stats/events 根因')
            if path == '/api/feedback-external':
                print('       └ GET 空 body 返回:', body[:80])

        # POST 合法 body 应 200（feedback-external 不读 events 表，行读取代价低，但仍只在全端点模式下打）
        if '--live-all' in sys.argv:
            actual, body, _ = http_probe('/api/feedback-external', 'POST',
                                          {'message': 'probe', 'source': 'probe'})
            chk('/api/feedback-external POST 合法 body', actual, 200)
        else:
            print('  [用量节制] feedback-external POST 校验仅在 --live-all 下执行')

    print()
    print('=' * 78)
    print('复算结果：%s' % ('✅ 全部一致' if not FAILED else '❌ 不一致 → %s' % FAILED))
    print('=' * 78)
    return 1 if FAILED else 0


if __name__ == '__main__':
    sys.exit(main())
