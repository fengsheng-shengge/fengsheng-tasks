#!/usr/bin/env python3
"""
词条自动化校验脚本 - 7.31冲刺生产质量守门

校验6项规则：
1. 字段完整性：标准层必填字段全部存在且非空；深度层额外字段仅toolType非空时检查
2. 字数校验：oneLineAnswer ≤ 30字，corePoint每条 ≤ 20字，def 80-200字
3. 重复检测：name不重复，alias内不重复，不同词条alias不交叉重复
4. 法条格式（按entryType区分）：
   - LAW：legalRef须含"第X条"
   - POL：legalRef非空即可（政策文号引用）
   - STD：legalRef须含标准号或"第X条"
   - 其他：legalRef非空即可
5. 别名唯一性：每个词条alias至少5个，且不与其他词条name或alias重复
6. severity一致性：hard词条必须有legalRef且含具体引用（条文号/文号/标准号均可）

参数：
  sys.argv[1]  entries_path  词条JSON文件路径
  sys.argv[2]  result_mode   display_only / notify / auto
"""

import asyncio
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime

from codeact_sdk import CodeActSDK

# ── Schema Versions ──
TOOL_SCHEMA_VERSIONS = {
    "codeact_search_web": "v1_5ac1b0eba8c26f2a",
    "codeact_fetch_web": "v1_2c8d0580b3f93a58",
    "file_to_url": "v1_fe3416acf3d7b53b",
}

# ── 标准层必填字段 ──
STANDARD_REQUIRED = [
    "id", "domain", "subScene", "name", "alias", "def", "corePoint",
    "legalRef", "consumerQ", "oneLineAnswer", "consumerBenefit",
    "severity", "lastVerified", "relatedEntries", "source",
    "entryType", "sceneDomain", "priority", "dataSource",
]

# ── 深度层额外字段 ──
DEEP_REQUIRED = [
    "brokerNote", "posSpeech", "negSpeech", "caseIds",
    "toolType", "lawLayer", "sceneId",
]

# ── 兼容映射：旧字段名 → 新字段名 ──
FIELD_ALIAS_MAP = {
    "simpleAnswer": "oneLineAnswer",
    "legalSources": "legalRef",
}

# ── 法条号正则 ──
ARTICLE_PATTERN = re.compile(r"第[一二三四五六七八九十百千零\d]+条")

# ── 文号正则（如 银发〔2024〕号、国发〔2023〕X号、〔2024〕X号） ──
DOCNO_PATTERN = re.compile(r"[〔\[]\d{4}[〕\]]")

# ── 标准号正则（如 GB50096-2011、JGJ130-2011、CJJ/T15-2021） ──
STDNO_PATTERN = re.compile(r"[A-Z]{2,4}[/T]?\d+-\d{4}")

# ── 中文分词：用于计算字数（去除标点空格） ──
def count_chinese_chars(text: str) -> int:
    """计算中文字数：中文每个字计1，英文单词计1，数字连续计1"""
    if not text:
        return 0
    # 简化方案：去除空格和标点后的字符数（近似中文字数）
    cleaned = re.sub(r'[\s]', '', text)
    # 去除常见标点
    cleaned = re.sub(r'[，。、；：""''！？《》【】（）·…—\-,.;:!?\'"()\[\]{}]', '', cleaned)
    return len(cleaned)


def normalize_alias(alias_val) -> list[str]:
    """将 alias 字段归一化为列表。支持字符串（顿号分隔）和数组两种格式。"""
    if alias_val is None:
        return []
    if isinstance(alias_val, list):
        return [str(a).strip() for a in alias_val if str(a).strip()]
    if isinstance(alias_val, str):
        # 支持顿号、逗号、中文逗号分隔
        parts = re.split(r'[、，,]', alias_val)
        return [p.strip() for p in parts if p.strip()]
    return []


