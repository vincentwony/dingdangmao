#!/usr/bin/env python3
# scripts/extract_region_tree.py
# 从寿星历 JWv 提取省→地级市二级联动树
# 用法: python scripts/extract_region_tree.py > web/js/region-tree-data.js
# 输出: window._REGION_TREE = [{ province, regions: [{ name, id, lon, lat }] }]
import re, json, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SRC = os.path.join(os.path.dirname(__file__), '..', 'web', 'js', 'geo-data.js')

def jwdecode(code4):
    v = [ord(c) for c in code4]
    for i in range(4):
        if v[i] > 96:      v[i] -= 97 - 36
        elif v[i] > 64:    v[i] -= 65 - 10
        else:              v[i] -= 48
    lon = v[2] + v[3]/60 + 73
    lat = v[0] + v[1]/60
    return round(lon, 6), round(lat, 6)

def load():
    with open(SRC, 'r', encoding='utf-8') as f:
        text = f.read()
    m = re.search(r'var JWv = new Array\((.*?)\);', text, re.DOTALL)
    return re.findall(r"'([^']*)'", m.group(1))

# ─── 地名分类 ───
PROV_SUFFIX = ('省','自治区','直辖市','特别行政区')
DISTRICT_SUFFIX = ('区',)
TOWN_MARKERS = ('镇','街道','乡','村','水库','大坝','景区')

def is_prefecture(name, province):
    """判断是否为地区级（地级市/自治州/盟/直辖市 + 县级市）
       排除：区、县、自治县、旗、镇、街道、乡"""
    # 直辖市
    if name in ('北京','上海','天津','重庆','香港','澳门'):
        return True
    # 排除省份名自身
    if any(name.endswith(s) for s in PROV_SUFFIX):
        return False
    # 排除镇/街道/乡
    if any(m in name for m in TOWN_MARKERS):
        return False
    # 排除区（区是地级市下属，不独立列出）
    if any(name.endswith(s) for s in DISTRICT_SUFFIX):
        return False
    # 保留：地级市、县级市、县、自治县、旗、自治州、盟、地区
    return True

# 寿星历数据中的省份名缩写映射
PROV_SHORT_MAP = {
    '新疆维吾尔': '新疆', '广西壮族': '广西', '西藏': '西藏',
    '内蒙古': '内蒙古', '宁夏回族': '宁夏', '港澳台': '港澳台',
}

def short_prov(prov):
    """省份简称"""
    if prov in PROV_SHORT_MAP:
        return PROV_SHORT_MAP[prov]
    for s in PROV_SUFFIX:
        if prov.endswith(s):
            return prov[:-len(s)]
    return prov

def main():
    items = load()
    tree = {}
    # tree[prov_short] = { name: { lon, lat, order } }

    for prov_str in items:
        parts = prov_str.split()
        if not parts:
            continue
        prov = parts[0]
        pkey = short_prov(prov)

        for raw in parts[1:]:
            code4 = raw[:4]
            name = raw[4:]
            if len(code4) != 4 or not name:
                continue
            if not is_prefecture(name, prov):
                continue

            lon, lat = jwdecode(code4)
            if not (73 < lon < 135 and 18 < lat < 54):
                continue

            # 去重：同省同名保留首次出现（寿星历原始顺序）
            if pkey not in tree:
                tree[pkey] = {}
            if name not in tree[pkey]:
                tree[pkey][name] = {"lon": lon, "lat": lat, "order": len(tree[pkey])}

    # 转为数组格式，保持寿星历原始顺序
    result = []
    for prov_str in items:
        parts = prov_str.split()
        if not parts: continue
        prov = parts[0]
        pkey = short_prov(prov)
        if pkey not in tree: continue

        regions = []
        seen = set()
        for raw in parts[1:]:
            name = raw[4:]
            if name in tree[pkey] and name not in seen:
                seen.add(name)
                regions.append({
                    "name": name,
                    "id": f"{pkey}_{name}",
                    "lon": tree[pkey][name]["lon"],
                    "lat": tree[pkey][name]["lat"]
                })

        if regions:
            result.append({
                "province": prov,
                "provShort": pkey,
                "regions": regions
            })

    # 输出 JS
    print(f"// 省→地区二级联动树 — 自动生成")
    print(f"// 来源: 寿星历核心算法引擎 JWv 地名表")
    print(f"// 省份: {len(result)}, 地区: {sum(len(r['regions']) for r in result)}")
    print("window._REGION_TREE = [")
    for i, p in enumerate(result):
        pc = "," if i < len(result) - 1 else ""
        print(f'  {{ "province": "{p["province"]}", "provShort": "{p["provShort"]}", "regions": [')
        for j, r in enumerate(p["regions"]):
            rc = "," if j < len(p["regions"]) - 1 else ""
            print(f'    {{ "name": "{r["name"]}", "id": "{r["id"]}", "lon": {r["lon"]}, "lat": {r["lat"]} }}{rc}')
        print(f'  ] }}{pc}')
    print("];")

    # 验证
    for p in result:
        if p['provShort'] == '湖北':
            for r in p['regions']:
                if r['name'] == '宜昌':
                    print(f"// 验证 湖北→宜昌: lon={r['lon']} lat={r['lat']}")
        if p['provShort'] == '新疆':
            for r in p['regions']:
                if r['name'] == '乌鲁木齐':
                    print(f"// 验证 新疆→乌鲁木齐: lon={r['lon']} lat={r['lat']}")

if __name__ == '__main__':
    main()
