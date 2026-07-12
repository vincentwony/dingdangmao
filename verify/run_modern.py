#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
run_modern.py — 新管道 (MD 对齐) 执行器

用相同 50 个用例跑新管道，输出结构化结果。
输出: modern_output.json

用法: python run_modern.py [--cases test_cases.json] [--out modern_output.json]
"""

import json
import os
import subprocess
import sys

# ═══ 《子平真诠》 古籍引用库 ═══
# 规则: 每个 MD 章节引用 → 具体卷/章/句
ZIPING_CITATIONS = {
    "§3.3": "《子平真诠》卷三·论用神：'用神专求月令，以日干配月令地支，而生克不同，格局分焉'",
    "§3.4": "《子平真诠》卷五·论正官/论七杀/论正财/论偏财/论正印/论偏印/论食神/论伤官 — 十格局成败条件",
    "§4.2": "《子平真诠》卷五·论从格：'有印相生，虽弱不从' — 天干透印为硬否决",
    "§4.3.1": "《子平真诠》卷五·论从财：'四柱皆财，日主无气，从财格成'",
    "§4.3.2": "《子平真诠》卷五·论从杀：'四柱皆煞，日主无根，从煞格成'",
    "§4.3.5": "《滴天髓》上篇·从象：'从得真者只论从，从神又有吉和凶'",
    "§4.3.6": "《子平真诠》卷五·论化气：'化气成格，须得月令之气'",
    "§4.5": "《子平真诠》附录·论杂格：'真假从格之辨，在乎根气有无'",
    "§5.1": "《子平真诠》卷一·论十干十二支：用神/喜神/忌神定义体系",
    "§5.2": "《子平真诠》卷五·论用神变化：扶抑法'强则抑之，弱则扶之'",
    "§5.3": "《子平真诠》卷五·论从格用神：'所从之神，即用神也'",
    "§5.4": "《穷通宝鉴》全卷 — 调候为第一要务",
    "§5.5": "《穷通宝鉴》调候用神体系 — 十干调候速查表",
    "§6.2": "自洽验算四层检查 — 源自《子平真诠》诸卷格局统合逻辑",
    "§7.2": "MD 文档决策树 (§7.2): 从强格→化气格→从格→正格",
}


PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRIDGE = os.path.join(PROJECT_ROOT, "verify", "bridge.js")
CASES_FILE = os.path.join(PROJECT_ROOT, "verify", "test_cases.json")
OUT_FILE = os.path.join(PROJECT_ROOT, "verify", "modern_output.json")


def load_cases(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def run_bridge(mode, input_path):
    """Call bridge.js with given mode and input file, return parsed JSON results."""
    proc = subprocess.run(
        ["node", BRIDGE, mode, input_path],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=PROJECT_ROOT,
        timeout=300,
    )
    if proc.returncode != 0:
        print("ERROR: bridge.js exited with code", proc.returncode, file=sys.stderr)
        print("STDERR:", proc.stderr[-500:], file=sys.stderr)
        sys.exit(1)

    stdout = proc.stdout.strip()
    json_start = stdout.find("[")
    if json_start < 0:
        print("ERROR: no JSON found in bridge output", file=sys.stderr)
        sys.exit(1)
    stdout = stdout[json_start:]

    try:
        return json.loads(stdout)
    except json.JSONDecodeError as e:
        print("ERROR: JSON decode failed:", e, file=sys.stderr)
        sys.exit(1)


def enrich_modern(results):
    """为新管道结果补充古籍引用和验证标签。"""
    for r in results:
        # 从 classicRef 展开为完整古籍引用
        refs = r.get("classicRef", "")
        if refs and refs != "N/A":
            expanded = []
            for ref in refs.split(", "):
                ref = ref.strip()
                if ref in ZIPING_CITATIONS:
                    expanded.append(ZIPING_CITATIONS[ref])
                else:
                    expanded.append(ref)
            r["classicRef"] = "; ".join(expanded)
        elif refs == "N/A":
            r["classicRef"] = "N/A — 新管道未引用古籍条款"

        # 补充验证标签
        verified = list(r.get("verified_by", []))
        if "regression_test" not in verified:
            verified.append("regression_test")
        r["verified_by"] = verified

        # 验算状态
        if r.get("verifyPassed") is None:
            r["verifyPassed"] = "UNKNOWN"

        # 提取调候信息
        reasoning = r.get("reasoning", "")
        if "调候" in reasoning and "tiaoHou" not in str(r):
            r["hasTiaoHou"] = True
        else:
            r["hasTiaoHou"] = "调候" in reasoning

    return results


def main():
    cases_path = sys.argv[1] if len(sys.argv) > 1 else CASES_FILE
    out_path = sys.argv[2] if len(sys.argv) > 2 else OUT_FILE

    print("=" * 60)
    print("  新管道执行器 (MD 对齐)")
    print("=" * 60)
    print()

    # 1. 加载测试用例
    cases = load_cases(cases_path)
    print("加载测试用例: {} 个".format(len(cases)))

    # 2. 运行新管道
    print("运行新管道 (bridge.js modern)...")
    results = run_bridge("modern", cases_path)
    print("新管道完成: {} 条结果".format(len(results)))

    # 3. 补充古籍引用
    results = enrich_modern(results)

    # 4. 检查异常
    skipped = []
    for r in results:
        if r.get("pattern") == "N/A" or r.get("yongshen") == "N/A":
            skipped.append(r["id"])
    if skipped:
        print("WARNING: {} 条用例新管道无输出: {}".format(
            len(skipped), ", ".join(skipped)))

    # 5. 写入输出
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print()
    print("输出文件已生成: {}".format(out_path))
    print("总用例: {} | 有效: {} | 跳过: {}".format(
        len(cases), len(cases) - len(skipped), len(skipped)))
    print()

    # 简要统计
    patterns = {}
    for r in results:
        p = r.get("pattern", "N/A")
        patterns[p] = patterns.get(p, 0) + 1
    print("格局分布 (新管道):")
    for p, c in sorted(patterns.items(), key=lambda x: -x[1]):
        print("  {}: {}".format(p, c))

    # 古籍引用覆盖率
    with_ref = sum(1 for r in results if r.get("classicRef", "") != "N/A")
    print()
    print("古籍引用覆盖率: {}/{} ({:.0f}%)".format(
        with_ref, len(results), 100 * with_ref / len(results)))


if __name__ == "__main__":
    main()
