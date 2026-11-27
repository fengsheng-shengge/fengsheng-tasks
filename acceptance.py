#!/usr/bin/env python3
"""
V2.2 Issue #258 Acceptance — 8 项验收硬指标
===============================================
执行方式: python3 acceptance.py [base_url]
默认: https://fengsheng.tech
"""
import sys, subprocess, json, argparse

BASE = "https://fengsheng.tech"
PASS, FAIL = 0, 0

def curl(path, method="GET", data=None, headers=None, follow=False):
    """通过 curl 发请求（绕过 Python urllib 代理问题）"""
    cmd = ["curl", "-s", "-o", "-", "-w", "HTTP_CODE:%{http_code}", "--max-time", "15"]
    if method == "POST":
        cmd += ["-X", "POST"]
    if data:
        cmd += ["-d", data, "-H", "Content-Type: application/json"]
    if follow:
        cmd += ["-L"]
    cmd += [BASE + path]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        out = r.stdout
        http_code = 0
        body = ""
        if "HTTP_CODE:" in out:
            body, _, tail = out.rpartition("HTTP_CODE:")
            http_code = int(tail.strip())
        return http_code, body
    except Exception as e:
        return 0, str(e)

def ok(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        print(f"  ✅ {name}")
        PASS += 1
    else:
        print(f"  ❌ {name} {detail}")
        FAIL += 1

def main():
    global BASE
    if len(sys.argv) > 1:
        BASE = sys.argv[1].rstrip("/")

    print(f"\n{'='*50}")
    print(f"V2.2 Issue #258 Acceptance")
    print(f"Base: {BASE}")
    print(f"{'='*50}\n")

    # ① Workspace 核心路由
    s, _ = curl("/workspace/")
    ok("① /workspace/ 200", s == 200, f"(got {s})")

    # ② Evidence 直接访问
    s, _ = curl("/evidence/?id=CAR-COMP-001")
    ok("② /evidence/?id=CAR-COMP-001 200", s == 200, f"(got {s})")

    # ③ Evidence rewrite
    s, _ = curl("/evidence/CAR-COMP-001", follow=True)
    ok("③ /evidence/CAR-COMP-001 → 301 rewrite → 200", s == 200, f"(got {s})")

    # ④ Wotu broker 友好 URL
    s, _ = curl("/wotu/broker")
    ok("④ /wotu/broker → 301 → /wotu/?job=broker", s in (301, 200), f"(got {s})")

    # ⑤ Wotu lease 直接访问
    s, _ = curl("/wotu/?job=lease")
    ok("⑤ /wotu/?job=lease 200", s == 200, f"(got {s})")

    # ⑥ packs.json 数据层
    s, body = curl("/data/v3/packs.json")
    try:
        d = json.loads(body)
        jobs = d.get('jobs', {})
        ok("⑥ packs.json 2 岗位 × 3 包",
           s == 200 and len(jobs) >= 2 and
           all(len(j.get('packages',[])) == 3 for j in jobs.values()),
           f"(HTTP={s} jobs={list(jobs.keys())})")
    except Exception as e:
        ok("⑥ packs.json 可解析", False, f"(解析失败: {e})")

    # ⑦ scene_cards.json
    s, body = curl("/data/v3/scene_cards.json")
    try:
        sc = json.loads(body)
        cards = sc if isinstance(sc, list) else sc.get('cards', sc.get('data', []))
        ok("⑦ scene_cards.json ≥20 卡", s == 200 and len(cards) >= 20,
           f"(HTTP={s} cards={len(cards)})")
    except Exception as e:
        ok("⑦ scene_cards.json", False, f"(解析失败: {e})")

    # ⑧ signup 校验层
    s, body = curl("/api/wotu/signup", "POST",
                   json.dumps({"name": "t", "phone": "1", "job": "x", "city": ""}))
    try:
        r = json.loads(body)
        ok("⑧ signup 校验层拒绝无效提交",
           s in (200, 400) and r.get('ok') is False and 'error' in r,
           f"(HTTP={s} {r})")
    except Exception as e:
        ok("⑧ signup 校验层", False, f"(HTTP={s} body={body[:60]})")

    # --- 额外: Issue 验收硬指标 ---
    print(f"\n--- Issue #258 额外硬指标 ---")

    # K-11 沃土页禁词
    s, body = curl("/wotu/")
    bad_words = ["起薪", "无责底薪", "月入"]
    hits = [w for w in bad_words if w in body]
    ok("K-11 沃土页无禁词", len(hits) == 0, f"(命中: {hits})")

    # K-15 全站 title 无 "风声信息咨询"（仅检查公开页面）
    sample_paths = ["/", "/workspace/", "/knowledge/", "/mentor/", "/wotu/", "/home-design/", "/care-test/"]
    bad_titles = []
    for p in sample_paths:
        s, body = curl(p)
        if "风声信息咨询" in body:
            bad_titles.append(p)
    ok("K-15 公开页 title 无'风声信息咨询'", len(bad_titles) == 0, f"(命中: {bad_titles})")

    # sitemap.xml
    s, body = curl("/sitemap.xml")
    ok("K-14 sitemap.xml 可访问", s == 200 and "<urlset" in body, f"(HTTP={s})")

    # API 契约
    s, body = curl("/api/wotu/packs")
    ok("K-02 /api/wotu/packs", s == 200, f"(HTTP={s})")
    s, body = curl("/api/scene-cards")
    ok("K-02 /api/scene-cards", s == 200, f"(HTTP={s})")
    s, body = curl("/api/stats/evidence")
    ok("K-02 /api/stats/evidence", s == 200, f"(HTTP={s})")

    print(f"\n{'='*50}")
    print(f"RESULT: {PASS}/8 PASS, {FAIL}/8 FAIL")
    print(f"{'='*50}\n")
    return 0 if FAIL == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