def resolve_field(entry: dict, field_name: str):
    """
    解析字段值，支持兼容映射。
    优先取新字段名，若不存在则尝试旧字段名。
    """
    if field_name in entry:
        return entry[field_name]
    # 反向查找：如果请求的是 oneLineAnswer，也检查 simpleAnswer
    for old_name, new_name in FIELD_ALIAS_MAP.items():
        if new_name == field_name and old_name in entry:
            return entry[old_name]
    return None


def has_field(entry: dict, field_name: str) -> bool:
    """检查字段是否存在且非空"""
    val = resolve_field(entry, field_name)
    if val is None:
        return False
    if isinstance(val, str) and val.strip() == "":
        return False
    if isinstance(val, list) and len(val) == 0:
        return False
    if isinstance(val, dict) and len(val) == 0:
        return False
    return True


def validate_entry(entry: dict, idx: int) -> list[dict]:
    """
    校验单条词条，返回错误列表。
    每个错误: {"rule": 规则编号, "field": 字段名, "reason": 具体原因}
    """
    errors = []
    entry_id = entry.get("id", f"<未知#{idx}>")
    name = entry.get("name", "")

    # ── 规则1：字段完整性 ──
    missing_standard = []
    for f in STANDARD_REQUIRED:
        if not has_field(entry, f):
            missing_standard.append(f)
    if missing_standard:
        errors.append({
            "rule": 1, "field": "standard_required",
            "reason": f"标准层缺失/为空字段: {', '.join(missing_standard)}"
        })

    # 深度层字段仅在 toolType 非空（即深度层词条）时检查
    tool_type_val = resolve_field(entry, "toolType")
    is_deep_entry = tool_type_val is not None and str(tool_type_val).strip() != ""
    if is_deep_entry:
        missing_deep = []
        for f in DEEP_REQUIRED:
            if not has_field(entry, f):
                missing_deep.append(f)
        if missing_deep:
            errors.append({
                "rule": 1, "field": "deep_required",
                "reason": f"深度层缺失/为空字段: {', '.join(missing_deep)}"
            })

    # ── 规则2：字数校验 ──
    # oneLineAnswer ≤ 30字
    ola = resolve_field(entry, "oneLineAnswer")
    if ola is not None:
        ola_text = str(ola).strip()
        char_count = count_chinese_chars(ola_text)
        if char_count > 30:
            errors.append({
                "rule": 2, "field": "oneLineAnswer",
                "reason": f"oneLineAnswer 字数{char_count}，超过30字上限"
            })

    # corePoint 每条 ≤ 20字
    cp = resolve_field(entry, "corePoint")
    if cp is not None:
        if isinstance(cp, str):
            # 如果是字符串，尝试按顿号/逗号拆分
            cp_list = [p.strip() for p in re.split(r'[、，,]', cp) if p.strip()]
        elif isinstance(cp, list):
            cp_list = [str(p).strip() for p in cp if str(p).strip()]
        else:
            cp_list = []
        for i, item in enumerate(cp_list):
            cc = count_chinese_chars(item)
            if cc > 20:
                errors.append({
                    "rule": 2, "field": f"corePoint[{i}]",
                    "reason": f"corePoint第{i+1}条「{item[:15]}...」字数{cc}，超过20字上限"
                })

    # def 80-200字
    def_val = entry.get("def")
    if def_val is not None:
        def_text = str(def_val).strip()
        def_count = count_chinese_chars(def_text)
        if def_count < 80:
            errors.append({
                "rule": 2, "field": "def",
                "reason": f"def 字数{def_count}，低于80字下限"
            })
        elif def_count > 200:
            errors.append({
                "rule": 2, "field": "def",
                "reason": f"def 字数{def_count}，超过200字上限"
            })

    # ── 规则4：法条格式（按 entryType 区分） ──
    lr = resolve_field(entry, "legalRef")
    entry_type = entry.get("entryType", "")
    if lr is not None:
        lr_text = str(lr).strip()
        if lr_text:
            has_article = bool(ARTICLE_PATTERN.search(lr_text))
            has_docno = bool(DOCNO_PATTERN.search(lr_text))
            has_stdno = bool(STDNO_PATTERN.search(lr_text))

            if entry_type == "LAW":
                # LAW类型：legalRef必须包含"第X条"格式
                if not has_article:
                    errors.append({
                        "rule": 4, "field": "legalRef",
                        "reason": f"LAW词条legalRef须含第X条格式，内容: {lr_text[:50]}"
                    })
            elif entry_type == "POL":
                # POL类型：legalRef非空即可（政策文件用文号引用）
                pass
            elif entry_type == "STD":
                # STD类型：legalRef须含标准号或第X条格式
                if not has_stdno and not has_article:
                    errors.append({
                        "rule": 4, "field": "legalRef",
                        "reason": f"STD词条legalRef须含标准号或第X条格式，内容: {lr_text[:50]}"
                    })
            else:
                # 其他类型：legalRef非空即可
                pass

    # ── 规则6：severity一致性 ──
    severity = entry.get("severity", "")
    if severity == "hard":
        lr_val = resolve_field(entry, "legalRef")
        if lr_val is None or (isinstance(lr_val, str) and not lr_val.strip()):
            errors.append({
                "rule": 6, "field": "legalRef",
                "reason": "hard词条必须有legalRef"
            })
        elif isinstance(lr_val, str) and lr_val.strip():
            lr_str = lr_val.strip()
            has_article = bool(ARTICLE_PATTERN.search(lr_str))
            has_docno = bool(DOCNO_PATTERN.search(lr_str))
            has_stdno = bool(STDNO_PATTERN.search(lr_str))
            # hard词条：legalRef须含具体引用（文号/条文号/标准号均可）
            if not (has_article or has_docno or has_stdno):
                errors.append({
                    "rule": 6, "field": "legalRef",
                    "reason": f"hard词条的legalRef须含具体引用（条文号/文号/标准号），当前: {lr_str[:50]}"
                })

    return errors


