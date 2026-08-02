"""
V3.0 fix 冒烟: 5 tab 切换 + 冷启动 seed 链路 (验证 storage too-eayly fix 不引入功能回归)
- 起 h5 server (port 8770)
- 5 tab 全部切换 + 计数 (无 jsbridge 错误, 仅 H5 模拟)
- 客户档案冷启 4 客户 + 验证 footer 可点
- 0 控制台/页面错误 = PASS
"""
import os, re, sys, time, socket, subprocess
from pathlib import Path

ROOT = Path("/Users/ke/WorkBuddy/Claw/fengsheng-tasks/fs-mini-program")
H5_DIR = ROOT / "dist/build/h5"
OUT = Path("/Users/ke/WorkBuddy/Claw/fengsheng-tasks/outputs/h5_fix_smoke")
OUT.mkdir(parents=True, exist_ok=True)
PORT = 8770

def pick_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]; s.close()
    return p

PORT = pick_port()
url = f"http://127.0.0.1:{PORT}/"

# 起 server
srv = subprocess.Popen(
    ["/Users/ke/.workbuddy/binaries/python/envs/default/bin/python", "-m", "http.server", str(PORT), "--directory", str(H5_DIR)],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)

from playwright.sync_api import sync_playwright

results = []
def check(name, cond, detail=""):
    tag = "PASS" if cond else "FAIL"
    results.append((tag, name, detail))
    print(f"[{tag}] {name}  {detail}")

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", str(Path.home()/".cache/ms-playwright"))

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(f"PAGE:{e.message[:80]}"))
    page.on("console", lambda m: errors.append(f"CON:{m.text[:80]}") if m.type=="error" else None)
    page.goto(url, wait_until="networkidle", timeout=20000)
    page.wait_for_timeout(1200)

    # 1) 首页加载
    tabs = page.locator(".uni-tabbar__item").count()
    check("首页加载 tab数=5", tabs==5, f"实测={tabs}")
    page.screenshot(path=str(OUT/"01_home.png"))

    # 2) 切换 5 个 tab
    for i, name in enumerate(["首页", "知识", "策展", "客户档案", "我的"]):
        try:
            page.click(f".uni-tabbar__item:has-text('{name}')", timeout=4000)
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT/f"02_tab_{i}_{name}.png"))
            check(f"tab[{name}] 切换成功", True)
        except Exception as e:
            check(f"tab[{name}] 切换成功", False, str(e)[:60])

    # 3) 客户档案
    page.click(".uni-tabbar__item:has-text('客户档案')")
    page.wait_for_timeout(1200)
    cards = page.locator(".client-card").count()
    check("客户档案 冷启有4示例", cards==4, f"卡片={cards}")
    page.screenshot(path=str(OUT/"03_clients.png"))

    # 4) 新建弹窗
    page.click("text=＋ 新建", timeout=5000)
    page.wait_for_timeout(800)
    ov = page.locator(".overlay.active").count()
    foot = page.locator(".ov-foot .foot-save").is_visible()
    check("新建弹窗+footer可见", ov==1 and foot, f"overlay={ov} foot={foot}")
    page.screenshot(path=str(OUT/"04_form.png"))

    # 关闭
    page.click(".foot-cancel", timeout=3000)
    page.wait_for_timeout(500)

    # 5) 策展页冒烟
    page.click(".uni-tabbar__item:has-text('策展')")
    page.wait_for_timeout(800)
    page.screenshot(path=str(OUT/"05_curation.png"))
    check("策展页加载", page.locator(".page").is_visible())

    # 6) 控制台/页面错误
    real_errs = [e for e in errors if not re.search(r"favicon|scrollTop|hot-reload|hot reload|Reload Model", e, re.I)]
    check("0 控制台/页面错误", len(real_errs)==0, f"错误={real_errs[:3]}")

    browser.close()

srv.terminate()
srv.wait(timeout=3)

print()
print(f"==== 结果 {sum(1 for r in results if r[0]=='PASS')}/{len(results)} ====")
for r in results: print(f"  [{r[0]}] {r[1]}  {r[2]}")
sys.exit(0 if all(r[0]=='PASS' for r in results) else 1)
