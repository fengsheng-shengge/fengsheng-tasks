#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
沃土计划 Flask 一键修复脚本 v1.0
=============================
功能：自动找到你电脑上的 wotu_web 目录 → 下载最新 app.py + register.html + landing.html → 覆盖 → 重启 Flask
用法：在任何终端里运行：
    python3 fix_wotu.py
或一行命令（macOS/Linux）：
    curl -sL https://cdn.jsdelivr.net/gh/fengsheng-shengge/fengsheng-tasks@main/fix_wotu.py -o fix.py && python3 fix.py
"""

import os, sys, time, json, sqlite3, subprocess, signal, urllib.request, zipfile, io

GITHUB = "https://cdn.jsdelivr.net/gh/fengsheng-shengge/fengsheng-tasks@main"

def log(msg): print(f"  {msg}")

def find_wotu_dir():
    """自动搜 wotu 目录"""
    candidates = []
    home = os.path.expanduser("~")
    search_roots = [home, os.path.join(home, "Desktop"), os.path.join(home, "Downloads"), "/root", "/opt", "/workspace"]
    
    for root in search_roots:
        if not os.path.isdir(root): continue
        for dirpath, dirnames, filenames in os.walk(root):
            # 深度限制
            depth = dirpath.count(os.sep) - root.count(os.sep)
            if depth > 6: dirnames[:] = []; continue
            
            if "app.py" in filenames and "wotu_full.db" in filenames and "templates" in dirnames:
                candidates.append(dirpath)
                dirnames[:] = []  # 不继续深入
    
    if not candidates:
        return None
    
    # 选最新的
    candidates.sort(key=lambda d: os.path.getmtime(d), reverse=True)
    return candidates[0]

def download(url, dest_path):
    """下载文件"""
    log(f"下载 {os.path.basename(dest_path)} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = resp.read()
    os.makedirs(os.path.dirname(dest_path) or ".", exist_ok=True)
    with open(dest_path, "wb") as f:
        f.write(data)
    return len(data)

def main():
    print("=" * 55)
    print("  沃土计划 Flask 一键修复（/register + /landing + 备案号）")
    print("=" * 55)
    print()
    
    # Step 1: 找目录
    log("Step 1/6: 自动扫描 wotu 项目目录...")
    wotu_dir = find_wotu_dir()
    
    if not wotu_dir:
        print()
        print("  ⚠️  自动扫描没找到，请手动输入完整路径：")
        print("     （就是里面有 app.py 和 wotu_full.db 的那个文件夹）")
        try:
            wotu_dir = input("  路径 > ").strip().strip('"').strip("'")
        except (EOFError, KeyboardInterrupt):
            print("  已取消"); sys.exit(1)
        if not os.path.isfile(os.path.join(wotu_dir, "app.py")):
            print("  ❌ 这个目录里没有 app.py"); sys.exit(1)
    
    log(f"✅ 找到: {wotu_dir}")
    os.chdir(wotu_dir)
    
    # Step 2: 备份
    log("Step 2/6: 备份旧文件...")
    ts = time.strftime("%Y%m%d_%H%M%S")
    for f in ["app.py"]:
        p = os.path.join(wotu_dir, f)
        if os.path.exists(p):
            os.rename(p, f"{p}.bak.{ts}")
    log(f"✅ 已备份 app.py → app.py.bak.{ts}")
    
    # Step 3: 下载 3 个文件
    log("Step 3/6: 下载最新版本...")
    files = [
        (f"{GITHUB}/patch_wotu_v1.9.1+/app.py.new", "app.py"),
        (f"{GITHUB}/patch_wotu_v1.9.1+/templates/register.html", "templates/register.html"),
        (f"{GITHUB}/patch_wotu_v1.9.1+/templates/landing.html", "templates/landing.html"),
    ]
    
    for url, dest in files:
        try:
            download(url, os.path.join(wotu_dir, dest))
        except Exception as e:
            print(f"  ❌ 下载失败: {e}")
            sys.exit(1)
    
    log("✅ 3 个文件下载完成")
    
    # Step 4: DB 写 gongan_no
    log("Step 4/6: 写入公安备案号...")
    try:
        db = sqlite3.connect(os.path.join(wotu_dir, "wotu_full.db"))
        db.execute("INSERT OR REPLACE INTO system_config (key, value) VALUES ('gongan_no', '京公网安备11010802051263号')")
        db.commit(); db.close()
        log("✅ gongan_no 已写入")
    except Exception as e:
        log(f"⚠️  DB 写入跳过（可能没表）: {e}")
    
    # Step 5: 停旧 Flask
    log("Step 5/6: 停旧 Flask...")
    killed = 0
    try:
        result = subprocess.run(["pgrep", "-f", "python.*app.py"], capture_output=True, text=True, timeout=3)
        for pid in result.stdout.strip().split("\n"):
            if pid:
                try:
                    os.kill(int(pid), signal.SIGTERM)
                    killed += 1
                except: pass
    except: pass
    
    time.sleep(2)
    if killed: log(f"✅ 已停 {killed} 个旧进程")
    else: log("✅ 没找到旧进程（可能没在跑）")
    
    # Step 6: 启动新 Flask
    log("Step 6/6: 启动新 Flask...")
    
    # 找 python
    python = None
    for p in ["./venv/bin/python", "venv/bin/python", "python3", "python"]:
        try:
            subprocess.run([p, "-c", "print('ok')"], capture_output=True, timeout=2)
            python = p; break
        except: pass
    
    if not python:
        print("  ❌ 找不到 python"); sys.exit(1)
    
    log(f"  Python: {python}")
    
    # 后台启动
    log_file = "/tmp/wotu_new.log"
    with open(log_file, "w") as logf:
        proc = subprocess.Popen(
            [python, "app.py"],
            stdout=logf, stderr=logf,
            stdin=subprocess.DEVNULL,
            start_new_session=True,
            cwd=wotu_dir
        )
    
    time.sleep(4)
    
    # 验证
    import urllib.request
    results = {}
    for path in ["/", "/register", "/login", "/healthz"]:
        try:
            r = urllib.request.urlopen(f"http://127.0.0.1:5001{path}", timeout=3)
            results[path] = r.status
        except Exception as e:
            results[path] = f"ERR({e})"
    
    all_ok = all(v == 200 for v in results.values())
    print()
    print("  本地验证:")
    for path, code in results.items():
        mark = "✅" if code == 200 else "❌"
        print(f"    {mark} {path} → {code}")
    
    print()
    if all_ok:
        print("=" * 55)
        print("  🎉 搞定！cloudflared tunnel 会自动转发到新 Flask")
        print("  打开 https://wotu.fengsheng.tech/register 试试")
        print("=" * 55)
    else:
        print("  ⚠️  有路由没通，日志:", log_file)
        subprocess.run(["tail", "-20", log_file])

if __name__ == "__main__":
    main()
