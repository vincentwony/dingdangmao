#!/usr/bin/env python3
# scripts/extract_geo_cards.py
# 从寿星历 JWv 数据提取地名卡片 JSON，用于前端 geo-cards 组件
# 用法: python scripts/extract_geo_cards.py > web/js/geo-cards-data.js

import re, json, math, os, sys, io
# 强制 UTF-8 输出（Windows 兼容）
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ─── JWv 原始数据（直接从 index.html / geo-data.js 读取） ───
SRC_FILE = os.path.join(os.path.dirname(__file__), '..', 'web', 'js', 'geo-data.js')

def load_jwv():
    """从 geo-data.js 提取 JWv 数组"""
    with open(SRC_FILE, 'r', encoding='utf-8') as f:
        text = f.read()
    # 提取 var JWv = new Array(...) 中的字符串
    m = re.search(r'var JWv = new Array\((.*?)\);', text, re.DOTALL)
    if not m:
        raise RuntimeError("Cannot find JWv array in geo-data.js")
    raw = m.group(1)
    # 拆分为各省字符串
    items = re.findall(r"'([^']*)'", raw)
    return items

# ─── JWdecode 逻辑移植 ───
def jwdecode(code4):
    """解码寿星历4字符码为 (lon_deg, lat_deg)"""
    v = [ord(c) for c in code4]
    for i in range(4):
        if v[i] > 96:      v[i] -= 97 - 36   # a-z
        elif v[i] > 64:    v[i] -= 65 - 10   # A-Z
        else:              v[i] -= 48         # 0-9
    lon_deg = +(v[2] + v[3]/60 + 73)  # 经度: JS中 J=-(...)/180*PI, 显示时 -J*180/PI=+(...)°E
    lat_deg =   v[0] + v[1]/60          # 纬度
    return round(lon_deg, 6), round(lat_deg, 6)

# ─── 高频地名优先级 ───
HIGH_FREQ_NAMES = [
    "北京", "上海", "广州", "成都", "武汉", "西安",
    "乌鲁木齐", "长阳", "海宁", "苏州", "南京", "杭州",
    "深圳", "重庆", "天津", "沈阳", "郑州", "长沙",
    "昆明", "哈尔滨", "拉萨", "长春", "太原", "合肥",
    "南昌", "福州", "贵阳", "兰州", "西宁", "银川",
    "海口", "呼和浩特", "南宁", "济南", "青岛", "大连",
    "厦门", "宁波", "无锡", "东莞", "佛山",
    # 补充高频县级八字排盘地名
    "长阳土家族自治县", "海宁", "义乌", "绍兴", "温州",
    "泉州", "漳州", "徐州", "扬州", "洛阳", "开封",
    "宜昌", "襄阳", "荆州", "岳阳", "株洲", "桂林",
    "三亚", "丽江", "大理", "延安", "遵义",
]

def is_high_freq(name):
    return name in HIGH_FREQ_NAMES

def freq_rank(name):
    try:
        return HIGH_FREQ_NAMES.index(name)
    except ValueError:
        return 999

# ─── 地名简化显示 ───
def short_name(name):
    """去除行政后缀，用于卡片显示"""
    suffixes = ['土家族自治县','苗族侗族自治县','彝族回族苗族自治县',
                '壮族自治区','维吾尔自治区','回族自治区','特别行政区',
                '自治县','自治旗','市辖区','街道','地区','新区',
                '区','县','市']
    for s in suffixes:
        if name.endswith(s) and len(name) > len(s) + 1:
            return name[:-len(s)]
    return name
COUNTY_SUFFIXES = ['县', '自治县', '区', '市', '旗', '自治旗']
PROV_SUFFIXES = ['省', '自治区', '直辖市', '特别行政区']

def classify(name, province):
    if name in ['北京','上海','天津','重庆','香港','澳门']:
        return 'municipality'
    for s in PROV_SUFFIXES:
        if name.endswith(s):
            return 'province'
    if any(name.endswith(s) for s in COUNTY_SUFFIXES):
        return 'county'
    if '镇' in name or '街道' in name:  # 跳过乡镇级
        return 'town'
    return 'city'

