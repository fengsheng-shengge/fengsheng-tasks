# -*- coding: utf-8 -*-
"""
V3.0 见面参谋 用户视角走查（H5 + 系统 Chrome）
流程：客户档案 → 打开客户 → 准备这次见面 → 生成参谋 → 存入认知卡 → 回看认知卡
"""
import os, subprocess, time
from playwright.sync_api import sync_playwright

H5 = "/Users/ke/Workbuddy/Claw/fengsheng-tasks/fs-mini-program/dist/build/h5"
OUT = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)
BASE = "http://127.0.0.1:8766/"

VPay = ["会员", "VIP", "充值", "订阅", "积分商城", "合规已评估",
        "免费养成期", "积分直购", "主体升级", "邀请有礼", "¥"]

console_errors, page_errors = [], []
def is_noise(t):
    t = t or ""
    return ("scrollTop" in t and "null" in t) or ("favicon" in t.lower())
def vpay_hits(t): return [k for k in VPay if k in (t or "")]

srv = subprocess.Popen(["/Users/ke/.workbuddy/binaries/python/versions/3.13.12/bin/python3",
                        "-m", "http.server", "8766", "--directory", H5])
time.sleep(2)

def step(label, fn):
    try:
        fn(); print(f"OK  {label}")
    except Exception as e:
        print(f"WARN {label}: {e}")

try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
        pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg.on("console", lambda m: console_errors.append(m.text) if (m.type=="error" and not is_noise(m.text)) else None)
        pg.on("pageerror", lambda e: page_errors.append(str(e)) if not is_noise(str(e)) else None)

        pg.goto(BASE, wait_until="networkidle")
        pg.wait_for_timeout(1800)
        pg.wait_for_selector(".uni-tabbar__item", timeout=15000)
        pg.screenshot(path=os.path.join(OUT, "00_load.png"))

        # 进客户档案
        step("点击tab客户档案", lambda: pg.click("text=客户档案", timeout=8000))
        pg.wait_for_timeout(1000)
        pg.screenshot(path=os.path.join(OUT, "01_clients.png"))

        # 打开第一个客户
        step("打开客户卡", lambda: pg.locator(".client-card").first.click(timeout=8000))
        pg.wait_for_timeout(1200)
        pg.screenshot(path=os.path.join(OUT, "02_client_detail.png"))
        detail = pg.inner_text("body") or ""
        print("[DETAIL] 含『准备这次见面』:", "准备这次见面" in detail)

        # 准备这次见面
        step("点击准备这次见面", lambda: pg.click("text=准备这次见面", timeout=8000))
        pg.wait_for_timeout(1800)
        pg.screenshot(path=os.path.join(OUT, "03_prep_form.png"))
        form = pg.inner_text("body") or ""
        print("[PREP-FORM] 含『生成见面参谋』:", "生成见面参谋" in form)
        print("[PREP-FORM] 含双纵轴:", "双纵轴" in form, "| 含住得好七维:", "住得好七维" in form)

        # 生成
        step("生成见面参谋", lambda: pg.click("text=生成见面参谋", timeout=8000))
        pg.wait_for_timeout(1800)
        pg.screenshot(path=os.path.join(OUT, "04_prep_result.png"))
        res = pg.inner_text("body") or ""
        print("[RESULT] 该说的:", "该说的" in res, "| 真实法源/依据整理中:", ("真实法源" in res) or ("依据整理中" in res),
              "| 见后跟进:", "见后跟进" in res, "| 见前准备(时间轴):", "见前准备" in res)
        print("[RESULT] 虚拟支付严格命中:", vpay_hits(res))

        # 存入认知卡
        step("存入客户认知卡", lambda: pg.click("text=存入客户认知卡", timeout=8000))
        pg.wait_for_timeout(1200)
        pg.screenshot(path=os.path.join(OUT, "05_saved.png"))

        # 回客户档案看认知卡（分包页隐藏 tabbar，用浏览器返回）
        step("浏览器返回", lambda: pg.go_back(timeout=8000))
        pg.wait_for_timeout(1500)
        step("重开客户卡", lambda: pg.locator(".client-card").first.click(timeout=8000))
        pg.wait_for_timeout(1500)
        pg.screenshot(path=os.path.join(OUT, "06_cognition.png"))
        cog = pg.inner_text("body") or ""
        print("[COGNITION] 认知卡:", "认知卡" in cog, "| 已知偏好:", "已知偏好" in cog, "| 已沉淀:", "已沉淀" in cog)
        # 额外：确认认知卡里出现了真实沉淀（偏好/信号词）
        if "已知偏好" in cog:
            print("[COGNITION] 沉淀内容片段:", cog[cog.find("已知偏好"):cog.find("已知偏好")+120].replace("\n"," "))

        print("=== 控制台错误(过滤) ===", len(console_errors))
        for e in console_errors[:10]: print("  ERR:", e)
        print("=== 页面错误(过滤) ===", len(page_errors))
        for e in page_errors[:10]: print("  PERR:", e)
        b.close()
finally:
    srv.terminate()
print("DONE")
