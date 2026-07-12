#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
analyze_discrepancy.py — 双管道差异分析器

自动比对 legacy_baseline.json 与 modern_output.json，生成:
1. 结构化分歧报告 (discrepancy_report.md)
2. 终端摘要输出

涉及规则: 仅当 pattern 或 yongshen 字段值不同时，视为"分歧案例"。
两个字段有任一不同即计入分歧（不区分 pattern-only / yongshen-only）。

用法: python analyze_discrepancy.py [--legacy legacy_baseline.json]
                                      [--modern modern_output.json]
                                      [--out discrepancy_report.md]
"""

import json
import os
import sys
from collections import Counter

# ═══ 配置 ═══
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEGACY_FILE = os.path.join(PROJECT_ROOT, "verify", "legacy_baseline.json")
MODERN_FILE = os.path.join(PROJECT_ROOT, "verify", "modern_output.json")
REPORT_FILE = os.path.join(PROJECT_ROOT, "verify", "discrepancy_report.md")

# ═══ 差异分类关键词 ═══
# 这些关键词用于自动归类，非绝对判定，需要人工复核
THEORY_KEYWORDS = [
    "从格", "正格", "化气", "专旺", "身旺", "身弱",
    "印星", "比劫", "财星", "官杀", "食伤",
]
RULE_GAP_KEYWORDS = [
    "固定分值", "无权威依据", "N/A", "未覆盖",
    "经验规则", "用户校准",
]
BUG_KEYWORDS = [
    "否决", "条件", "透印", "强根", "无根",
    "冲突", "违反",
]
CALC_ERROR_KEYWORDS = ["排盘", "干支", "计算差异", "索引"]


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _normalize(val):
    """标准化字符串用于比较。"""
    if not val:
        return ""
    return val.strip().replace(" ", "").replace("　", "")


def patterns_match(legacy_pattern, modern_pattern):
    """检查两个格局名是否等价。"""
    lp = _normalize(legacy_pattern)
    mp = _normalize(modern_pattern)
    if lp == mp:
        return True
    # 宽松匹配: 从*格 vs 从*格
    if lp.startswith("从") and mp.startswith("从"):
        # 从财/从杀/从儿/从势/从强 可能交叉
        return lp == mp
    # 正格 vs 正格: 正官格/偏财格/食神格 等
    return False


def classify_discrepancy(legacy, modern):
    """自动归类差异类型。

    Returns one of:
      - '理论分歧': 双方均有文献/逻辑支撑
      - '规则缺失': 旧管道有经验规则，新管道未覆盖
      - '逻辑bug': 新管道违反《子平真诠》原文
      - '排盘误差': 干支计算差异
      - '未分类': 无法自动判定
    """
    lr = legacy.get("reasoning", "")
    mr = modern.get("reasoning", "")
    lw = " ".join(legacy.get("warnings", []))
    mw = " ".join(modern.get("warnings", []))

    combined = lr + mr + lw + mw

    # 检查计算误差
    if any(kw in combined for kw in CALC_ERROR_KEYWORDS):
        return "排盘误差"

    # 检查逻辑冲突
    bug_signals = 0
    for kw in BUG_KEYWORDS:
        if kw in mr:
            bug_signals += 1
    if bug_signals >= 2:
        return "逻辑bug"

    # 检查规则缺失
    if "⚠️" in lw or "N/A" in lr[:20] or "N/A" in mr[:20]:
        return "规则缺失"

    # 检查理论分歧
    if (legacy.get("isCong") != modern.get("isCong") or
            legacy.get("isHua") != modern.get("isHua")):
        return "理论分歧"

    # 两个管道都给出格局但不同 → 理论分歧
    lp = legacy.get("pattern", "")
    mp = modern.get("pattern", "")
    if lp != "N/A" and mp != "N/A" and not patterns_match(lp, mp):
        return "理论分歧"

    return "未分类"


def _short(val, maxlen=80):
    """截断长字符串。"""
    s = str(val) if val else ""
    if len(s) > maxlen:
        return s[:maxlen] + "..."
    return s


def build_report(cases, legacy_results, modern_results, report_path):
    """生成差异报告并写入 Markdown 文件。"""
    legacy_map = {r["id"]: r for r in legacy_results}
    modern_map = {r["id"]: r for r in modern_results}

    discrepancies = []
    matched = []

    for tc in cases:
        tid = tc["id"]
        leg = legacy_map.get(tid)
        mod = modern_map.get(tid)

        if not leg or not mod:
            continue

        # 判断分歧: pattern 或 yongshen 不同
        l_pat = leg.get("pattern", "")
        m_pat = mod.get("pattern", "")
        l_xy = leg.get("yongshen", "")
        m_xy = mod.get("yongshen", "")

        pat_diff = not patterns_match(l_pat, m_pat)
        xy_diff = _normalize(l_xy) != _normalize(m_xy)

        if pat_diff or xy_diff:
            d_type = classify_discrepancy(leg, mod)
            discrepancies.append({
                "case": tc,
                "legacy": leg,
                "modern": mod,
                "pat_diff": pat_diff,
                "xy_diff": xy_diff,
                "type": d_type,
            })
        else:
            matched.append(tid)

    # ═══ 构建报告 ═══
    lines = []
    lines.append("# 八字双管道差异分析报告")
    lines.append("")
    lines.append("> 生成工具: `analyze_discrepancy.py`")
    lines.append("> 旧管道: tyme4j 三层决策树 (已验证: 古籍+用户+审查)")
    lines.append("> 新管道: MD 文档对齐 (已验证: 回归测试 50+ 用例)")
    lines.append("")

    # ═══ 1. 统计摘要 ═══
    total = len(cases)
    n_disc = len(discrepancies)
    n_match = len(matched)
    lines.append("## 一、统计摘要")
    lines.append("")
    lines.append("| 统计项 | 数值 |")
    lines.append("|--------|------|")
    lines.append("| 总案例数 | {} |".format(total))
    lines.append("| 一致案例数 | {} |".format(n_match))
    lines.append("| 分歧案例数 | {} |".format(n_disc))
    lines.append("| 一致率 | {:.1f}% |".format(100 * n_match / total if total else 0))
    lines.append("")

    # 按差异类型分布
    type_counts = Counter(d["type"] for d in discrepancies)
    if type_counts:
        lines.append("### 差异类型分布")
        lines.append("")
        lines.append("| 差异类型 | 数量 | 占比 |")
        lines.append("|----------|------|------|")
        for t, c in type_counts.most_common():
            lines.append("| {} | {} | {:.0f}% |".format(
                t, c, 100 * c / n_disc if n_disc else 0))
        lines.append("")

    # 按差异维度分布
    pat_only = sum(1 for d in discrepancies if d["pat_diff"] and not d["xy_diff"])
    xy_only = sum(1 for d in discrepancies if d["xy_diff"] and not d["pat_diff"])
    both = sum(1 for d in discrepancies if d["pat_diff"] and d["xy_diff"])
    lines.append("### 差异维度分布")
    lines.append("")
    lines.append("| 维度 | 数量 |")
    lines.append("|------|------|")
    lines.append("| 仅格局不同 | {} |".format(pat_only))
    lines.append("| 仅用神不同 | {} |".format(xy_only))
    lines.append("| 格局+用神均不同 | {} |".format(both))
    lines.append("")

    # ═══ 2. 关键发现 ═══
    lines.append("## 二、关键发现")
    lines.append("")

    findings = _derive_findings(discrepancies, legacy_map, modern_map)
    if findings:
        for fi, finding in enumerate(findings, 1):
            lines.append("{}. {}".format(fi, finding))
    else:
        lines.append("无关键发现 — 两管道完全一致。")
    lines.append("")

    # ═══ 3. 逐项分析 ═══
    lines.append("## 三、分歧案例逐项分析")
    lines.append("")
    lines.append("> 共 {} 条分歧，按差异类型分组展示".format(n_disc))
    lines.append("")

    # 按类型分组
    by_type = {}
    for d in discrepancies:
        by_type.setdefault(d["type"], []).append(d)

    type_order = ["理论分歧", "规则缺失", "逻辑bug", "排盘误差", "未分类"]
    for t in type_order:
        group = by_type.get(t, [])
        if not group:
            continue

        lines.append("### {} ({} 例)".format(t, len(group)))
        lines.append("")

        for di, d in enumerate(group, 1):
            tc = d["case"]
            leg = d["legacy"]
            mod = d["modern"]

            lines.append("#### [{}.{}] {}".format(d["type"][:2], tc["id"], tc["id"]))
            lines.append("")
            bazi_display = tc.get("bazi", "") or " ".join(tc.get("pillars", ["?"]*4))
            lines.append("- **八字**: `{}` ({})".format(bazi_display, tc.get("desc", "")))
            lines.append("- **来源**: {}".format(tc.get("source", "?")))
            lines.append("")
            lines.append("| 维度 | 旧管道 (tyme4j) | 新管道 (MD对齐) |")
            lines.append("|------|-----------------|-----------------|")
            lines.append("| **格局** | {} | {} |".format(
                leg.get("pattern", "?"), mod.get("pattern", "?")))
            lines.append("| **用神** | {} | {} |".format(
                leg.get("yongshen", "?"), mod.get("yongshen", "?")))

            # 喜神/忌神 (仅新管道有)
            l_like = leg.get("likeGod", "")
            l_fear = leg.get("fearGod", "")
            m_like = mod.get("likeGod", "")
            m_fear = mod.get("fearGod", "")
            if m_like or m_fear:
                lines.append("| **喜神** | {} | {} |".format(
                    l_like or "N/A", m_like or "N/A"))
                lines.append("| **忌神** | {} | {}".format(
                    l_fear or "N/A", m_fear or "N/A"))

            # 强度
            lines.append("| **日主强度** | 生助{}% 克泄耗{}% | {} ({}%) |".format(
                leg.get("shengPct", "?"), leg.get("keXiePct", "?"),
                mod.get("strengthLevel", "?"), mod.get("strengthPct", "?")))
            lines.append("| **从格判定** | isCong={} | isCong={} |".format(
                leg.get("isCong", "?"), mod.get("isCong", "?")))
            lines.append("| **验算** | {} | {} |".format(
                "N/A (旧管道无自洽检查)", "✅ 通过" if mod.get("verifyPassed") else "❌ 未通过"))
            lines.append("")

            # 推理依据
            lines.append("**旧管道依据**:")
            lines.append("```")
            lines.append(_short(leg.get("reasoning", "N/A"), 200))
            lines.append("```")
            lines.append("")
            lines.append("**新管道依据**:")
            lines.append("```")
            lines.append(_short(mod.get("reasoning", "N/A"), 200))
            lines.append("```")
            lines.append("")

            # 古籍引用
            cr = mod.get("classicRef", "")
            if cr and cr != "N/A":
                lines.append("**新管道古籍引用**:")
                for ref in cr.split("; "):
                    if ref.strip():
                        lines.append("- {}".format(ref.strip()))
                lines.append("")

            # 警告
            lw = leg.get("warnings", [])
            mw = mod.get("warnings", [])
            if lw or mw:
                lines.append("**警告**:")
                for w in lw:
                    lines.append("- [旧] {}".format(w))
                for w in mw:
                    lines.append("- [新] {}".format(w))
                lines.append("")

            # 差异类型 + 建议动作
            lines.append("**差异类型**: {}".format(d["type"]))
            lines.append("")
            lines.append("**建议动作**:")
            if d["type"] == "理论分歧":
                lines.append("- 建议人工仲裁。两种结论均有逻辑依据，需要资深命理师判定。")
                lines.append("- 可提取为脱敏模板发命理社群讨论。")
            elif d["type"] == "逻辑bug":
                lines.append("- ⚠️ 优先修复。新管道可能违反《子平真诠》具体条款。")
                lines.append("- 需对照上述古籍引用逐条核查。")
            elif d["type"] == "规则缺失":
                lines.append("- 可考虑将旧管道经验规则注入新管道。")
                lines.append("- 旧管道的用户校准数据可作为新管道训练/调参参考。")
            elif d["type"] == "排盘误差":
                lines.append("- 检查干支索引计算，此类分歧应极少。")
            else:
                lines.append("- 需人工复核后决定。")
            lines.append("")
            lines.append("---")
            lines.append("")

    # ═══ 4. 一致案例速览 ═══
    lines.append("## 四、一致案例列表")
    lines.append("")
    lines.append("以下 {} 例两管道 output 完全一致：".format(n_match))
    lines.append("")
    for tid in matched:
        tc = next((c for c in cases if c["id"] == tid), None)
        leg = legacy_map[tid]
        lines.append("- **{}**: `{}` → 格局=`{}` 用神=`{}`".format(
            tid,
            tc.get("bazi", "?") if tc else "?",
            leg.get("pattern", "?"),
            leg.get("yongshen", "?"),
        ))
    lines.append("")

    # ═══ 5. 建议优先级 ═══
    lines.append("## 五、修复优先级建议")
    lines.append("")
    lines.append("| 优先级 | 差异类型 | 数量 | 建议动作 |")
    lines.append("|--------|----------|------|----------|")
    lines.append("| 🔴 P0 | 逻辑bug | {} | 立即修复新管道 |".format(
        type_counts.get("逻辑bug", 0)))
    lines.append("| 🟡 P1 | 规则缺失 | {} | 注入旧管道规则 |".format(
        type_counts.get("规则缺失", 0)))
    lines.append("| 🟢 P2 | 理论分歧 | {} | 人工仲裁 |".format(
        type_counts.get("理论分歧", 0)))
    lines.append("| ⚪ P3 | 未分类 | {} | 人工复核 |".format(
        type_counts.get("未分类", 0)))
    lines.append("| ⚪ P3 | 排盘误差 | {} | 核查计算 |".format(
        type_counts.get("排盘误差", 0)))
    lines.append("")

    # ═══ 写入文件 ═══
    content = "\n".join(lines)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(content)

    return content, {
        "total": total,
        "matched": n_match,
        "discrepancies": n_disc,
        "type_counts": dict(type_counts),
        "pat_only": pat_only,
        "xy_only": xy_only,
        "both": both,
    }


def _derive_findings(discrepancies, legacy_map, modern_map):
    """从分歧数据中自动提取关键发现。"""
    findings = []
    if not discrepancies:
        return findings

    # 发现1: 化气格分歧
    hua_cases = [
        d for d in discrepancies
        if "化气" in str(d["legacy"].get("reasoning", ""))
        or "化气" in str(d["modern"].get("reasoning", ""))
        or d["modern"].get("isHua")
    ]
    if hua_cases:
        findings.append(
            "**化气格分歧**: {} 例涉及化气格判定，新管道引《子平真诠·论化气》更严格，"
            "要求紧贴+得令+无强根三条件同时满足，旧管道无化气格检查。".format(len(hua_cases))
        )

    # 发现2: 从格阈值分歧
    cong_cases = [
        d for d in discrepancies
        if d["legacy"].get("isCong") != d["modern"].get("isCong")
    ]
    if cong_cases:
        findings.append(
            "**从格判定分歧**: {} 例从格结论不同。核心差异：新管道使用五条件体系"
            "（天干无印比+月令不助+异党≥70%）+强根否决，"
            "旧管道仅用百分比阈值。".format(len(cong_cases))
        )

    # 发现3: 调候影响
    th_cases = [
        d for d in discrepancies
        if "调候" in str(d["modern"].get("reasoning", ""))
    ]
    if th_cases:
        findings.append(
            "**调候影响**: {} 例新管道触发调候优先逻辑（《穷通宝鉴》），"
            "可能导致用神选择与旧管道不同。".format(len(th_cases))
        )

    # 发现4: 正格一致性
    all_zhengge = [
        d for d in discrepancies
        if not d["legacy"].get("isCong") and not d["modern"].get("isCong")
        and not d["modern"].get("isHua")
    ]
    if all_zhengge:
        findings.append(
            "**正格判定分歧**: {} 例正格判定的格局名不同。"
            "旧管道用司令透干+固定分值，新管道用月令透干三步法（§3.3）。"
            "两者对月令本气/中气/余气的权重分配不同。".format(len(all_zhengge))
        )

    # 发现5: 验算未通过
    verify_fails = [
        d for d in discrepancies
        if not d["modern"].get("verifyPassed")
    ]
    if verify_fails:
        findings.append(
            "**自洽验算失败**: {} 例新管道自洽检查未通过，"
            "表明新管道内部存在逻辑矛盾，需要优先核查。".format(len(verify_fails))
        )

    return findings


def print_terminal_summary(stats):
    """终端输出摘要。"""
    print()
    print("=" * 60)
    print("  差异分析完成")
    print("=" * 60)
    print()
    print("总案例: {}".format(stats["total"]))
    print("一致:   {} ({:.1f}%)".format(
        stats["matched"],
        100 * stats["matched"] / stats["total"] if stats["total"] else 0,
    ))
    print("分歧:   {} ({:.1f}%)".format(
        stats["discrepancies"],
        100 * stats["discrepancies"] / stats["total"] if stats["total"] else 0,
    ))
    print()
    if stats["type_counts"]:
        print("差异类型分布:")
        for t, c in sorted(stats["type_counts"].items(), key=lambda x: -x[1]):
            print("  {}: {}".format(t, c))
    print()
    print("差异维度:")
    print("  仅格局不同: {}".format(stats["pat_only"]))
    print("  仅用神不同: {}".format(stats["xy_only"]))
    print("  格局+用神均不同: {}".format(stats["both"]))


def main():
    legacy_path = sys.argv[1] if len(sys.argv) > 1 else LEGACY_FILE
    modern_path = sys.argv[2] if len(sys.argv) > 2 else MODERN_FILE
    report_path = sys.argv[3] if len(sys.argv) > 3 else REPORT_FILE

    # 检查输入文件
    for fp, label in [(legacy_path, "legacy"), (modern_path, "modern")]:
        if not os.path.exists(fp):
            print("ERROR: {} 文件不存在: {}".format(label, fp), file=sys.stderr)
            print("请先运行 generate_baseline.py 和 run_modern.py", file=sys.stderr)
            sys.exit(1)

    print("=" * 60)
    print("  双管道差异分析器")
    print("=" * 60)
    print()

    # 加载数据
    print("加载旧管道基准: {}".format(legacy_path))
    legacy_results = load_json(legacy_path)
    print("  → {} 条记录".format(len(legacy_results)))

    print("加载新管道输出: {}".format(modern_path))
    modern_results = load_json(modern_path)
    print("  → {} 条记录".format(len(modern_results)))

    print("加载测试用例...")
    cases_path = os.path.join(PROJECT_ROOT, "verify", "test_cases.json")
    cases = []
    if os.path.exists(cases_path):
        cases = load_json(cases_path)
    print("  → {} 个用例".format(len(cases)))

    # 生成报告
    print()
    print("生成差异报告...")
    report_content, stats = build_report(cases, legacy_results, modern_results,
                                          report_path)

    # 终端摘要
    print_terminal_summary(stats)

    print()
    print("详细报告已生成: {}".format(report_path))
    print("可直接在编辑器中打开审阅。")


if __name__ == "__main__":
    main()
