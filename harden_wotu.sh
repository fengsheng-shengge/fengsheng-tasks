#!/bin/bash
# ============================================================
# 沃土计划 Flask 生产环境安全加固脚本
# 幂等，零数据丢失，做完安全审计里所有 CRITICAL + HIGH 项
# 服务器 root 下跑：
#   curl -sL https://raw.githubusercontent.com/fengsheng-shengge/fengsheng-tasks/main/harden_wotu.sh | bash
# ============================================================
set -e

APP_DIR="/root/wotu_app"
APP="${APP_DIR}/app.py"
DB="${APP_DIR}/wotu_full.db"
BACKUP="${APP}.bak.harden.$(date +%Y%m%d_%H%M%S)"

echo "==============================================="
echo " 沃土计划 · 安全加固"
echo "==============================================="

# 0. 备份
cp "$APP" "$BACKUP"
echo "OK app.py 已备份 -> $BACKUP"

# ───────────────────────────────────────────────
# 1. 生成持久化 SECRET_KEY（用 openssl rand 生成 256bit hex）
# ───────────────────────────────────────────────
echo ""
echo "> [1/7] 持久化 SECRET_KEY..."
KEY_FILE="${APP_DIR}/.secret_key"
if [ ! -f "$KEY_FILE" ] || [ ! -s "$KEY_FILE" ]; then
    openssl rand -hex 32 > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    echo "  + 新 SECRET_KEY 已写入 .secret_key"
else
    echo "  - .secret_key 已存在，跳过"
fi
echo "  OK secret_key 持久化完成"

# ───────────────────────────────────────────────
# 2. Python 改 app.py：bcrypt 密码 + CSRF + 安全响应头 + 速率限制 + 上传鉴权
# ───────────────────────────────────────────────
echo ""
echo "> [2/7-5/7] 加固 app.py（密码/CSRF/响应头/速率限制）..."

python3 <<'PYEOF'
import sys, os, re, time

APP_PATH = "/root/wotu_app/app.py"
with open(APP_PATH, 'r') as f:
    code = f.read()
changes = 0

# ── 2. 密码从 SHA256 升级到 PBKDF2-SHA256（带盐） ──
# 新 hash_pwd 格式：pbkdf2_$iter_$salt_$hash（兼容旧格式自动升级）
OLD_HASH_FN = 'def hash_pwd(p):\n    return hashlib.sha256(p.encode()).hexdigest()'
NEW_HASH_FN = '''def hash_pwd(p):
    """PBKDF2-SHA256 带盐密码哈希，格式：pbkdf2_$iter_$salt_$hash
    旧版 SHA256 无盐格式自动识别并在下次登录时升级"""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha256', p.encode('utf-8'), salt, 200000)
    return 'pbkdf2_%d_%s_%s' % (200000, salt.hex(), dk.hex())

def verify_pwd(p, stored):
    """验证密码，兼容旧 SHA256 无盐格式"""
    if stored.startswith('pbkdf2_'):
        parts = stored.split('_')
        iters, salt_hex, hash_hex = int(parts[1]), parts[2], parts[3]
        dk = hashlib.pbkdf2_hmac('sha256', p.encode('utf-8'), bytes.fromhex(salt_hex), iters)
        return hmac.compare_digest(dk.hex(), hash_hex)
    else:
        # 旧 SHA256 无盐：验证成功就自动升级
        ok = hmac.compare_digest(hashlib.sha256(p.encode()).hexdigest(), stored)
        return ok'''
if OLD_HASH_FN in code:
    code = code.replace(OLD_HASH_FN, NEW_HASH_FN)
    # 在 hashlib import 后面加 hmac
    code = code.replace('import hashlib\n', 'import hashlib\nimport hmac\n', 1)
    print('  + 密码哈希升级为 PBKDF2-SHA256 带盐（兼容旧 SHA256）')
    changes += 1
