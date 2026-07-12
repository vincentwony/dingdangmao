# 紫微斗数十二宫神煞安星系统 — 设计文档

## 概述

在公信万年历八字排盘页面中，新增紫微斗数十二宫安星排盘功能。遵循《安星诀》推算体系，实现从命宫→五行局→十四主星→辅星→杂曜→四化星的完整安星流程，并将所有星曜归入十二宫展示，附带各星入宫详解。

**核心原则：**
- 不改动任何现有核心计算函数
- 所有新增代码追加在现有系统末尾
- 每步实现后独立验证
- 所有论断文字与计算结果动态绑定，禁止硬编码

---

## 体系差异：八字神煞 vs 紫微斗数

| 维度 | 八字神煞系（已有） | 紫微斗数系（新增） |
|------|------------------|------------------|
| 推算依据 | 天干地支直接映射 | 命宫→五行局→生日→紫微→推导 |
| 落位方式 | 落四柱（年/月/日/时） | 落十二宫（命/兄弟/夫妻/…） |
| 核心星曜 | 天乙、文昌、驿马等 ~30 个 | 十四主星 + 11 辅星 + 15 杂曜 + 四化 |
| 安星逻辑 | 离散映射（每柱独立计算） | 级联推导（上一步输出是下一步输入） |

---

## 架构设计

### 三层架构

```
┌────────────────────────────────────────────────────┐
│  计算引擎层（Phase 1-3）                            │
│  zwds_palaces → zwds_wuxingJu → zwds_ziwei         │
│  → zwds_14stars → zwds_sihua                       │
│  → zwds_auxStars → zwds_miscStars → zwds_buildPalaces │
│                                                    │
│  所有函数以 zwds_ 为前缀，全部追加在现有函数之后    │
├────────────────────────────────────────────────────┤
│  数据层（Phase 4）                                  │
│  ZiWei 全局对象（在 Bz 对象之后）：                 │
│  ├── starNature[star] → 星性表                     │
│  ├── starBrief[star] → 四维简析                    │
│  ├── palaceBrief[宫名] → 十二宫义                   │
│  ├── starInPalace[星名][宫名] → 168条主星入宫详解   │
│  ├── auxBrief[星名] → 辅星简释                     │
│  └── miscBrief[星名] → 杂曜简释                     │
├────────────────────────────────────────────────────┤
│  渲染层（Phase 5）                                  │
│  ├── 新增 CSS（~100 行，追加在 </style> 前）        │
│  ├── renderZiweiPalaces(chartData) → 十二宫总览表   │
│  ├── renderPalaceDetail(palaceName, stars) → 详解   │
│  └── ob.bzinfo 末尾拼接紫微斗数卡片                  │
└────────────────────────────────────────────────────┘
```

### 输入数据关系图

```
现有数据
  ├── ob.b1 (年柱60索引) → 年干 = b1%10, 年支 = b1%12
  ├── ob.b2 (月柱60索引) → 月支 = b2%12
  ├── ob.b3 (日柱60索引) → 日干 = b3%10, 日支 = b3%12
  ├── ob.b4 (时柱60索引) → 时支 = b4%12
  ├── ob.bz_Ny (农历年)
  ├── ob.bz_Nm (农历月)
  ├── ob.bz_Nd (农历日)
  ├── ob.bz_Jx (性别：1=男, 0=女)
  ├── MGxh (命宫60甲子索引，已在 ob.bzinfo 前计算)
  └── ShG  (身宫60甲子索引，已在 ob.bzinfo 前计算)
```

---

## Phase 1：十二宫框架搭建

### 1.1 十二宫定义

十二宫固定顺序（逆时针排列，命宫为起点）：

```
命宫 → 兄弟宫 → 夫妻宫 → 子女宫 → 财帛宫 → 疾厄宫
→ 迁移宫 → 交友宫（奴仆宫）→ 官禄宫 → 田宅宫 → 福德宫 → 父母宫
```

### 1.2 zwds_palaces(mgIdx)

**输入：** `mgIdx` — 命宫 60 甲子索引  
**输出：** `{ name, zhiIdx, zhiName, starName }[]` — 12 个元素数组

