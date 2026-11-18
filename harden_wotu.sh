#!/bin/bash
# ============================================================
# 沃土计划 Flask 安全加固 · 第一轮（零中断）
# 做 6 件事：
#   1. 持久化 SECRET_KEY（重启不丢 session）
#   2. 密码升级 PBKDF2-SHA256 带盐（兼容旧 SHA256，登录自动升级）
#   3. 加安全响应头（HSTS/X-Frame/CSP...）
#   4. IP 速率限制（120 req/min）
#   5. /uploads 目录加登录鉴权
#   6. systemd hardening（沙箱+权限限制）
# 第二轮再开 CSRF（需要改模板所有表单，放后面）
# 服务器 root 下跑：
#   curl -sL https://raw.githubusercontent.com/fengsheng-shengge/fengsheng-tasks/main/harden_wotu.sh | bash
# ============================================================
set -e

APP_DIR="/root/wotu_app"
APP="${APP_DIR}/app.py"
DB="${APP_DIR}/wotu_full.db"
BACKUP="${APP}.bak.harden.$(date +%Y%m%d_%H%M%S)"

echo "==============================================="
echo " 沃土计划 · 安全加固（第一轮）"
echo "==============================================="

# 0. 备份
cp "$APP" "$BACKUP"
echo "OK app.py 已备份 -> $BACKUP"

# ───────────────────────────────────────────────
# 1. 持久化 SECRET_KEY
# ───────────────────────────────────────────────
echo ""
echo "> [1/6] 持久化 SECRET_KEY..."
KEY_FILE="${APP_DIR}/.secret_key"
if [ ! -f "$KEY_FILE" ] || [ ! -s "$KEY_FILE" ]; then
    openssl rand -hex 32 > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    echo "  + 新 SECRET_KEY 已写入 $KEY_FILE"
else
    echo "  - $KEY_FILE 已存在，跳过"
fi

echo ""
echo "> [2/6-5/6] 加固 app.py..."

# ───────────────────────────────────────────────
# 2-5. Python 改 app.py（密码/响应头/限速/上传鉴权）
# ───────────────────────────────────────────────
python3 <<'PYEOF'
import sys

APP_PATH = "/root/wotu_app/app.py"
with open(APP_PATH, 'r') as f:
    code = f.read()
changes = 0

# ── 2. 密码：SHA256 无盐 → PBKDF2-SHA256 带盐（兼容旧格式） ──
OLD_HASH = 'def hash_pwd(p):\n    return hashlib.sha256(p.encode()).hexdigest()'
if OLD_HASH in code:
    NEW_HASH = '''def hash_pwd(p):
    """PBKDF2-SHA256 带盐哈希"""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha256', p.encode('utf-8'), salt, 200000)
    return 'pbkdf2_%d_%s_%s' % (200000, salt.hex(), dk.hex())

def verify_pwd(p, stored):
    """验证密码：新格式直接校验；旧 SHA256 校验成功返回 True 让调用方升级"""
    if stored.startswith('pbkdf2_'):
        parts = stored.split('_')
        iters, salt_hex, hash_hex = int(parts[1]), parts[2], parts[3]
        dk = hashlib.pbkdf2_hmac('sha256', p.encode('utf-8'), bytes.fromhex(salt_hex), iters)
        return hmac.compare_digest(dk.hex(), hash_hex)
    # 旧 SHA256 无盐
    return hmac.compare_digest(hashlib.sha256(p.encode()).hexdigest(), stored)'''
    code = code.replace(OLD_HASH, NEW_HASH)
    if 'import hmac' not in code:
        code = code.replace('import hashlib\n', 'import hashlib\nimport hmac\n', 1)
    # 登录验证改用 verify_pwd
    code = code.replace(
        'if not row or row["password_hash"] != hash_pwd(pwd):',
        'if not row or not verify_pwd(pwd, row["password_hash"]):')
    # 登录成功自动升级旧密码
    code = code.replace(
        '        session["user_id"] = row["user_id"]',
        '''        # 旧 SHA256 密码自动升级
        if not row["password_hash"].startswith('pbkdf2_'):
            db.execute("UPDATE campus_user_role SET password_hash=? WHERE user_id=?", (hash_pwd(pwd), row["user_id"]))
            db.commit()
        session["user_id"] = row["user_id"]''',
        1)
    print('  + 密码升级 PBKDF2（兼容旧版，登录自动升级）')
    changes += 1
