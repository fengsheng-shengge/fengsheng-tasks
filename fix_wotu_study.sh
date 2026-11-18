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
    echo "找不到 $APP_DIR，请确认部署目录"
    exit 1
fi
if [ ! -f "$DB" ]; then
    DB=$(find "$APP_DIR" -maxdepth 2 -name "*.db" -o -name "*.sqlite" 2>/dev/null | head -1)
    if [ -z "$DB" ]; then
        echo "找不到数据库文件"
        exit 1
    fi
fi
echo "OK 数据库: $DB"

# 2. 备份
BACKUP="${DB}.bak.$(date +%Y%m%d_%H%M%S)"
cp "$DB" "$BACKUP"
echo "OK 已备份 -> $BACKUP"

# 3. Python 一键补表（heredoc 用 'PYEOF' 单引号包裹防变量展开）
python3 <<'PYEOF'
import sqlite3, os, sys

db_path = "/root/wotu_app/wotu_full.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

def has_table(name):
    r = cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone()
    return r is not None

def ensure(name, sql):
    if has_table(name):
        print("  - %s 已存在" % name)
    else:
        cur.execute(sql)
        print("  + %s 已创建" % name)

print("")
print("> 补建缺失表：")

# ===== /study 路由必需的两张表 =====
ensure("course_material", "CREATE TABLE IF NOT EXISTS course_material ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
    "day INTEGER, title TEXT, description TEXT, file_path TEXT, "
    "file_type TEXT, uploaded_by TEXT, "
    "created_at TEXT DEFAULT (datetime('now','localtime')))")

ensure("study_activity", "CREATE TABLE IF NOT EXISTS study_activity ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
    "sid TEXT, act_type TEXT, detail TEXT, created_at TEXT)")

# ===== 旧版 app.py (3057行) 引用的其他表 =====
ensure("campus_user_role", "CREATE TABLE IF NOT EXISTS campus_user_role ("
    "user_id TEXT PRIMARY KEY, role TEXT, display_name TEXT, "
    "password_hash TEXT, managed_class_ids TEXT, status TEXT DEFAULT 'active', "
    "created_at TEXT DEFAULT (datetime('now','localtime')))")

ensure("campus_student", "CREATE TABLE IF NOT EXISTS campus_student ("
    "sid TEXT PRIMARY KEY, name TEXT, class_id TEXT, mentor_id TEXT, "
    "student_status TEXT DEFAULT '在读', school TEXT, major TEXT, "
    "phone TEXT, wechat TEXT, gender TEXT, enroll_date TEXT, "
    "created_at TEXT DEFAULT (datetime('now','localtime')))")

ensure("campus_batch", "CREATE TABLE IF NOT EXISTS campus_batch ("
    "batch_id TEXT PRIMARY KEY, batch_name TEXT, year TEXT, season TEXT, "
    "start_date TEXT, end_date TEXT, status TEXT DEFAULT '筹备')")

ensure("campus_class", "CREATE TABLE IF NOT EXISTS campus_class ("
    "class_id TEXT PRIMARY KEY, class_name TEXT, batch_id TEXT, "
    "teacher_id TEXT, start_date TEXT, end_date TEXT, status TEXT DEFAULT '进行中')")

ensure("campus_cert_result", "CREATE TABLE IF NOT EXISTS campus_cert_result ("
    "cert_id TEXT PRIMARY KEY, sid TEXT, total_score REAL, grade TEXT, "
    "m1_score REAL, m2_score REAL, m3_score REAL, m4_score REAL, will_score REAL, "
    "is_pass INTEGER DEFAULT 0, cert_no TEXT, is_valid INTEGER DEFAULT 1, "
    "issued_at TEXT, result_version TEXT DEFAULT 'v1')")

ensure("campus_exam_submit", "CREATE TABLE IF NOT EXISTS campus_exam_submit ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, m1_score REAL, "
    "m2_score REAL, m3_score REAL, m2_content TEXT, m2_attachment TEXT, "
    "m2_feedback TEXT, m3_answer TEXT, created_at TEXT)")

ensure("campus_quiz_result", "CREATE TABLE IF NOT EXISTS campus_quiz_result ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, quiz_group TEXT, "
    "score REAL DEFAULT 0, total INTEGER DEFAULT 0, correct INTEGER DEFAULT 0, "
    "detail TEXT, created_at TEXT)")

ensure("campus_appeal", "CREATE TABLE IF NOT EXISTS campus_appeal ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, cert_id TEXT, "
    "appeal_type TEXT, reason TEXT, evidence TEXT, status TEXT DEFAULT 'pending', "
    "reviewer TEXT, review_result TEXT, reviewed_at TEXT, created_at TEXT)")

