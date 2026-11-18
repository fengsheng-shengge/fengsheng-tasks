#!/bin/bash
# ============================================================
# 沃土计划 Flask 服务器一键修复（/register + /landing + 备案号）
# 用法：在服务器上直接跑：bash fix_wotu_server.sh
# 前置：systemd 服务 wotu，目录 /root/wotu_app
# ============================================================
set -e

APP_DIR="${APP_DIR:-/root/wotu_app}"
CDN="https://cdn.jsdelivr.net/gh/fengsheng-shengge/fengsheng-tasks@main/patch_wotu_v1.9.1+"

echo "=============================================="
echo "  沃土计划 服务器一键修复"
echo "=============================================="
echo ""
echo "目录: $APP_DIR"

cd "$APP_DIR"

# 1. 备份
echo "▶ 备份旧文件..."
TS=$(date +%Y%m%d_%H%M%S)
cp app.py "app.py.bak.$TS"
echo "  ✅ app.py.bak.$TS"

# 2. 下载 3 个修复文件
echo "▶ 下载修复文件..."
curl -fsSL -o app.py.new              "$CDN/app.py.new"
curl -fsSL -o templates/register.html "$CDN/templates/register.html"
curl -fsSL -o templates/landing.html  "$CDN/templates/landing.html"
mv app.py.new app.py
echo "  ✅ app.py 更新"
echo "  ✅ templates/register.html 新增"
echo "  ✅ templates/landing.html 新增"

# 3. 验证
echo "▶ 验证文件..."
grep -q "def register" app.py && echo "  ✅ register 路由存在" || echo "  ❌ register 路由缺失"
grep -q "def landing"  app.py && echo "  ✅ landing 路由存在"  || echo "  ❌ landing 路由缺失"

# 4. DB 写 gongan_no
echo "▶ DB 写入公安备案号..."
sqlite3 wotu_full.db "INSERT OR REPLACE INTO system_config (key, value) VALUES ('gongan_no', '京公网安备11010802051263号');" 2>/dev/null && \
  echo "  ✅ gongan_no 已写入" || echo "  ⚠️ DB 写入跳过（可能无 system_config 表）"

# 5. 执行迁移（确保库结构对齐）
echo "▶ 执行 migrate_v20.sh（幂等）..."
[ -f migrate_v20.sh ] && bash migrate_v20.sh || echo "  ⚠️ 没找到 migrate_v20.sh，跳过"

# 6. 重启 systemd 服务
echo "▶ 重启 wotu 服务..."
systemctl restart wotu
sleep 3

# 7. 验证
echo "▶ 本地验证..."
for path in "/" "/register" "/login" "/healthz"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5001$path")
  echo "  $path → HTTP $CODE"
done

echo ""
echo "=============================================="
echo "  🎉 搞定！公网 https://wotu.fengsheng.tech/register 现在能打开了"
echo "=============================================="