**算法：**
```javascript
function zwds_palaces(mgIdx) {
  var mgZhi = mgIdx % 12;  // 命宫地支索引
  var PALACE_NAMES = [
    '命宫','兄弟宫','夫妻宫','子女宫','财帛宫','疾厄宫',
    '迁移宫','交友宫','官禄宫','田宅宫','福德宫','父母宫'
  ];
  var MINGGONG_STAR_NAMES = [
    '天贵星','天厄星','天权星','天破星','天奸星','天文星',
    '天福星','天驿星','天孤星','天刃星','天艺星','天寿星'
  ];
  var palaces = [];
  for (var i = 0; i < 12; i++) {
    var zhiIdx = (mgZhi + i) % 12;
    palaces.push({
      name: PALACE_NAMES[i],
      zhiIdx: zhiIdx,
      zhiName: Lunar.Zhi[zhiIdx],
      starName: MINGGONG_STAR_NAMES[zhiIdx]
    });
  }
  return palaces;
}
```

### 1.3 zwds_wuxingJu(mgIdx)

**输入：** `mgIdx` — 命宫 60 甲子索引  
**输出：** `{ number: 2|3|4|5|6, name: '水二局'|'木三局'|'金四局'|'土五局'|'火六局' }`

**算法：** 命宫纳音 → 五行局查表
```javascript
function zwds_wuxingJu(mgIdx) {
  var nayin = Lunar.nayin(mgIdx); // 纳音名如'海中金'
  // 纳音五行提取
  var wx = nayin.charAt(1); // 纳音名第2字为五行：金/木/水/火/土
  var JU_TABLE = { '水': 2, '木': 3, '金': 4, '土': 5, '火': 6 };
  var JU_NAME = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
  return { number: JU_TABLE[wx], name: JU_NAME[JU_TABLE[wx]] };
}
```

### Phase 1 验证方法

```javascript
// 手工验证：以命例 b1=壬戌(58), b2=乙巳(41), b3=癸巳(29), b4=丁巳(53)
// n=58%5=3, y=58%12=10, s=53%12=5
// minggong 输出与 zwds_palaces 第一宫地支一致
```

---

## Phase 2：十四主星安星引擎

### 2.1 紫微星定位：zwds_ziwei(juNum, lunarDay)

**标准查表法：**

| 局 | 1日 | 2日 | 3日 | 4日 | 5日 | ... |
|----|-----|-----|-----|-----|-----|-----|
| 水二局 | 丑(1) | 寅(2) | 卯(3) | 巳(5) | 未(7) | +2, +2 跳过午/申的分组节奏 |
| 木三局 | 辰(4) | 午(6) | 申(8) | 戌(10) | 子(0) | +3, +1 循环 |
| 金四局 | 亥(11) | 丑(1) | 卯(3) | 巳(5) | 未(7) | +4, +2, +2 循环 |
| 土五局 | 午(6) | 亥(11) | 丑(1) | 卯(3) | 巳(5) | +5 递减 |
| 火六局 | 酉(9) | 亥(11) | 丑(1) | 卯(3) | 巳(5) | +6, +2, +2 循环 |

**实现方式：** 使用经典算法 `(lunarDay + offset[局]) % 地支数` 其中 `offset[局]` 为固定修正值。

```javascript
function zwds_ziwei(juNum, lunarDay) {
  // 紫微星安星表：juNum(2~6) × day(1~30) → 地支索引(0~11)
  var ZW_TABLE = {}; // 完整查表数据，编译时生成
  // 算法实现（经典公式）：
  var quotient = Math.floor((lunarDay - 1) / juNum);
  var remainder = (lunarDay - 1) % juNum;
  // 紫微星地支索引 = 根据局数和余数查表
  // 此处为简化表示，实际使用完整查表数据
  return ZW_TABLE[juNum][lunarDay];
}
```

> **实际实现使用完整 5 局 × 30 日查表**，避免公式误差。

### 2.2 十四主星自动推导：zwds_14stars(ziweiIdx)

**规则：** 紫微星位置确定后，其余 13 主星按固定位置关系自动推导。