ensure("campus_task", "CREATE TABLE IF NOT EXISTS campus_task ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, task_type TEXT, task_name TEXT, "
    "description TEXT, priority TEXT, status TEXT DEFAULT 'pending', "
    "assigned_to TEXT, created_at TEXT)")

ensure("campus_audit_log", "CREATE TABLE IF NOT EXISTS campus_audit_log ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT, "
    "target_type TEXT, target_id TEXT, detail TEXT, ip_address TEXT, created_at TEXT)")

ensure("campus_risk_action", "CREATE TABLE IF NOT EXISTS campus_risk_action ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, risk_type TEXT, risk_level TEXT, "
    "description TEXT, action_taken TEXT, handler TEXT, created_at TEXT)")

ensure("practice_submission", "CREATE TABLE IF NOT EXISTS practice_submission ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, day INTEGER, "
    "deliverable_index INTEGER, content TEXT, attachment_path TEXT, "
    "original_flg INTEGER DEFAULT 0, created_at TEXT)")

ensure("practice_review", "CREATE TABLE IF NOT EXISTS practice_review ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, day INTEGER, "
    "score REAL, comment TEXT, reviewer TEXT, reviewed_at TEXT)")

ensure("quiz_bank_choice", "CREATE TABLE IF NOT EXISTS quiz_bank_choice ("
    "paper_id TEXT, q_no INTEGER, question TEXT, q_type TEXT, options TEXT, "
    "answer TEXT, explanation TEXT, PRIMARY KEY (paper_id, q_no))")

ensure("quiz_choice_detail", "CREATE TABLE IF NOT EXISTS quiz_choice_detail ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, paper_id TEXT, q_no INTEGER, "
    "choice_index TEXT, choice_text TEXT, is_correct INTEGER DEFAULT 0)")

ensure("exam_config", "CREATE TABLE IF NOT EXISTS exam_config ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, active_paper TEXT, "
    "is_open INTEGER DEFAULT 0, updated_at TEXT)")

ensure("system_config", "CREATE TABLE IF NOT EXISTS system_config ("
    "key TEXT PRIMARY KEY, value TEXT)")

ensure("class_schedule", "CREATE TABLE IF NOT EXISTS class_schedule ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, class_id TEXT, day INTEGER, "
    "time_slot TEXT, title TEXT, content TEXT, instructor TEXT)")

ensure("announcement", "CREATE TABLE IF NOT EXISTS announcement ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, class_id TEXT, title TEXT, "
    "content TEXT, publisher TEXT, created_at TEXT)")

ensure("instructor", "CREATE TABLE IF NOT EXISTS instructor ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, role TEXT, "
    "phone TEXT, module TEXT, expertise TEXT, responsibilities TEXT, "
    "file_path TEXT, status TEXT DEFAULT 'active', bio TEXT)")

ensure("mentor_profile", "CREATE TABLE IF NOT EXISTS mentor_profile ("
    "mentor_id TEXT PRIMARY KEY, name TEXT, role TEXT, expertise TEXT, "
    "company TEXT, phone TEXT, wechat TEXT, bio TEXT)")

ensure("mentorship", "CREATE TABLE IF NOT EXISTS mentorship ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, mentor_id TEXT, "
    "start_date TEXT, status TEXT DEFAULT 'active')")

ensure("expert_review", "CREATE TABLE IF NOT EXISTS expert_review ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, practical_score REAL, "
    "practical_comment TEXT, scenario_score REAL, scenario_comment TEXT, "
    "empathy_score REAL, adapt_score REAL, express_score REAL, service_score REAL, "
    "overall_comment TEXT, reviewer TEXT, created_at TEXT)")

ensure("soft_skill_rubric", "CREATE TABLE IF NOT EXISTS soft_skill_rubric ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, skill_name TEXT, level TEXT, "
    "criteria TEXT, score_range TEXT, created_at TEXT)")

ensure("soft_review_score", "CREATE TABLE IF NOT EXISTS soft_review_score ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, reviewer TEXT, "
    "empathy_score REAL, adapt_score REAL, express_score REAL, "
    "service_score REAL, overall_score REAL, comment TEXT, created_at TEXT)")

ensure("phase_evidence", "CREATE TABLE IF NOT EXISTS phase_evidence ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, phase TEXT, "
    "evidence_type TEXT, content TEXT, file_path TEXT, created_at TEXT)")