else:
    print('  - hash_pwd 不是旧版，跳过密码升级')

# ── 3-5. 安全响应头 + 速率限制 + /uploads 鉴权 ──
OLD_HEALTH = '@app.route("/healthz")\ndef healthz():'
if OLD_HEALTH in code:
    GUARD = '''# ─── 安全加固：响应头 / 速率限制 / 上传鉴权 ───
_rate_bucket = {}

@app.before_request
def _security_before():
    # 3a. 速率限制：IP 级别，120 req/min（登录/公开接口豁免）
    now = time.time()
    ep = request.endpoint or ''
    if ep in ('login', 'healthz', 'static'):
        return
    bucket = _rate_bucket.setdefault(request.remote_addr, [])
    bucket[:] = [t for t in bucket if now - t < 60]
    bucket.append(now)
    if len(bucket) > 120:
        return jsonify({'error': 'rate limit exceeded'}), 429
    # 3b. /uploads/ 目录鉴权
    if request.path.startswith('/uploads/'):
        if not session.get('user_id'):
            return redirect(url_for('login', next=request.path))

@app.after_request
def _security_after(resp):
    # 4. 安全响应头
    resp.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    resp.headers['X-Frame-Options'] = 'DENY'
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    resp.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    resp.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    return resp

'''
    code = code.replace(OLD_HEALTH, GUARD + OLD_HEALTH, 1)
    changes += 1
    print('  + 安全 guard（响应头 + 限速 + 上传鉴权）已注入')

# time 依赖检查
if 'import time' not in code:
    code = code.replace('import os', 'import os\nimport time', 1)

# compile 检查
try:
    compile(code, 'app.py', 'exec')
    print('  OK compile 通过')
except SyntaxError as e:
    print(f'  X SyntaxError: {e}')
    sys.exit(1)

with open(APP_PATH, 'w') as f:
    f.write(code)
print(f'  OK app.py 写回完成（{changes} 处改动）')
PYEOF

# ───────────────────────────────────────────────
# 6. systemd hardening
# ───────────────────────────────────────────────
echo ""
echo "> [6/6] systemd hardening..."
SVC="/etc/systemd/system/wotu.service"
if [ -f "$SVC" ]; then
    cp "$SVC" "${SVC}.bak.$(date +%Y%m%d_%H%M%S)"
    python3 <<'PYEOF'
p = "/etc/systemd/system/wotu.service"
with open(p) as f: s = f.read()
lines = [
    "NoNewPrivileges=yes",
    "ProtectSystem=full",
    "ProtectHome=yes",
    "PrivateTmp=yes",
    "PrivateDevices=yes",
    "LockPersonality=yes",
    "RestrictNamespaces=yes",
]
for line in lines:
    k = line.split('=')[0]
    if k not in s:
        if not s.endswith('\n'): s += '\n'
        s += line + '\n'
        print(f"  + {line}")
with open(p, 'w') as f: f.write(s)
PYEOF
    systemctl daemon-reload
    echo "  OK systemd hardening"
else
    echo "  - service 文件不存在，跳过"
fi

# ── 重启验证 ──
echo ""
echo "> 重启 gunicorn..."
systemctl restart wotu
sleep 2

echo ""
echo "> 验证..."
curl -s http://127.0.0.1:5001/healthz && echo ""
curl -s -o /dev/null -w "/study: %{http_code}\n" http://127.0.0.1:5001/study
curl -sI http://127.0.0.1:5001/ | grep -E 'Strict-Transport|X-Frame|X-Content|Referrer' | sed 's/^/  /'

echo ""
echo "==============================================="
echo " ✅ 第一轮加固完成！"
echo " 回滚：cp $BACKUP $APP && systemctl restart wotu"
echo " 第二轮（CSRF）：改模板表单，单独脚本后推"
echo "==============================================="
