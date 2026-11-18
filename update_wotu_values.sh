#!/bin/bash
# ============================================================
# 沃土计划 · 贝壳新价值观一键更新（安全版 v2）
# 做 3 件事：
#   1. 替换 app.py 里 Day1 的旧价值观文字（Python 安全替换 + compile 验证）
#   2. 更新 DB 里 P001 题库（价值观题）
#   3. 重启 gunicorn + curl 验证
# 绝不碰 sed！
# ============================================================
set -e

APP_DIR="/root/wotu_app"
APP="${APP_DIR}/app.py"
DB="${APP_DIR}/wotu_full.db"

echo "==============================================="
echo " 贝壳新价值观 · 一键更新"
echo "==============================================="

# 1. 备份
BAK="${APP}.bak.$(date +%Y%m%d_%H%M%S)"
cp "$APP" "$BAK"
echo "OK app.py 已备份 -> $BAK"

# 2. Python 安全替换 + 语法验证
echo ""
echo "> Python 替换 Day1 旧价值观文字..."

python3 <<'PYEOF'
import sys, time, json, sqlite3

APP_PATH = "/root/wotu_app/app.py"
DB_PATH = "/root/wotu_app/wotu_full.db"

# --- 读 app.py ---
with open(APP_PATH, 'r') as f:
    code = f.read()

changed = 0

# --- 替换 1：Day1 steps[0] ---
OLD1 = '"阅读贝壳价值观四条：客户至上、诚实可信、合作共赢、拼搏进取"'
if OLD1 in code:
    NEW1 = (
        '"学习贝壳使命与愿景：有尊严的服务者·更美好的居住 / 以专业·陪伴家的每一程",\n'
        '            "理解新价值观四条：坚持做难而正确的事、以消费者为中心、让专业的服务者赢、并肩奋斗彼此成就",\n'
        '            "体会精神气质：真实·坦荡·坚韧·乐观"'
    )
    code = code.replace(OLD1, NEW1)
    print("  + Day1 steps[0] 已替换")
    changed += 1
else:
    print("  - Day1 steps[0] 跳过（旧文字不存在）")

# --- 替换 2：Day1 study 字段 ---
OLD2 = '贝壳价值观：客户至上、诚实可信、合作共赢、拼搏进取。'
if OLD2 in code:
    NEW2 = (
        '贝壳使命：有尊严的服务者·更美好的居住；'
        '愿景：以专业·陪伴家的每一程；'
        '新价值观四条：坚持做难而正确的事、以消费者为中心、让专业的服务者赢、并肩奋斗彼此成就；'
        '精神气质：真实·坦荡·坚韧·乐观。'
    )
    code = code.replace(OLD2, NEW2)
    print("  + Day1 study 字段已替换")
    changed += 1
else:
    print("  - Day1 study 字段跳过（旧文字不存在）")

# --- 语法验证 ---
try:
    compile(code, 'app.py', 'exec')
    print("  OK Python 语法验证通过")
except SyntaxError as e:
    print(f"  X Python 语法炸了！{e}")
    print("  已中止，不会写回 app.py")
    sys.exit(1)

# --- 写回 ---
if changed > 0:
    with open(APP_PATH, 'w') as f:
        f.write(code)
    print(f"  OK app.py 写回成功（改了 {changed} 处）")
else:
    print("  ! 没找到要替换的旧文字，app.py 没动")

# --- 更新 DB 题库 ---
print("")
print("> 更新 P001 题库（新价值观题）...")
db = sqlite3.connect(DB_PATH)
c = db.cursor()

old = c.execute("SELECT COUNT(*) FROM quiz_bank_choice WHERE paper_id='P001'").fetchone()[0]
if old > 0:
    c.execute("DELETE FROM quiz_bank_choice WHERE paper_id='P001'")
    print(f"  - 清掉旧 P001 题 {old} 道")

QUESTIONS = [
    (1, "贝壳新使命保持不变：有尊严的服务者，更美好的居住。",
     "judge", "[]", "A", "使命是初心原点，不设期限，保持不变。"),
    (2, "贝壳新愿景是以专业，陪伴家的每一程。",
     "judge", "[]", "A", "新愿景取代旧版服务3亿家庭的品质居住平台。成交只是一天，家是一辈子。"),
    (3, "下列哪一项不属于贝壳新的四条核心价值观？",
     "single",
     json.dumps(["A. 坚持做难而正确的事", "B. 以消费者为中心", "C. 客户至上", "D. 让专业的服务者赢"]),
     "C", "客户至上是旧版价值观，新版第一条是以消费者为中心。"),
    (4, "坚持做难而正确的事——正确是选择的唯一理由，难是愿意为此承担短期代价。",
     "judge", "[]", "A", "新价值观第一条。我们选择做正确的事，并为长期价值付出耐心。"),
    (5, "贝壳新的精神气质是哪四个词？",
     "single",
     json.dumps(["A. 真实 坦荡 坚韧 乐观", "B. 诚实 靠谱 拼搏 合作",
                 "C. 专业 用心 创新 务实", "D. 温暖 感恩 开放 进取"]),
     "A", "25 周年新增精神气质：真实→坦荡→坚韧→乐观，四道循环精进的功夫。"),
]

for qno, q, qtype, opts, ans, expl in QUESTIONS:
    c.execute("INSERT INTO quiz_bank_choice (paper_id,q_no,question,q_type,options,answer,explanation) VALUES (?,?,?,?,?,?,?)",
              ("P001", qno, q, qtype, opts, ans, expl))

db.commit()
cnt = c.execute("SELECT COUNT(*) FROM quiz_bank_choice WHERE paper_id='P001'").fetchone()[0]
print(f"  + P001 新价值观题 {cnt} 道已写入 DB")
db.close()
PYEOF

# 3. 重启 + 验证
echo ""
echo "> 重启 gunicorn..."
systemctl restart wotu
sleep 2

echo ""
echo "> 验证..."
curl -s http://127.0.0.1:5001/healthz && echo ""
curl -s -o /dev/null -w "/study: %{http_code}\n" http://127.0.0.1:5001/study

echo ""
echo "==============================================="
echo " OK 完成！浏览器验证："
echo " https://wotu.fengsheng.tech/study"
echo " Day1 卡片 -> 学习内容应该显示新使命/新愿景/新价值观"
echo "==============================================="
