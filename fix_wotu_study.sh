#!/bin/bash
# ============================================================
# 沃土计划 · /study 500 一键修复脚本
# 根因：course_material 表从来没被任何迁移脚本创建过
#       study_activity 虽在 migrate_v18 里，但保险起见一并补
# 用法：在服务器（Ubuntu 20.04）上，root 下执行：
#       bash fix_wotu_study.sh
# 或者一行命令：
#       curl -sL https://cdn.jsdelivr.net/gh/fengsheng-shengge/fengsheng-tasks@main/fix_wotu_study.sh | bash
# ============================================================
set -e

APP_DIR="/root/wotu_app"
DB="${APP_DIR}/wotu_full.db"

echo "==============================================="
echo " 沃土计划 · /study 500 修复"
echo "==============================================="

# 1. 确认路径
if [ ! -d "$APP_DIR" ]; then
    echo "❌ 找不到 $APP_DIR，请确认部署目录"
    exit 1
fi
if [ ! -f "$DB" ]; then
    DB=$(find "$APP_DIR" -maxdepth 2 -name "*.db" -o -name "*.sqlite" 2>/dev/null | head -1)
    if [ -z "$DB" ]; then
        echo "❌ 找不到数据库文件"
        exit 1
    fi
fi
echo "✅ 数据库: $DB"

# 2. 备份
BACKUP="${DB}.bak.$(date +%Y%m%d_%H%M%S)"
cp "$DB" "$BACKUP"
echo "✅ 已备份 → $BACKUP"

# 3. Python 一键补表
python3 <<PYEOF
import sqlite3, sys
conn = sqlite3.connect("${DB}")
cur = conn.cursor()

def check_and_create(name, ddl):
    rows = cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchall()
    if rows:
        print(f"  ⏭ {name} 已存在")
    else:
        cur.execute(ddl)
        print(f"  ✅ {name} 已创建")

print("\n▶ 补建缺失表：")

# —— /study 路由必需的两张表 ——
check_and_create("course_material", """
CREATE TABLE IF NOT EXISTS course_material (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day INTEGER,
    title TEXT,
    description TEXT,
    file_path TEXT,
    file_type TEXT,
    uploaded_by TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
)""")

check_and_create("study_activity", """
CREATE TABLE IF NOT EXISTS study_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sid TEXT,
    act_type TEXT,
    detail TEXT,
    created_at TEXT
)""")

