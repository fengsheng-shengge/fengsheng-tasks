#!/bin/bash
# ============================================================
# 沃土计划 Flask 一键升级脚本
# 功能：下载最新 app.py + register.html + landing.html → 覆盖 → 重启 Flask
# 用法：在你电脑的终端里直接运行：bash wotu_update.sh
# 前置：你电脑上 cloudflared tunnel 已经在跑（不用管它）
# ============================================================
set -e

echo "=============================================="
echo "  沃土计划 Flask 一键升级（/register + / landing 修复）"
echo "=============================================="
echo ""

# Step 1: 找到 Flask 目录
# 先猜几个常见位置
GUESS_DIRS=(
  "$(pwd)"
  "$HOME/wotu_web"
  "$HOME/沃土计划_wotu_web"
  "/root/wotu_web"
  "$HOME/Desktop/wotu_web"
)

TARGET_DIR=""
for d in "${GUESS_DIRS[@]}"; do
  if [ -f "$d/app.py" ] && [ -d "$d/templates" ] && [ -f "$d/wotu_full.db" ]; then
    TARGET_DIR="$d"
    break
  fi
done

if [ -z "$TARGET_DIR" ]; then
  echo "⚠️ 没找到自动目录"
  echo "请手动输入你的 Flask 项目完整路径（包含 app.py 和 wotu_full.db 的那个目录）:"
  read TARGET_DIR
fi

echo "📍 Flask 目录: $TARGET_DIR"
cd "$TARGET_DIR"

# Step 2: 备份
TS=$(date +%Y%m%d_%H%M%S)
cp app.py "app.py.bak.$TS" 2>/dev/null
echo "✅ 已备份 app.py → app.py.bak.$TS"

# Step 3: 下载 3 个文件
echo ""
echo "📥 下载最新版本..."
curl -fsSL -o app.py.new      "https://raw.githubusercontent.com/fengsheng-shengge/fengsheng-tasks/main/patch_wotu_v1.9.1+/app.py.new"
curl -fsSL -o templates/register.html "https://raw.githubusercontent.com/fengsheng-shengge/fengsheng-tasks/main/patch_wotu_v1.9.1+/templates/register.html"
curl -fsSL -o templates/landing.html  "https://raw.githubusercontent.com/fengsheng-shengge/fengsheng-tasks/main/patch_wotu_v1.9.1+/templates/landing.html"

# 如果 curl 失败（raw.githubusercontent.com 被墙），试试 jsdelivr
if ! python3 -c "import app" 2>&1 | head -1; then
  echo "GitHub 访问可能被墙，换 jsdelivr..."
  curl -fsSL -o app.py.new      "https://cdn.jsdelivr.net/gh/fengsheng-shengge/fengsheng-tasks@main/patch_wotu_v1.9.1+/app.py.new"
  curl -fsSL -o templates/register.html "https://cdn.jsdelivr.net/gh/fengsheng-shengge/fengsheng-tasks@main/patch_wotu_v1.9.1+/templates/register.html"
  curl -fsSL -o templates/landing.html  "https://cdn.jsdelivr.net/gh/fengsheng-shengge/fengsheng-tasks@main/patch_wotu_v1.9.1+/templates/landing.html"
fi

mv app.py.new app.py
echo "✅ app.py 更新"
echo "✅ templates/register.html 新增"
echo "✅ templates/landing.html 新增"

# Step 4: 验证文件存在
echo ""
echo "🔍 验证文件..."
ls -la app.py templates/register.html templates/landing.html

# Step 5: DB 写 gongan_no
echo ""
echo "🗄️  DB 写 gongan_no..."
sqlite3 wotu_full.db "INSERT OR REPLACE INTO system_config (key, value) VALUES ('gongan_no', '京公网安备11010802051263号');"
echo "✅ gongan_no 已写入"

# Step 6: 停老 Flask
echo ""
echo "🛑 停旧 Flask..."
OLD_PID=$(pgrep -f "python.*app.py" | head -1)
if [ -n "$OLD_PID" ]; then
  echo "找到旧进程 PID=$OLD_PID，停掉..."
  kill $OLD_PID 2>/dev/null
  sleep 2
  kill -9 $OLD_PID 2>/dev/null
fi
echo "✅ 旧进程已停"

# Step 7: 启动新 Flask
echo ""
echo "🚀 启动新 Flask..."
# 尝试 venv
if [ -d "venv" ]; then
  PYTHON="./venv/bin/python"
elif command -v python3 >/dev/null; then
  PYTHON="python3"
else
  PYTHON="python"
fi

nohup $PYTHON app.py > /tmp/wotu_new.log 2>&1 < /dev/null &
NEW_PID=$!
sleep 3

# 验证
echo ""
echo "🔎 验证新进程..."
if ps -p $NEW_PID > /dev/null 2>&1; then
  echo "✅ Flask 启动成功 PID=$NEW_PID"
else
  echo "❌ Flask 启动失败，查看日志:"
  tail -30 /tmp/wotu_new.log
  exit 1
fi

# 本地 curl 验证
sleep 2
LOCAL_OK=1
for path in "/" "/register" "/login"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5001$path" 2>/dev/null || echo "000")
  echo "  本地 $path → HTTP $CODE"
  [ "$CODE" != "200" ] && LOCAL_OK=0
done

if [ "$LOCAL_OK" -eq 1 ]; then
  echo ""
  echo "============================================================"
  echo "  ✅ 全部搞定！cloudflared tunnel 自动转发到新 Flask 了"
  echo "  打开 https://wotu.fengsheng.tech/register 试试"
  echo "============================================================"
else
  echo ""
  echo "⚠️ 本地验证有路由没通，日志:"
  tail -20 /tmp/wotu_new.log
fi