def validate_cross_entries(entries: list[dict]) -> list[dict]:
    """
    校验跨词条规则（规则3和5），返回错误列表。
    """
    errors = []

    # 构建索引
    name_map = defaultdict(list)   # name → [idx]
    alias_map = defaultdict(list)  # alias → [(idx, entry_id)]
    entry_errors = defaultdict(list)  # idx → [error]

    for idx, entry in enumerate(entries):
        entry_id = entry.get("id", f"<未知#{idx}>")
        name = entry.get("name")

        # 收集name
        if name and str(name).strip():
            name_map[str(name).strip()].append(idx)

        # 收集alias
        alias_list = normalize_alias(entry.get("alias"))
        for a in alias_list:
            alias_map[a].append((idx, entry_id))

    # ── 规则3：name不能重复 ──
    for name, indices in name_map.items():
        if len(indices) > 1:
            dup_ids = [entries[i].get("id", f"#{i}") for i in indices]
            for i in indices:
                entry_errors[i].append({
                    "rule": 3, "field": "name",
                    "reason": f"name「{name}」重复，出现在: {', '.join(dup_ids)}"
                })

    # ── 规则3：alias内不能重复 ──
    for idx, entry in enumerate(entries):
        alias_list = normalize_alias(entry.get("alias"))
        seen = set()
        for a in alias_list:
            if a in seen:
                entry_errors[idx].append({
                    "rule": 3, "field": "alias",
                    "reason": f"alias内部重复: 「{a}」"
                })
            seen.add(a)

    # ── 规则3：不同词条的alias不能交叉重复 ──
    for alias_val, occurrences in alias_map.items():
        if len(occurrences) > 1:
            dup_ids = [eid for _, eid in occurrences]
            for idx, eid in occurrences:
                entry_errors[idx].append({
                    "rule": 3, "field": "alias",
                    "reason": f"alias「{alias_val}」跨词条重复，出现在: {', '.join(dup_ids)}"
                })

    # ── 规则5：别名唯一性 ──
    for idx, entry in enumerate(entries):
        entry_id = entry.get("id", f"<未知#{idx}>")
        alias_list = normalize_alias(entry.get("alias"))

        # alias至少5个
        if len(alias_list) < 5:
            entry_errors[idx].append({
                "rule": 5, "field": "alias",
                "reason": f"alias数量{len(alias_list)}，低于5个最低要求"
            })

        # alias不能与其他词条name重复
        for a in alias_list:
            if a in name_map:
                # 如果name属于自己则不算
                own_name = str(entry.get("name", "")).strip() if entry.get("name") else ""
                for other_idx in name_map[a]:
                    if other_idx != idx:
                        other_id = entries[other_idx].get("id", f"#{other_idx}")
                        entry_errors[idx].append({
                            "rule": 5, "field": "alias",
                            "reason": f"alias「{a}」与词条{other_id}的name重复"
                        })
                        break

        # alias不能与其他词条alias重复（已在规则3处理，这里也标注规则5）
        for a in alias_list:
            if a in alias_map and len(alias_map[a]) > 1:
                # 已在规则3中报告交叉重复，这里检查是否还有未覆盖的情况
                pass

    return entry_errors