```
紫微系（6星，逆时针排列）：
  紫微(n) → 天机(n-1) → （空一格）→ 太阳(n-3) → 武曲(n-4) → 天同(n-5) → （空二格）→ 廉贞(n-8)

天府系（8星，以天府为对称轴）：
  天府 = (12 - 紫微地支) （以寅申线为轴的镜像）
  天府(n) → 太阴(n+1) → 贪狼(n+2) → 巨门(n+3) → 天相(n+4) → 天梁(n+5) → 七杀(n+6) → （空三格）→ 破军(n+10)
```

**输出：** `{ 紫微: zhiIdx, 天机: zhiIdx, ... }` — 14 个星名→地支索引映射

### 2.3 四化星：zwds_sihua(yearGan, stars14)

**天干四化对照表：**

| 年干 | 化禄 | 化权 | 化科 | 化忌 |
|------|------|------|------|------|
| 甲(0) | 廉贞 | 破军 | 武曲 | 太阳 |
| 乙(1) | 天机 | 天梁 | 紫微 | 太阴 |
| 丙(2) | 天同 | 天机 | 文昌 | 廉贞 |
| 丁(3) | 太阴 | 天同 | 天机 | 巨门 |
| 戊(4) | 贪狼 | 太阴 | 右弼 | 天机 |
| 己(5) | 武曲 | 贪狼 | 天梁 | 文曲 |
| 庚(6) | 太阳 | 武曲 | 太阴 | 天同 |
| 辛(7) | 巨门 | 太阳 | 文曲 | 文昌 |
| 壬(8) | 天梁 | 紫微 | 左辅 | 武曲 |
| 癸(9) | 破军 | 巨门 | 太阴 | 贪狼 |

**输出：** `{ 化禄: starName, 化权: starName, 化科: starName, 化忌: starName }` — 四个化星→主星名的映射

**落宫推导：** 四化星不在单独位置，而是"附身"在主星上——若主星在命宫，化禄也在命宫；若主星不在任何宫→四化不显示。

### Phase 2 验证方法

以已知命例验证：命宫=子(0)，土五局(5)，农历十五日 → 紫微星应在卯(3)。

---

## Phase 3：辅星+杂曜安星引擎

### 3.1 辅星安星规则：zwds_auxStars(b1, b2, b4)

| 辅星 | 起法 | 规则 | 落位 |
|------|------|------|------|
| 文昌 | 日干 | 甲→巳, 乙→午, 丙→申, 丁→酉, 戊→申, 己→酉, 庚→亥, 辛→子, 壬→寅, 癸→卯 | 地支索引 |
| 文曲 | 日干 | 亥→巳, 子→午, 丑→申, 寅→酉, 卯→申, 辰→酉, 巳→亥, 午→子, 未→寅, 申→卯 | 地支索引 |
| 左辅 | 月支 | 正月(寅)→辰, 二月(卯)→巳, ... +2 逐月 | 地支索引 |
| 右弼 | 月支 | 正月(寅)→戌, 二月(卯)→酉, ... -1 逐月 | 地支索引 |
| 天魁 | 年干 | 甲→丑, 乙→子, 丙→亥, ... | 地支索引 |
| 天钺 | 年干 | 甲→未, 乙→申, 丙→酉, ... | 地支索引 |
| 禄存 | 年干 | 甲→寅, 乙→卯, 丙→巳, 丁→午, 戊→巳, 己→午, 庚→申, 辛→酉, 壬→亥, 癸→子 | 地支索引 |
| 擎羊 | 年干 | 禄存地支 +1（顺行） | 地支索引 |
| 陀罗 | 年干 | 禄存地支 -1（逆行） | 地支索引 |
| 火星 | 年支 | 寅午戌→丑, 申子辰→寅, 巳酉丑→酉, 亥卯未→戌 | 时支修正 |
| 铃星 | 年支 | 火星规则的同组后一地支 | 时支修正 |
| 天马 | 年支 | 寅午戌→申, 申子辰→寅, 巳酉丑→亥, 亥卯未→巳 | 地支索引 |

### 3.2 杂曜安星规则：zwds_miscStars(b1, b2, b3, lunarMonth, lunarDay)