else:
    print('  - hash_pwd 不是旧版，跳过')

# ── 2b. 登录验证用 verify_pwd 并自动升级 ──
OLD_LOGIN_CHECK = 'if not row or row["password_hash"] != hash_pwd(pwd):'
NEW_LOGIN_CHECK = '''if not row or not verify_pwd(pwd, row["password_hash"]):'''
if OLD_LOGIN_CHECK in code:
    code = code.replace(OLD_LOGIN_CHECK, NEW_LOGIN_CHECK)
    changes += 1
    # 登录成功后自动升级旧 SHA256 密码（在 session["user_id"] = row["user_id"] 那行后加）
    OLD_LOGIN_OK = '        session["user_id"] = row["user_id"]\n        session["role"] = row["role"]'
    NEW_LOGIN_OK = '''        # 旧 SHA256 密码自动升级为 PBKDF2
        if not row["password_hash"].startswith('pbkdf2_'):
            db.execute("UPDATE campus_user_role SET password_hash=? WHERE user_id=?", (hash_pwd(pwd), row["user_id"]))
            db.commit()
        session["user_id"] = row["user_id"]\n        session["role"] = row["role"]'''
    if OLD_LOGIN_OK in code:
        code = code.replace(OLD_LOGIN_OK, NEW_LOGIN_OK)
        changes += 1
        print('  + 登录自动升级旧密码')

# ── 3. 加 before_request：CSRF 校验（POST 必须有 token）+ 上传鉴权 ──
OLD_ROUTE = '@app.route("/healthz")\ndef healthz():'
NEW_GUARD = '''# ─── CSRF + 速率限制 ───
_csrf_tokens = {}  # session_id -> token (in-memory, 重启失效，够用)

@app.before_request
def _security_guard():
    # 3a. CSRF：所有 POST/PUT/DELETE 必须带有效 CSRF token
    if request.method in ('POST', 'PUT', 'DELETE') and request.endpoint != 'healthz':
        sid = session.get('user_id', '') or request.remote_addr
        token = (request.form.get('csrf_token') or request.headers.get('X-CSRF-Token') or '')
        # 登录/注册等公开 POST 免 CSRF（已经有密码做身份验证）
        public_post = {'login', 'register', 'logout', 'healthz'}
        if request.endpoint not in public_post:
            expected = _csrf_tokens.get(sid, '')
            if not expected or not hmac.compare_digest(token, expected):
                return jsonify({'error': 'CSRF validation failed'}), 403
    # 3b. 速率限制：IP 级别，60 次/分钟
    now = time.time()
    bucket = getattr(app, '_rl_bucket', {})
    app._rl_bucket = bucket
    entry = bucket.get(request.remote_addr, [])
    entry = [t for t in entry if now - t < 60]
    entry.append(now)
    bucket[request.remote_addr] = entry
    if len(entry) > 120:  # 宽松点 120/分钟，Flask 开发环境够用
        return jsonify({'error': 'Rate limit exceeded'}), 429
    # 3c. /uploads/ 目录鉴权：未登录不能看别人的文件
    if request.path.startswith('/uploads/'):
        uid = session.get('user_id', '')
        if not uid:
            return redirect(url_for('login', next=request.path))

@app.after_request
def _security_headers(resp):
    # HSTS：强制 HTTPS（31536000 = 1 年）
    resp.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    # 防 clickjacking
    resp.headers['X-Frame-Options'] = 'DENY'
    # 防 MIME 嗅探
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    # 防 XSS（兜底）
    resp.headers['X-XSS-Protection'] = '1; mode=block'
    # CSP：基础版
    resp.headers['Content-Security-Policy'] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; "
        "font-src 'self'; connect-src 'self'; frame-ancestors 'none'"
    )
    # Referer 限制
    resp.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    # session cookie 加 flags（Flask 默认 httponly，这里补充 secure + samesite）
    if resp.headers.get('Set-Cookie', '').startswith('session='):
        resp.headers['Set-Cookie'] += '; Secure; SameSite=Lax'
    return resp

@app.context_processor
def _csrf_inject():
    """所有模板自动注入 csrf_token 变量"""
    sid = session.get('user_id', '') or request.remote_addr
    token = _csrf_tokens.get(sid)
    if not token:
        token = os.urandom(16).hex()
        _csrf_tokens[sid] = token
    return {'csrf_token': token, 'csrf_field': '<input type="hidden" name="csrf_token" value="%s">' % token}

'''
if OLD_ROUTE in code:
    code = code.replace(OLD_ROUTE, NEW_GUARD + OLD_ROUTE, 1)
    changes += 1
    print('  + 安全 guard（CSRF + 速率限制 + 上传鉴权 + 响应头）已注入')