# —— 旧版 app.py (3057行) 引用的其他表 ——
extra_tables = [
    ("campus_user_role", """CREATE TABLE IF NOT EXISTS campus_user_role (
        user_id TEXT PRIMARY KEY, role TEXT, display_name TEXT,
        password_hash TEXT, managed_class_ids TEXT, status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now','localtime')))"""),
    ("campus_student", """CREATE TABLE IF NOT EXISTS campus_student (
        sid TEXT PRIMARY KEY, name TEXT, class_id TEXT, mentor_id TEXT,
        student_status TEXT DEFAULT '在读', school TEXT, major TEXT,
        phone TEXT, wechat TEXT, gender TEXT, enroll_date TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime')))"""),
    ("practice_submission", """CREATE TABLE IF NOT EXISTS practice_submission (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, day INTEGER,
        deliverable_index INTEGER, content TEXT, attachment_path TEXT,
        original_flg INTEGER DEFAULT 0, created_at TEXT)"""),
    ("practice_review", """CREATE TABLE IF NOT EXISTS practice_review (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, day INTEGER,
        score REAL, comment TEXT, reviewer TEXT, reviewed_at TEXT)"""),
    ("campus_quiz_result", """CREATE TABLE IF NOT EXISTS campus_quiz_result (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, quiz_group TEXT,
        score REAL DEFAULT 0, total INTEGER DEFAULT 0, correct INTEGER DEFAULT 0,
        detail TEXT, created_at TEXT)"""),
    ("campus_exam_submit", """CREATE TABLE IF NOT EXISTS campus_exam_submit (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, m1_score REAL,
        m2_score REAL, m3_score REAL, m2_content TEXT, m2_attachment TEXT,
        m2_feedback TEXT, m3_answer TEXT, created_at TEXT)"""),
    ("campus_cert_result", """CREATE TABLE IF NOT EXISTS campus_cert_result (
        cert_id TEXT PRIMARY KEY, sid TEXT, total_score REAL, grade TEXT,
        m1_score REAL, m2_score REAL, m3_score REAL, m4_score REAL, will_score REAL,
        is_pass INTEGER DEFAULT 0, cert_no TEXT, is_valid INTEGER DEFAULT 1,
        issued_at TEXT, result_version TEXT DEFAULT 'v1')"""),
    ("quiz_bank_choice", """CREATE TABLE IF NOT EXISTS quiz_bank_choice (
        paper_id TEXT, q_no INTEGER, question TEXT, q_type TEXT, options TEXT,
        answer TEXT, explanation TEXT, PRIMARY KEY (paper_id, q_no))"""),
    ("exam_config", """CREATE TABLE IF NOT EXISTS exam_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT, active_paper TEXT,
        is_open INTEGER DEFAULT 0, updated_at TEXT)"""),
    ("system_config", """CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY, value TEXT)"""),
    ("class_schedule", """CREATE TABLE IF NOT EXISTS class_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT, class_id TEXT, day INTEGER,
        time_slot TEXT, title TEXT, content TEXT, instructor TEXT)"""),
    ("announcement", """CREATE TABLE IF NOT EXISTS announcement (
        id INTEGER PRIMARY KEY AUTOINCREMENT, class_id TEXT, title TEXT,
        content TEXT, publisher TEXT, created_at TEXT)"""),
    ("instructor", """CREATE TABLE IF NOT EXISTS instructor (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT,
        phone TEXT, module TEXT, expertise TEXT, responsibilities TEXT,
        file_path TEXT, status TEXT DEFAULT 'active', bio TEXT)"""),
    ("expert_review", """CREATE TABLE IF NOT EXISTS expert_review (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, practical_score REAL,
        practical_comment TEXT, scenario_score REAL, scenario_comment TEXT,
        empathy_score REAL, adapt_score REAL, express_score REAL, service_score REAL,
        overall_comment TEXT, reviewer TEXT, created_at TEXT)"""),
    ("alumni", """CREATE TABLE IF NOT EXISTS alumni (
        sid TEXT PRIMARY KEY, graduation_year TEXT, current_company TEXT,
        current_position TEXT, phone TEXT, wechat TEXT,
        status TEXT DEFAULT 'employed')"""),
    ("alumni_performance", """CREATE TABLE IF NOT EXISTS alumni_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, company TEXT, position TEXT,
        performance_score REAL, performance_comment TEXT, review_date TEXT,
        role_type TEXT)"""),
    ("mentor_profile", """CREATE TABLE IF NOT EXISTS mentor_profile (
        mentor_id TEXT PRIMARY KEY, name TEXT, role TEXT, expertise TEXT,
        company TEXT, phone TEXT, wechat TEXT, bio TEXT)"""),
    ("mentorship", """CREATE TABLE IF NOT EXISTS mentorship (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, mentor_id TEXT,
        start_date TEXT, status TEXT DEFAULT 'active')"""),
    ("showcase_work", """CREATE TABLE IF NOT EXISTS showcase_work (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, title TEXT, description TEXT,
        file_path TEXT, work_type TEXT, created_at TEXT,
        category TEXT, recommend_reason TEXT, publish INTEGER DEFAULT 0,
        recommended_at TEXT)"""),
    ("points_record", """CREATE TABLE IF NOT EXISTS points_record (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL,
        day_no INTEGER DEFAULT 0, action_type TEXT, points INTEGER,
        reason TEXT, created_by TEXT, created_at TEXT)"""),
    ("supervision_log", """CREATE TABLE IF NOT EXISTS supervision_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL,
        day_no INTEGER, content TEXT, status TEXT DEFAULT 'pending',
        created_by TEXT, created_at TEXT)"""),
    ("excellent_nomination", """CREATE TABLE IF NOT EXISTS excellent_nomination (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL,
        round_name TEXT, reason TEXT, points_total INTEGER DEFAULT 0,
        task_done INTEGER DEFAULT 0, avg_score REAL DEFAULT 0,
        status TEXT DEFAULT 'nominated', created_by TEXT, created_at TEXT,
        UNIQUE(sid, round_name))"""),
]

print("\n▶ 检查旧版 app.py 可能引用的其他表：")
for name, ddl in extra_tables:
    check_and_create(name, ddl)

conn.commit()
print(f"\n✅ 所有缺失表已处理完毕，共 {len([r for r in cur.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'\")])} 张表")
conn.close()
PYEOF

# 4. 重启服务
echo ""
echo "▶ 重启 gunicorn..."
if systemctl is-active --quiet wotu 2>/dev/null; then
    systemctl restart wotu
    echo "✅ systemctl restart wotu 成功"
else
    # 兜底：杀进程 + 直接启动
    pkill -f "gunicorn.*app:app" 2>/dev/null || true
    sleep 1
    cd "$APP_DIR" && nohup gunicorn -w 2 -b 127.0.0.1:5001 --timeout 60 app:app > /tmp/wotu_restart.log 2>&1 &
    sleep 3
    echo "✅ 已直接启动 gunicorn"
fi

# 5. 验证
echo ""
echo "▶ 本地验证路由..."
sleep 2
FAIL=0
for path in /healthz /login /study /dashboard /practice /quizzes /exam; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5001${path}" 2>/dev/null || echo "000")
    if [ "$CODE" = "500" ]; then
        echo "  ❌ $path → $CODE (Internal Server Error)"
        FAIL=1
    elif [ "$CODE" = "000" ]; then
        echo "  ⚠️  $path → 连不上（服务可能还没起来）"
    else
        echo "  ✅ $path → $CODE"
    fi
done

echo ""
if [ $FAIL -eq 0 ]; then
    echo "==============================================="
    echo " ✅ 修复完成！/study 现在应该能正常打开了"
    echo " 浏览器验证：https://wotu.fengsheng.tech/study"
    echo "==============================================="
else
    echo "==============================================="
    echo " ⚠️  有路由还在 500"
    echo " 服务器上跑：tail -100 /tmp/wotu_restart.log"
    echo " 把日志贴过来我帮你分析"
    echo "==============================================="
fi