| 杂曜 | 起法 | 规则 |
|------|------|------|
| 红鸾 | 年支 | 子→卯, 丑→寅, 寅→丑, 卯→子, 辰→亥, 巳→戌, 午→酉, 未→申, 申→未, 酉→午, 戌→巳, 亥→辰 |
| 天喜 | 年支 | 红鸾对冲（红鸾+6 mod 12） |
| 天刑 | 月支 | 正月(寅)→酉, 以后每月 +1 |
| 天姚 | 月支 | 丑→寅, 寅→丑, 卯→午,...（另有固定查表） |
| 地空 | 日支 | 子→丑-4=...（另有固定查表） |
| 地劫 | 日支 | 地空后一位 |
| 三台 | 日支 | 另有固定查表 |
| 八座 | 日支 | 三台后一位 |
| 恩光 | 日干 | 另有固定查表 |
| 天贵 | 日干 | 另有固定查表 |
| 天哭 | 年支 | 另有固定查表 |
| 天虚 | 年支 | 天哭后一位 |
| 龙池 | 年支 | 另有固定查表 |
| 凤阁 | 年支 | 龙池后一位 |
| 台辅 | 月支 | 另有固定查表 |
| 封诰 | 月支 | 台辅后一位 |

> **注意：** 上表中标注"另有固定查表"的杂曜，实现时使用完整的 12×N 查表数据，避免算法误差。

### 3.3 汇总归宫：zwds_buildPalaces(...)

**输入：** 十二宫数组 + 主星落位 + 辅星落位 + 杂曜落位 + 四化落位  
**输出：**
```javascript
[
  {
    name: '命宫',
    zhiIdx: 2,       // 地支索引
    zhiName: '寅',
    starName: '天权星',
    mainStars: ['紫微','天府'],    // 十四主星（可空）
    auxStars: ['文昌','天魁'],     // 辅星（可空）
    miscStars: ['红鸾'],           // 杂曜（可空）
    siHua: [{ star: '太阳', type: '禄' }]  // 四化（可空）
  },
  // ... 其余11宫
]
```

### Phase 3 验证方法

手工排一例八字，对照紫微斗数专业排盘结果，逐星逐宫核对落位。

---

## Phase 4：数据层（ZiWei 解释文字库）

### 4.1 新增位置

在 `Bz` 全局对象定义之后（约第 7950 行区域），新增 `var ZiWei = {}` 对象。

### 4.2 数据结构完整定义

```javascript
var ZiWei = {
  // ── 十四主星星性 ──
  starNature: {
    '紫微': '吉', '天机': '吉', '太阳': '吉', '武曲': '吉',
    '天同': '吉', '廉贞': '吉凶', '天府': '吉', '太阴': '吉',
    '贪狼': '凶', '巨门': '凶', '天相': '吉', '天梁': '吉',
    '七杀': '凶', '破军': '凶'
  },
  starWuXing: {
    '紫微': '土', '天机': '木', '太阳': '火', '武曲': '金',
    '天同': '水', '廉贞': '火', '天府': '土', '太阴': '水',
    '贪狼': '木', '巨门': '水', '天相': '水', '天梁': '土',
    '七杀': '金', '破军': '水'
  },
  
  // ── 主星四维简析（每星 ~300 字）──
  starBrief: {
    '紫微': { 个性:'...', 事业:'...', 财帛:'...', 感情:'...' },
    // ... 13 条
  },
  
  // ── 十二宫基础含义（每宫 ~80 字）──
  palaceBrief: {
    '命宫': '命宫为十二宫之枢纽，看人之相貌、才智、性情……',
    // ... 11 条
  },
  
  // ── 主星入宫详解（14星 × 12宫 = 168条，每条约 200 字）──
  starInPalace: {
    '紫微': {
      '命宫': '紫微坐命，帝王之性，气质高贵，有领导才能……',
      '兄弟宫': '紫微在兄弟宫，兄弟中有人出众……',
      // ... 10 宫
    },
    // '天机': { ... },
    // ... 12 组
  },
  
  // ── 辅星简释（每星 ~60 字）──
  auxBrief: {
    '文昌': '文昌为文星，主才学、文笔、考试……',
    // ... 10 条
  },
  
  // ── 杂曜简释（每星 ~60 字）──
  miscBrief: {
    '红鸾': '红鸾主婚姻喜事，入命异性缘佳……',
    // ... 14 条
  },
  
  // ── 四化释义 ──
  siHuaBrief: {
    '禄': '主福气、财禄、人缘，所落宫位得利',
    '权': '主权势、竞争、掌控，所落宫位强势',
    '科': '主名声、学识、贵人，所落宫位清贵',
    '忌': '主阻滞、执着、困扰，所落宫位多磨'
  }
};
```