ensure("scenario_stress_bank", "CREATE TABLE IF NOT EXISTS scenario_stress_bank ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, scenario_id TEXT, level TEXT, "
    "stimulus TEXT, expected_response TEXT, tips TEXT)")

ensure("scenario_attempts", "CREATE TABLE IF NOT EXISTS scenario_attempts ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, scenario_id TEXT, "
    "attempt_no INTEGER, response TEXT, score REAL, feedback TEXT, created_at TEXT)")

ensure("alumni", "CREATE TABLE IF NOT EXISTS alumni ("
    "sid TEXT PRIMARY KEY, graduation_year TEXT, current_company TEXT, "
    "current_position TEXT, phone TEXT, wechat TEXT, status TEXT DEFAULT 'employed')")

ensure("alumni_performance", "CREATE TABLE IF NOT EXISTS alumni_performance ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, company TEXT, position TEXT, "
    "performance_score REAL, performance_comment TEXT, review_date TEXT, role_type TEXT)")

ensure("showcase_work", "CREATE TABLE IF NOT EXISTS showcase_work ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, title TEXT, description TEXT, "
    "file_path TEXT, work_type TEXT, created_at TEXT, "
    "category TEXT, recommend_reason TEXT, publish INTEGER DEFAULT 0, recommended_at TEXT)")

ensure("points_record", "CREATE TABLE IF NOT EXISTS points_record ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL, "
    "day_no INTEGER DEFAULT 0, action_type TEXT, points INTEGER, "
    "reason TEXT, created_by TEXT, created_at TEXT)")

ensure("supervision_log", "CREATE TABLE IF NOT EXISTS supervision_log ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL, "
    "day_no INTEGER, content TEXT, status TEXT DEFAULT 'pending', "
    "created_by TEXT, created_at TEXT)")

ensure("excellent_nomination", "CREATE TABLE IF NOT EXISTS excellent_nomination ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL, "
    "round_name TEXT, reason TEXT, points_total INTEGER DEFAULT 0, "
    "task_done INTEGER DEFAULT 0, avg_score REAL DEFAULT 0, "
    "status TEXT DEFAULT 'nominated', created_by TEXT, created_at TEXT, "
    "UNIQUE(sid, round_name))")

ensure("monthly_followup", "CREATE TABLE IF NOT EXISTS monthly_followup ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, followup_date TEXT, "
    "content TEXT, next_plan TEXT, created_by TEXT, created_at TEXT)")

ensure("onboard_skill", "CREATE TABLE IF NOT EXISTS onboard_skill ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT, skill_name TEXT, "
    "level TEXT, evidence TEXT, verified_by TEXT, created_at TEXT)")

conn.commit()

# 最终统计
all_names = []
for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'"):
    if not r[0].startswith("sqlite_"):
        all_names.append(r[0])
print("")
print("OK 全部完成，共 %d 张表" % len(all_names))
print("  course_material=%s study_activity=%s campus_user_role=%s" % (
    has_table("course_material"), has_table("study_activity"), has_table("campus_user_role")))

conn.close()
PYEOF

# 4. 重启服务
echo ""
echo "> 重启 gunicorn..."
if systemctl is-active --quiet wotu 2>/dev/null; then
    systemctl restart wotu
    echo "OK systemctl restart wotu"
else
    pkill -f "gunicorn.*app:app" 2>/dev/null || true
    sleep 1
    cd "$APP_DIR" && nohup gunicorn -w 2 -b 127.0.0.1:5001 --timeout 60 app:app > /tmp/wotu_restart.log 2>&1 &
    sleep 3
    echo "OK 已直接启动 gunicorn"
fi

# 5. 验证
echo ""
echo "> 本地验证路由..."
sleep 2
FAIL=0
for path in /healthz /login /study /dashboard /practice /quizzes /exam; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5001${path}" 2>/dev/null || echo "000")
    if [ "$CODE" = "500" ]; then
        echo "  X $path -> $CODE (Internal Server Error)"
        FAIL=1
    elif [ "$CODE" = "000" ]; then
        echo "  ! $path -> 连不上（服务可能还没起来）"
    else
        echo "  OK $path -> $CODE"
    fi
done

echo ""
if [ $FAIL -eq 0 ]; then
    echo "==============================================="
    echo " OK 修复完成！"
    echo " 浏览器验证: https://wotu.fengsheng.tech/study"
    echo "==============================================="
else
    echo "==============================================="
    echo " ! 有路由还在 500"
    echo " 运行: tail -100 /tmp/wotu_restart.log"
    echo " 把日志贴过来我帮你分析"
    echo "==============================================="
fi