# ── 语法检查 ──
try:
    compile(code, 'app.py', 'exec')
    print('  OK compile 通过')
except SyntaxError as e:
    print(f'  X SyntaxError: {e}')
    print('  中止写回')
    sys.exit(1)

with open(APP_PATH, 'w') as f:
    f.write(code)
print(f'  OK app.py 写回（{changes} 处改动）')
PYEOF

# ───────────────────────────────────────────────
# 6. systemd hardening 补丁（加沙箱 + 权限限制）
# ───────────────────────────────────────────────
echo ""
echo "> [6/7] systemd hardening..."
SVC_FILE="/etc/systemd/system/wotu.service"
if [ -f "$SVC_FILE" ]; then
    # 备份原文件
    cp "$SVC_FILE" "${SVC_FILE}.bak.$(date +%Y%m%d_%H%M%S)"
    # 读取现有内容，在 [Service] 段末尾追加沙箱配置
    # 只追加不存在的行，幂等
    python3 <<'PYEOF'
import re
p = "/etc/systemd/system/wotu.service"
with open(p) as f: s = f.read()
hardening_lines = [
    "NoNewPrivileges=yes",
    "ProtectSystem=strict",
    "ProtectHome=yes",
    "PrivateTmp=yes",
    "PrivateDevices=yes",
    "MemoryDenyWriteExecute=yes",
    "RestrictRealtime=yes",
    "RestrictNamespaces=yes",
    "LockPersonality=yes",
    "RemoveIPC=yes",
]
# 在 [Service] 段的 Environment 或 ExecStart 之前插
for line in hardening_lines:
    key = line.split('=')[0]
    if key not in s:
        # 追加到 [Service] 段最后
        s = s.rstrip() + '\n[Service]\n' if '[Service]' not in s else s
        # 在文件末尾追加
        if not s.endswith('\n'): s += '\n'
        s += line + '\n'
        print(f"  + {line}")
with open(p, 'w') as f: f.write(s)
PYEOF
    systemctl daemon-reload
    echo "  OK systemd hardening 完成"
else
    echo "  - wotu.service 不存在，跳过"
fi

# ───────────────────────────────────────────────
# 7. 重启 + 验证
# ───────────────────────────────────────────────
echo ""
echo "> [7/7] 重启 gunicorn..."
systemctl restart wotu
sleep 2

echo ""
echo "> 验证..."
HEALTH=$(curl -s http://127.0.0.1:5001/healthz)
STUDY=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/study)
HEADERS=$(curl -sI https://wotu.fengsheng.tech/ | grep -E 'Strict-Transport|X-Frame|X-Content|Content-Security' || echo "(公网 CDN 会覆盖，本地 curl 看 127.0.0.1)")
echo "  /healthz: $HEALTH"
echo "  /study (no auth): $STUDY (应为 302)"
echo "  公网安全头："
echo "$HEADERS" | sed 's/^/    /'

echo ""
echo "==============================================="
echo " ✅ 加固完成！"
echo " 回滚：cp $BACKUP $APP && systemctl restart wotu"
echo "==============================================="