### 4.4 数据完整性校验规则

实现时必须遵循的校验规则：

1. **星名一致性：** `ZiWei.starBrief` 的键名必须与 `zwds_14stars()` 返回值中的星名完全一致
2. **宫名一致性：** `ZiWei.starInPalace[星]` 的子键名必须与 `zwds_palaces()` 返回值中的宫名完全一致
3. **空值防护：** 若某星不在某宫，`ZiWei.starInPalace[星][宫]` 可以不存在（返回空字符串静默跳过，不使用 placeholder）
4. **禁止拼接固定字符串输出：** 所有文字必须从 ZiWei 对象读取，不能在渲染函数中直接写 "紫微坐命……" 等固定字符串

---

## Phase 5：渲染层

### 5.1 CSS 新增（追加在 `</style>` 之前，约 100 行）

主要 CSS 类：

```css
/* 紫微斗数十二宫表格 */
.ziwei-palace-table { display: grid; grid-template-columns: repeat(12, minmax(80px, 1fr)); gap: 2px; overflow-x: auto; }
.ziwei-palace-col { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 8px 4px; text-align: center; min-height: 80px; }
.ziwei-palace-header { font-weight: 700; font-size: 13px; color: var(--text-heading); }
.ziwei-palace-zhi { font-size: 10px; color: var(--text-muted); }
.ziwei-palace-star-name { font-size: 10px; color: var(--color-gold-pale); }

/* 主星样式 */
.ziwei-star-main { font-weight: 700; font-size: 14px; line-height: 1.6; }
.ziwei-star-main.ziwei-ji { color: var(--color-gold); }
.ziwei-star-main.ziwei-xiong { color: var(--color-cinnabar); }
.ziwei-star-main.ziwei-ji-xiong { color: var(--color-warning); }

/* 辅星样式 */
.ziwei-star-aux { font-size: 12px; line-height: 1.5; color: var(--text-secondary); }

/* 杂曜样式 */
.ziwei-star-misc { font-size: 11px; line-height: 1.4; color: var(--text-muted); }

/* 四化角标 */
.ziwei-si-hua { font-size: 9px; font-weight: 700; margin-left: 2px; padding: 0 3px; border-radius: 3px; }
.ziwei-si-hua-lu { background: #E8F5E9; color: #2E7D32; }
.ziwei-si-hua-quan { background: #FFF3E0; color: #E65100; }
.ziwei-si-hua-ke { background: #E3F2FD; color: #1565C0; }
.ziwei-si-hua-ji { background: #FFEBEE; color: #C62828; }

/* 命宫高亮 */
.ziwei-palace-ming { border: 2px solid var(--color-gold); background: var(--bg-card-raised); }
.ziwei-palace-shen { border: 1px dashed var(--color-gold); }

/* 宫位详解弹出/展开区 */
.ziwei-detail-panel { padding: var(--space-md); border-top: 1px solid var(--border-light); }
.ziwei-detail-section { margin-bottom: var(--space-sm); }
.ziwei-detail-section h4 { color: var(--color-gold); font-size: 14px; margin-bottom: 4px; }

/* 响应式 */
@media (max-width: 768px) {
  .ziwei-palace-table { grid-template-columns: repeat(12, 75px); }
}
```

### 5.2 渲染函数