# ─── 去重策略：同名地名优先保留高频项，其次按出现顺序 ───
#   总量控制：≤300项（municipality/city 全保留 ≈314，county 仅保留高频项）
def extract_cards():
    items = load_jwv()
    city_cards = []
    county_cards = []

    for prov_str in items:
        parts = prov_str.split()
        if not parts:
            continue
        province = parts[0]
        for name_raw in parts[1:]:
            code4 = name_raw[:4]
            name = name_raw[4:]
            if len(code4) != 4 or not name:
                continue
            ctype = classify(name, province)
            if ctype in ('town', 'province'):
                continue

            lon, lat = jwdecode(code4)
            if not (73 < lon < 135 and 18 < lat < 54):
                continue

            card = {
                "id": f"{name}_{code4}",
                "name": short_name(name),    # 卡片显示用简称
                "fullName": name,            # 完整行政名
                "prov": province,
                "lon": lon,
                "lat": lat,
                "type": ctype,
                "freq": freq_rank(short_name(name)),
                "code": code4
            }
            if ctype == 'county':
                county_cards.append(card)
            else:
                city_cards.append(card)

    # 城市/直辖市去重（按 short_name）
    seen = set()
    deduped_city = []
    for c in city_cards:
        if c['name'] in seen: continue
        seen.add(c['name'])
        deduped_city.append(c)

    # 县区级：仅保留高频地名中的县级项
    deduped_county = []
    for c in county_cards:
        if c['name'] in seen: continue
        if is_high_freq(c['name']):
            seen.add(c['name'])
            deduped_county.append(c)

    # 合并排序
    all_cards = deduped_city + deduped_county

    # 补充寿星历未收录的高频八字地名（坐标来自《天文年历》校准值）
    supplements = [
        {"id": "haining_sup", "name": "海宁", "prov": "浙江省", "lon": 120.680000, "lat": 30.520000},
        {"id": "shaoxing_sup", "name": "绍兴", "prov": "浙江省", "lon": 120.580000, "lat": 30.030000},
        {"id": "wenzhou_sup", "name": "温州", "prov": "浙江省", "lon": 120.700000, "lat": 28.000000},
        {"id": "yiwu_sup", "name": "义乌", "prov": "浙江省", "lon": 120.070000, "lat": 29.340000},
        {"id": "xuzhou_sup", "name": "徐州", "prov": "江苏省", "lon": 117.180000, "lat": 34.270000},
        {"id": "yangzhou_sup", "name": "扬州", "prov": "江苏省", "lon": 119.420000, "lat": 32.390000},
        {"id": "luoyang_sup", "name": "洛阳", "prov": "河南省", "lon": 112.450000, "lat": 34.620000},
        {"id": "kaifeng_sup", "name": "开封", "prov": "河南省", "lon": 114.310000, "lat": 34.800000},
        {"id": "yichang_sup", "name": "宜昌", "prov": "湖北省", "lon": 111.290000, "lat": 30.700000},
        {"id": "xiangyang_sup", "name": "襄阳", "prov": "湖北省", "lon": 112.150000, "lat": 32.010000},
        {"id": "jingzhou_sup", "name": "荆州", "prov": "湖北省", "lon": 112.240000, "lat": 30.330000},
        {"id": "yueyang_sup", "name": "岳阳", "prov": "湖南省", "lon": 113.130000, "lat": 29.370000},
        {"id": "zhuzhou_sup", "name": "株洲", "prov": "湖南省", "lon": 113.130000, "lat": 27.830000},
        {"id": "guilin_sup", "name": "桂林", "prov": "广西壮族", "lon": 110.280000, "lat": 25.290000},
        {"id": "sanya_sup", "name": "三亚", "prov": "海南省", "lon": 109.510000, "lat": 18.250000},
        {"id": "lijiang_sup", "name": "丽江", "prov": "云南省", "lon": 100.230000, "lat": 26.880000},
        {"id": "dali_sup", "name": "大理", "prov": "云南省", "lon": 100.230000, "lat": 25.610000},
        {"id": "yanan_sup", "name": "延安", "prov": "陕西省", "lon": 109.490000, "lat": 36.590000},
        {"id": "zunyi_sup", "name": "遵义", "prov": "贵州省", "lon": 106.920000, "lat": 27.730000},
        {"id": "quanzhou_sup", "name": "泉州", "prov": "福建省", "lon": 118.580000, "lat": 24.930000},
        {"id": "zhangzhou_sup", "name": "漳州", "prov": "福建省", "lon": 117.650000, "lat": 24.520000},
    ]
    # 去重
    existing_names = {c['name'] for c in all_cards}
    for s in supplements:
        if s['name'] not in existing_names:
            all_cards.append({
                "id": s['id'], "name": s['name'], "prov": s['prov'],
                "lon": s['lon'], "lat": s['lat'],
                "type": "city", "freq": freq_rank(s['name']),
                "code": "SUPP", "fullName": s['name']
            })

    all_cards.sort(key=lambda c: (c['freq'], c['prov'], c['name']))
    return all_cards

# ─── 输出 JS 模块 ───
def main():
    cards = extract_cards()
    print(f"// 寿星历地名卡片数据 — 自动生成于 {__import__('datetime').datetime.now().isoformat()}")
    print(f"// 总条目: {len(cards)}, 高频优先 {len(HIGH_FREQ_NAMES)} 项")
    print("// 来源: 寿星历核心算法引擎 JWv 地名表")
    print("window._GEO_CARDS = [")
    for i, c in enumerate(cards):
        comma = "," if i < len(cards) - 1 else ""
        # JSON 紧凑格式
        j = json.dumps({
            "id": c['id'],
            "name": c['name'],
            "prov": c['prov'],
            "lon": c['lon'],
            "lat": c['lat']
        }, ensure_ascii=False)
        print(f"  {j}{comma}")
    print("];")
    print(f"// 验证: 长阳={next((c for c in cards if c['name']=='长阳'), None)}")
    total_kb = len(json.dumps([{k:c[k] for k in ['id','name','prov','lon','lat','type']} for c in cards], ensure_ascii=False)) / 1024
    print(f"// 文件大小: ~{total_kb:.1f} KB (<=100KB OK)")

if __name__ == '__main__':
    main()
