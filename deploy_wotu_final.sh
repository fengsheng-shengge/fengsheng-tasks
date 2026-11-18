#!/bin/bash
# ============================================================
# 沃土计划 最终一键部署（整包替换：代码 + DB + 备案号 + register）
# 用法：在服务器上跑
#   curl -sL https://cdn.jsdelivr.net/gh/fengsheng-shengge/fengsheng-tasks@main/deploy_wotu_final.sh | bash
# 或先下载 zip 手动部署
# ============================================================
set -e

APP_DIR="${APP_DIR:-/root/wotu_app}"
CDN="https://cdn.jsdelivr.net/gh/fengsheng-shengge/fengsheng-tasks@main/wotu_final_deploy.zip"

echo "=============================================="
echo "  沃土计划 最终一键部署"
echo "=============================================="
echo ""
echo "目标目录: $APP_DIR"

cd /root

# 1. 下载最终包
echo "▶ 1/6 下载最终部署包..."
curl -fsSL -o /tmp/wotu_final.zip "$CDN"
echo "  ✅ $(ls -lh /tmp/wotu_final.zip | awk '{print $5}')"

# 2. 备份旧版
echo "▶ 2/6 备份旧版..."
TS=$(date +%Y%m%d_%H%M%S)
if [ -d "$APP_DIR" ]; then
  cp -r "$APP_DIR" "${APP_DIR}.bak.$TS"
  echo "  ✅ → ${APP_DIR}.bak.$TS"
else
  echo "  ℹ️  首次部署，无旧版可备份"
fi

# 3. 解压 + 整包替换
echo "▶ 3/6 整包替换..."
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"
unzip -o /tmp/wotu_final.zip -d /tmp/wotu_extract > /dev/null
cp -r /tmp/wotu_extract/wotu_web/* "$APP_DIR/"
rm -rf /tmp/wotu_extract /tmp/wotu_final.zip
echo "  ✅ $(ls "$APP_DIR" | wc -l) 个文件落盘"

# 4. deploy_server.sh 自动建虚拟环境 + 装依赖 + 迁移
echo "▶ 4/6 环境对齐..."
cd "$APP_DIR"
bash deploy_server.sh
echo "  ✅ 虚拟环境 + 依赖 + DB 迁移"

# 5. 验证关键路由
echo "▶ 5/6 关键路由验证..."
ALL_OK=true
for path in "/" "/register" "/login" "/healthz" "/study"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5001$path" || echo "ERR")
  if [ "$CODE" = "200" ]; then
    echo "  ✅ $path → $CODE"
  else
    echo "  ❌ $path → $CODE"
    ALL_OK=false
  fi
done

# 6. systemd 常驻
echo "▶ 6/6 常驻服务..."
cat > /etc/systemd/system/wotu.service << 'EOF'
[Unit]
Description=Wotu Plan
After=network.target

[Service]
User=root
WorkingDirectory=/root/wotu_app
ExecStart=/root/wotu_app/venv/bin/gunicorn -w 2 -b 127.0.0.1:5001 --timeout 60 app:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload 2>/dev/null && systemctl enable wotu 2>/dev/null && systemctl restart wotu 2>/dev/null

echo ""
if [ "$ALL_OK" = true ]; then
  echo "=============================================="
  echo "  🎉 全部搞定！"
  echo "  公网 https://wotu.fengsheng.tech 现在应该："
  echo "    /            → 沃土计划 landing 页"
  echo "    /register    → 学生报名表单"
  echo "    /login       → 登录页（页脚有公安备案号）"
  echo "    /study       → 学习页（不再 500！）"
  echo "=============================================="
else
  echo "⚠️  有路由没通，看 /tmp/wotu_error.log"
fi