```javascript
// renderZiweiPalaces(chartData) → 总览表 HTML 字符串
// 输出结构：
// <div class="ziwei-palace-table">
//   12 × <div class="ziwei-palace-col">
//     <div class="ziwei-palace-header">宫名</div>
//     <div class="ziwei-palace-zhi">地支</div>
//     <div class="ziwei-palace-star-name">星性名</div>
//     <div class="ziwei-star-main ziwei-ji/xiong">主星列表</div>
//     <div class="ziwei-star-aux">辅星列表</div>
//     <div class="ziwei-star-misc">杂曜列表</div>
//     （四化角标附在主星后）
//   </div>
// </div>
```

### 5.3 卡片插入位置

在 `ob.bzinfo` 拼接字符串末尾（日柱论断卡片之后）追加：

```javascript
// 紫微斗数卡片（仅在排盘后显示）
ob.bzinfo += '<div class="card card-accent-purple" data-card-id="bz_ziwei">'
  + '<div class="card-header" onclick="toggleBaziCardCollapse(this)">'
  + '<span><i class="ti ti-stars"></i> 紫微斗数 · 十二宫</span>'
  + '<i class="ti ti-chevron-down card-collapse-icon"></i></div>'
  + '<div class="card-body">'
  + zwdsCardContent  // 由 renderZiweiPalaces 生成
  + '</div></div>';
```

### 5.4 折叠状态

在 `ANALYSIS_CARDS` 白名单中新增 `bz_ziwei: true`（默认展开），由现有的 `_restoreBaziCollapseState` / `_initBaziCollapsibles` 统一管理，不新增特殊逻辑。

---

## 执行计划

### 分 5 个 Phase，每 Phase 独立验证

| Phase | 内容 | 新增函数 | 改动行数（估） | 验证方法 |
|-------|------|---------|-------------|---------|
| 1 | 十二宫框架 | `zwds_palaces`, `zwds_wuxingJu` | ~60 行 JS | 命宫地支与 minggong 输出一致 |
| 2 | 十四主星引擎 | `zwds_ziwei`, `zwds_14stars`, `zwds_sihua` | ~120 行 JS | 3 个命例手工验算紫微星位置 |
| 3 | 辅星+杂曜 | `zwds_auxStars`, `zwds_miscStars`, `zwds_buildPalaces` | ~200 行 JS | 对照专业排盘软件逐宫核对 |
| 4 | 数据层 | `ZiWei` 全局对象 | ~500 行 JS | 键名一致性 grep 验证 |
| 5 | 渲染层 | `renderZiweiPalaces`, CSS, 卡片插入 | ~200 行 JS + ~100 行 CSS | 浏览器启动排盘→视觉验证 |

### 每次修改前后

1. **改前：** 备份 `index.html` 到 `Back/` 文件夹
2. **改后：** 语法检查 + HTML 标签平衡检查
3. **验证：** 启动 `npx serve` 浏览器验证

### 不允许的操作

- ❌ 修改 `minggong()` / `shengong()` / `mingLiBaZi()` / `ML_calc()` 等现有函数
- ❌ 修改 `gg1`-`gg4` 的计算逻辑
- ❌ 修改 Bz 对象中的任何数据
- ❌ 修改现有的 `.card` / `.card-header` / `.card-body` CSS 类
- ❌ 删除或替换任何现有变量/函数
- ✅ 只在文件末尾追加新代码

---

## 确定性声明

| 内容 | 确定性 |
|------|--------|
| 十二宫框架：命宫→逆时针排12宫 | **确定** — 紫微斗数标准规则 |
| 五行局：命宫纳音→五行局 | **确定** — 古典公式，纳音已由 Lunar.nayin 提供 |
| 十四主星安星法：紫微→系→天府→系 | **确定** — 《安星诀》标准推导 |
| 四化星：年干→四化映射表 | **确定** — 标准天干四化表 |
| 辅星/杂曜安星规则 | **确定** — 各古籍来源一致 |
| 与现有八字系统的隔离 | **确定** — 全部新函数 zwds_ 前缀，b1-b4 只读 |
| 数据完整性校验 | **确定** — 渲染前逐条校验星名/宫名 |
| ZiWei 对象的古文内容 | **不确定** — 此为推测，需人工审核每条论断的准确性 |
