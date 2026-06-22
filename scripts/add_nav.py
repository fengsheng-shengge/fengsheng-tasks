#!/usr/bin/env python3
import sys, os

NAV_HTML = '''<nav class="fs-nav" aria-label="主导航">
  <a href="/" class="fs-nav-brand" aria-label="风声首页">🌬️ <span>风声</span></a>
  <div class="fs-nav-links">
    <a href="/">首页</a>
    <a href="/quality-test/">品质测评</a>
    <a href="/care-test/">关怀测评</a>
    <a href="/reply/">客户解码</a>
    <a href="/s1-report/">带看报告</a>
    <a href="/knowledge.html">知识底座</a>
    <a href="/dashboard/">管理看板</a>
  </div>
  <button class="fs-nav-menu" aria-label="打开菜单" aria-expanded="false" onclick="this.parentElement.classList.toggle('open');this.setAttribute('aria-expanded',this.parentElement.classList.contains('open'))">☰</button>
</nav>
<style>
.fs-nav{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:52px;background:#fff;border-bottom:1px solid rgba(80,90,70,.09);position:sticky;top:0;z-index:100}
.fs-nav-brand{font-size:16px;font-weight:700;color:#3d5a3e;text-decoration:none;display:flex;align-items:center;gap:4px}
.fs-nav-links{display:flex;gap:6px}
.fs-nav-links a{padding:5px 10px;font-size:12px;color:#555;text-decoration:none;border-radius:6px;transition:all .15s;white-space:nowrap}
.fs-nav-links a:hover{background:rgba(61,90,62,.06);color:#3d5a3e}
.fs-nav-menu{display:none;background:none;border:none;font-size:20px;cursor:pointer;color:#3d5a3e;padding:8px}
@media (max-width:767px){
  .fs-nav-links{display:none;position:absolute;top:52px;left:0;right:0;background:#fff;flex-direction:column;padding:10px;border-bottom:1px solid rgba(80,90,70,.09);box-shadow:0 4px 12px rgba(0,0,0,.08)}
  .fs-nav.open .fs-nav-links{display:flex}
  .fs-nav-menu{display:block}
}
.skip-nav{position:absolute;top:-40px;left:0;background:#3d5a3e;color:#fff;padding:8px 16px;z-index:200;text-decoration:none;font-size:13px;border-radius:0 0 8px 0;transition:top .2s}
.skip-nav:focus{top:0}
</style>
<a class="skip-nav" href="#main">跳到主要内容</a>
'''

files = ['agent-academy.html', 'skills.html', 'standard.html', 'okr.html']

for f in files:
    if not os.path.exists(f):
        print(f"✗ {f} 不存在")
        continue
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    if 'fs-nav' in content:
        print(f"⊘ {f} 已有导航")
        continue
    content = content.replace('<body>', '<body>\n\n' + NAV_HTML, 1)
    if 'id="main"' not in content and "id='main'" not in content:
        content = content.replace('<div class="container">', '<div class="container" id="main">', 1)
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(content)
    print(f"✓ {f} 已添加导航")