async def main():
    # ── 参数解析 ──
    entries_path = sys.argv[1] if len(sys.argv) > 1 else "/app/data/所有对话/主对话/知识底座生产/entries_merged_183.json"
    result_mode = sys.argv[2] if len(sys.argv) > 2 else "display_only"

    print(f"[参数] entries_path={entries_path}")
    print(f"[参数] result_mode={result_mode}")

    sdk = CodeActSDK()

    try:
        # ── 加载数据 ──
        if not os.path.exists(entries_path):
            await sdk.submit_result(
                result_mode="notify",
                status="error",
                message=f"词条文件不存在: {entries_path}",
            )
            return

        with open(entries_path, "r", encoding="utf-8") as f:
            entries = json.load(f)

        if not isinstance(entries, list):
            await sdk.submit_result(
                result_mode="notify",
                status="error",
                message="词条文件格式错误：顶层应为JSON数组",
            )
            return

        total = len(entries)
        print(f"[信息] 加载词条 {total} 条")

        # ── 逐条校验（规则1/2/4/6） ──
        per_entry_errors = {}  # idx → [errors]
        for idx, entry in enumerate(entries):
            errs = validate_entry(entry, idx)
            if errs:
                per_entry_errors[idx] = errs

        # ── 跨词条校验（规则3/5） ──
        cross_errors = validate_cross_entries(entries)
        for idx, errs in cross_errors.items():
            if idx not in per_entry_errors:
                per_entry_errors[idx] = []
            per_entry_errors[idx].extend(errs)

        # ── 汇总统计 ──
        failed_count = len(per_entry_errors)
        passed_count = total - failed_count

        # 按规则统计
        rule_stats = defaultdict(int)
        rule_details = defaultdict(list)
        for idx, errs in per_entry_errors.items():
            entry_id = entries[idx].get("id", f"<#{idx}>")
            entry_name = entries[idx].get("name", "")
            for e in errs:
                rule_stats[e["rule"]] += 1
                rule_details[e["rule"]].append({
                    "id": entry_id,
                    "name": entry_name,
                    "field": e["field"],
                    "reason": e["reason"],
                })

        # ── 生成报告 ──
        report_lines = []
        report_lines.append("=" * 60)
        report_lines.append(f"词条校验报告 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append(f"数据源: {entries_path}")
        report_lines.append("=" * 60)
        report_lines.append("")
        report_lines.append(f"总词条数: {total}")
        report_lines.append(f"通过: {passed_count} ({passed_count/total*100:.1f}%)" if total > 0 else "通过: 0")
        report_lines.append(f"不通过: {failed_count} ({failed_count/total*100:.1f}%)" if total > 0 else "不通过: 0")
        report_lines.append("")

        # 规则概览
        rule_names = {
            1: "字段完整性",
            2: "字数校验",
            3: "重复检测",
            4: "法条格式",
            5: "别名唯一性",
            6: "severity一致性",
        }
        report_lines.append("── 规则命中概览 ──")
        for r in range(1, 7):
            cnt = rule_stats.get(r, 0)
            status = "❌" if cnt > 0 else "✅"
            report_lines.append(f"  {status} 规则{r} {rule_names[r]}: {cnt}处违规")
        report_lines.append("")

        # 详细错误
        for r in range(1, 7):
            details = rule_details.get(r, [])
            if not details:
                continue
            report_lines.append(f"── 规则{r} {rule_names[r]} 违规详情 ──")
            # 限制每条规则最多显示50条详情，避免报告过长
            for i, d in enumerate(details[:50]):
                report_lines.append(f"  [{d['id']}] {d['name'] or '(无名)'} | {d['field']} | {d['reason']}")
            if len(details) > 50:
                report_lines.append(f"  ... 还有 {len(details)-50} 条，省略")
            report_lines.append("")

        report_text = "\n".join(report_lines)
        print(report_text)

        # ── 保存报告文件 ──
        os.makedirs("./codeact/output", exist_ok=True)
        report_path = "./codeact/output/entry_validation_report.txt"
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report_text)
        print(f"\n[产出] 报告已保存: {report_path}")

        # ── 保存结构化JSON报告 ──
        json_report_path = "./codeact/output/entry_validation_report.json"
        json_report = {
            "timestamp": datetime.now().isoformat(),
            "source": entries_path,
            "total": total,
            "passed": passed_count,
            "failed": failed_count,
            "rule_stats": {str(k): v for k, v in sorted(rule_stats.items())},
            "failed_entries": {},
        }
        for idx, errs in per_entry_errors.items():
            entry_id = entries[idx].get("id", f"#{idx}")
            json_report["failed_entries"][entry_id] = {
                "name": entries[idx].get("name", ""),
                "errors": errs,
            }
        with open(json_report_path, "w", encoding="utf-8") as f:
            json.dump(json_report, f, ensure_ascii=False, indent=2)
        print(f"[产出] JSON报告: {json_report_path}")

        # ── 提交结果 ──
        actual_mode = result_mode
        if result_mode == "auto":
            actual_mode = "display_only" if failed_count > 0 else "no_reply"

        has_failure = failed_count > 0

        if has_failure:
            # 构建摘要 message
            rule_summary_parts = []
            for r in range(1, 7):
                cnt = rule_stats.get(r, 0)
                if cnt > 0:
                    rule_summary_parts.append(f"规则{r}({rule_names[r]}){cnt}处")
            summary = (
                f"词条校验未通过：{total}条中{failed_count}条不通过。"
                f"违规分布：{'、'.join(rule_summary_parts)}。"
                f"详见 [完整报告](computer://{os.path.abspath(report_path)})"
            )
        else:
            summary = f"词条校验全部通过：{total}条词条均符合6项规则。"

        await sdk.submit_result(
            result_mode=actual_mode,
            status="success",
            message=summary,
            data={
                "total": total,
                "passed": passed_count,
                "failed": failed_count,
                "rule_stats": {str(k): v for k, v in sorted(rule_stats.items())},
                "report_path": report_path,
                "json_report_path": json_report_path,
            },
        )

        # ── 校验不通过时 exit code=1 ──
        if has_failure:
            print("\n[退出] 校验未通过，exit code=1")
            sys.exit(1)

    except Exception as e:
        print(f"[错误] {e}")
        import traceback
        traceback.print_exc()
        await sdk.submit_result(
            result_mode="notify",
            status="error",
            message=f"词条校验脚本执行失败: {e}",
            data={"error_type": type(e).__name__},
        )
        sys.exit(1)


asyncio.run(main())
