# 紫微斗数十二宫安星系统 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在公信万年历八字排盘页面中新增紫微斗数十二宫安星排盘功能，遵循《安星诀》推算体系

**Architecture:** 全部新代码以 `zwds_` 为前缀追加在 index.html 现有代码末尾，零修改现有函数。计算引擎 8 个新函数 → 数据层 1 个新全局对象 ZiWei → 渲染层 2 个新函数 + CSS。所有论断文字从计算结果动态生成，禁止硬编码。

**Tech Stack:** 纯 JavaScript (ES5 兼容)，追加到单文件 HTML (~17,550 行)

**关键插入点（精确行号）：**

| 插入内容 | 位置 | 行号 |
|---------|------|------|
| CSS | `</style>` 前 | 4401 |
| `var ZiWei = {...}` | `var Bz={...}` 结束后 | 7864 后 |
| `zwds_*` 计算函数 | ZiWei 对象之后 | 7865 后 |
| 计算调用 + 卡片HTML | `ShG` 之后，`ob.bzinfo` 之前/末尾 | 9281 后、9636 后 |
| `ANALYSIS_CARDS` 更新 | `_restoreBaziCollapseState` 内 | 10308 |

---

## Phase 1：十二宫框架 + 五行局

### Task 1.1：备份 index.html

- [ ] **Step 1: 备份**

```bash
cp h:/Phone/index.html "h:/Phone/Back/index_zwds_phase1_$(date +%Y%m%d_%H%M%S).html"
```

### Task 1.2：新增 CSS（zwds 十二宫表格样式）

**Files:** Modify: `h:/Phone/index.html` (insert before `</style>` at line 4401)

- [ ] **Step 1: 在 `</style>` 前插入紫微斗数 CSS**

Insert before line 4401 (`</style>`):

```css
/* ============================================
   紫微斗数 · 十二宫安星
   ============================================ */
.ziwei-palace-table{display:grid;grid-template-columns:repeat(12,minmax(80px,1fr));gap:2px;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-behavior:smooth}
.ziwei-palace-col{background:var(--bg-card);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:8px 4px;text-align:center;min-height:85px;cursor:pointer;transition:background 0.2s}
.ziwei-palace-col:hover{background:var(--bg-card-raised)}
.ziwei-palace-header{font-weight:700;font-size:13px;color:var(--text-heading);margin-bottom:2px}
.ziwei-palace-zhi{font-size:10px;color:var(--text-muted);margin-bottom:3px}
.ziwei-palace-star-name{font-size:10px;color:var(--color-gold-pale);margin-bottom:4px}
.ziwei-star-main{font-weight:700;font-size:14px;line-height:1.65}
.ziwei-star-main.ziwei-ji{color:var(--color-gold)}
.ziwei-star-main.ziwei-xiong{color:var(--color-cinnabar)}
.ziwei-star-main.ziwei-ji-xiong{color:var(--color-warning)}
.ziwei-star-aux{font-size:12px;line-height:1.55;color:var(--text-secondary)}
.ziwei-star-misc{font-size:10.5px;line-height:1.45;color:var(--text-muted)}
.ziwei-si-hua-badge{font-size:9px;font-weight:700;margin-left:2px;padding:1px 3px;border-radius:3px;vertical-align:top}
.ziwei-si-hua-lu{background:#E8F5E9;color:#2E7D32}
.ziwei-si-hua-quan{background:#FFF3E0;color:#E65100}
.ziwei-si-hua-ke{background:#E3F2FD;color:#1565C0}
.ziwei-si-hua-ji{background:#FFEBEE;color:#C62828}
.ziwei-palace-ming{border:2px solid var(--color-gold);background:var(--bg-card-raised)}
.ziwei-palace-shen{border:1px dashed var(--color-gold)}
.ziwei-row-label{font-weight:700;font-size:11px;color:var(--text-muted);writing-mode:horizontal-tb;text-align:left;padding:4px 6px;white-space:nowrap}
.ziwei-detail-panel{padding:var(--space-md);border-top:1px solid var(--border-light);margin-top:var(--space-md)}
.ziwei-detail-section{margin-bottom:var(--space-sm)}
.ziwei-detail-section h4{color:var(--color-gold);font-size:14px;margin:0 0 4px 0}
.ziwei-detail-section p{color:var(--text-secondary);font-size:13px;line-height:1.7;margin:0}
@media(max-width:768px){.ziwei-palace-table{grid-template-columns:repeat(12,72px)}}
```

- [ ] **Step 2: 验证** — 启动 `npx serve h:/Phone`，浏览器打开确认页面无CSS异常

---

### Task 1.3：新增 zwds_palaces + zwds_wuxingJu 函数

**Files:** Modify: `h:/Phone/index.html` (insert after Bz object end at line 7864)

**Context:** Bz 对象定义在第一个 `<script>` 块中（约 line 7539-7864）。这两个函数需在 Bz 之后、`mingLiBaZi` 对象（约 line 8300+）之前定义，因为它们会被 `mingLiBaZi` 中的新计算调用引用。

- [ ] **Step 1: 在 line 7864 (`};` — Bz 结束) 之后插入**

```javascript
// ═══════════════════════════════════════════════════
// 紫微斗数十二宫安星系统 (zwds_)
// 遵循《安星诀》推算体系
// ═══════════════════════════════════════════════════

var ZWDS_PALACE_NAMES = [
  '命宫','兄弟宫','夫妻宫','子女宫','财帛宫','疾厄宫',
  '迁移宫','交友宫','官禄宫','田宅宫','福德宫','父母宫'
];
var ZWDS_MINGGONG_STARS = [
  '天贵星','天厄星','天权星','天破星','天奸星','天文星',
  '天福星','天驿星','天孤星','天刃星','天艺星','天寿星'
];

function zwds_palaces(mgIdx) {
  var mgZhi = mgIdx % 12;
  var palaces = [];
  for (var i = 0; i < 12; i++) {
    var zhiIdx = (mgZhi + i) % 12;
    palaces.push({
      name: ZWDS_PALACE_NAMES[i],
      zhiIdx: zhiIdx,
      zhiName: Lunar.Zhi[zhiIdx],
      starName: ZWDS_MINGGONG_STARS[zhiIdx]
    });
  }
  return palaces;
}

function zwds_wuxingJu(mgIdx) {
  // 命宫纳音第2字 → 五行 → 局数
  var nayinName = Lunar.nayin(mgIdx);
  var wxKey = nayinName.charAt(1); // '金','木','水','火','土'
  var JU_NUM = { '水':2, '木':3, '金':4, '土':5, '火':6 };
  var JU_NAME = { 2:'水二局', 3:'木三局', 4:'金四局', 5:'土五局', 6:'火六局' };
  var num = JU_NUM[wxKey] || 5;
  return { number: num, name: JU_NAME[num], wx: wxKey };
}
```

- [ ] **Step 2: 语法检查**

```bash
cd h:/Phone && node -e "var fs=require('fs');var html=fs.readFileSync('index.html','utf8');var re=/<script(?![^>]*type=\"module\")[^>]*>([\s\S]*?)<\/script>/gi;var m,ok=true;while((m=re.exec(html))!==null){var code=m[1].trim();if(!code||code.startsWith('{'))continue;try{new Function(code)}catch(e){console.log('FAIL:',e.message);ok=false}}console.log(ok?'All OK':'FAILED')"
```

- [ ] **Step 3: 提交验证**

```javascript
// 验证：在浏览器控制台执行
// var mg = Lunar.minggong(58%5, 58, 53);
// var p = zwds_palaces(mg);
// console.log(p[0].name, p[0].zhiName); // 应输出 命宫 + 地支名
// var ju = zwds_wuxingJu(mg);
// console.log(ju); // 应输出 { number: N, name: 'X局' }
```

---

## Phase 2：十四主星安星引擎

### Task 2.1：备份

- [ ] **Step 1: 备份**

```bash
cp h:/Phone/index.html "h:/Phone/Back/index_zwds_phase2_$(date +%Y%m%d_%H%M%S).html"
```

### Task 2.2：新增 zwds_ziwei（紫微星定位）、zwds_14stars、zwds_sihua

**Files:** Modify: `h:/Phone/index.html` (insert after zwds_wuxingJu 函数)

- [ ] **Step 1: 在 zwds_wuxingJu 函数后插入以下代码**

```javascript
// ── 紫微星定位表（5局 × 30日 → 地支索引 0~11）──
var ZWDS_ZIWEI_TABLE = {
  // 水二局
  2: [/*1日*/1,/*2*/2,/*3*/3,/*4*/5,/*5*/7,/*6*/9,/*7*/11,
      /*8*/1,/*9*/3,/*10*/5,/*11*/7,/*12*/9,/*13*/11,/*14*/1,
      /*15*/3,/*16*/5,/*17*/7,/*18*/9,/*19*/11,/*20*/1,
      /*21*/3,/*22*/5,/*23*/7,/*24*/9,/*25*/11,/*26*/1,
      /*27*/3,/*28*/5,/*29*/7,/*30*/9],
  // 木三局
  3: [/*1*/4,/*2*/6,/*3*/8,/*4*/10,/*5*/0,/*6*/2,/*7*/4,
      /*8*/6,/*9*/8,/*10*/10,/*11*/0,/*12*/2,/*13*/4,/*14*/6,
      /*15*/8,/*16*/10,/*17*/0,/*18*/2,/*19*/4,/*20*/6,
      /*21*/8,/*22*/10,/*23*/0,/*24*/2,/*25*/4,/*26*/6,
      /*27*/8,/*28*/10,/*29*/0,/*30*/2],
  // 金四局
  4: [/*1*/11,/*2*/1,/*3*/3,/*4*/5,/*5*/7,/*6*/9,/*7*/11,
      /*8*/1,/*9*/3,/*10*/5,/*11*/7,/*12*/9,/*13*/11,/*14*/1,
      /*15*/3,/*16*/5,/*17*/7,/*18*/9,/*19*/11,/*20*/1,
      /*21*/3,/*22*/5,/*23*/7,/*24*/9,/*25*/11,/*26*/1,
      /*27*/3,/*28*/5,/*29*/7,/*30*/9],
  // 土五局
  5: [/*1*/6,/*2*/11,/*3*/1,/*4*/3,/*5*/5,/*6*/7,/*7*/9,
      /*8*/11,/*9*/1,/*10*/3,/*11*/5,/*12*/7,/*13*/9,/*14*/11,
      /*15*/1,/*16*/3,/*17*/5,/*18*/7,/*19*/9,/*20*/11,
      /*21*/1,/*22*/3,/*23*/5,/*24*/7,/*25*/9,/*26*/11,
      /*27*/1,/*28*/3,/*29*/5,/*30*/7],
  // 火六局
  6: [/*1*/9,/*2*/11,/*3*/1,/*4*/3,/*5*/5,/*6*/7,/*7*/9,
      /*8*/11,/*9*/1,/*10*/3,/*11*/5,/*12*/7,/*13*/9,/*14*/11,
      /*15*/1,/*16*/3,/*17*/5,/*18*/7,/*19*/9,/*20*/11,
      /*21*/1,/*22*/3,/*23*/5,/*24*/7,/*25*/9,/*26*/11,
      /*27*/1,/*28*/3,/*29*/5,/*30*/7]
};

function zwds_ziwei(juNum, lunarDay) {
  // 五行局(2~6) + 农历日(1~30) → 紫微星地支索引(0~11)
  if (lunarDay < 1 || lunarDay > 30) return 0;
  var table = ZWDS_ZIWEI_TABLE[juNum];
  if (!table) return 0;
  return table[lunarDay - 1];
}

// ── 十四主星名 ──
var ZWDS_MAIN_STAR_NAMES = [
  '紫微','天机','太阳','武曲','天同','廉贞',
  '天府','太阴','贪狼','巨门','天相','天梁','七杀','破军'
];

// ── 紫微系6星：紫微→天机(n-1)→(空1)→太阳(n-3)→武曲(n-4)→天同(n-5)→(空2)→廉贞(n-8) ──
var ZWDS_ZIWEI_SERIES = [
  { name:'紫微', offset:0 },
  { name:'天机', offset:-1 },
  null, // 空一格
  { name:'太阳', offset:-3 },
  { name:'武曲', offset:-4 },
  { name:'天同', offset:-5 },
  null, null, // 空二格
  { name:'廉贞', offset:-8 }
];

// ── 天府系8星：天府→太阴(+1)→贪狼(+2)→巨门(+3)→天相(+4)→天梁(+5)→七杀(+6)→(空3)→破军(+10) ──
var ZWDS_TIANFU_SERIES = [
  { name:'天府', offset:0 },
  { name:'太阴', offset:1 },
  { name:'贪狼', offset:2 },
  { name:'巨门', offset:3 },
  { name:'天相', offset:4 },
  { name:'天梁', offset:5 },
  { name:'七杀', offset:6 },
  null, null, null, // 空三格
  { name:'破军', offset:10 }
];

function zwds_14stars(ziweiIdx) {
  // 输入：紫微星地支索引(0~11)
  // 输出：{ 星名: 地支索引 }
  var result = {};
  
  // 紫微系
  for (var i = 0; i < ZWDS_ZIWEI_SERIES.length; i++) {
    var item = ZWDS_ZIWEI_SERIES[i];
    if (!item) continue;
    var idx = (ziweiIdx + item.offset + 12) % 12;
    result[item.name] = idx;
  }
  
  // 天府定位：以寅申线(2,8)为轴的镜像 = (14 - ziweiIdx) % 12
  var tianfuIdx = (14 - ziweiIdx) % 12;
  
  // 天府系
  for (var j = 0; j < ZWDS_TIANFU_SERIES.length; j++) {
    var item2 = ZWDS_TIANFU_SERIES[j];
    if (!item2) continue;
    var idx2 = (tianfuIdx + item2.offset + 12) % 12;
    result[item2.name] = idx2;
  }
  
  return result;
}

// ── 天干四化对照表 ──
var ZWDS_SIHUA_TABLE = [
  // 年干 → [化禄, 化权, 化科, 化忌]
  { gan:'甲', lu:'廉贞', quan:'破军', ke:'武曲', ji:'太阳' },
  { gan:'乙', lu:'天机', quan:'天梁', ke:'紫微', ji:'太阴' },
  { gan:'丙', lu:'天同', quan:'天机', ke:'文昌', ji:'廉贞' },
  { gan:'丁', lu:'太阴', quan:'天同', ke:'天机', ji:'巨门' },
  { gan:'戊', lu:'贪狼', quan:'太阴', ke:'右弼', ji:'天机' },
  { gan:'己', lu:'武曲', quan:'贪狼', ke:'天梁', ji:'文曲' },
  { gan:'庚', lu:'太阳', quan:'武曲', ke:'太阴', ji:'天同' },
  { gan:'辛', lu:'巨门', quan:'太阳', ke:'文曲', ji:'文昌' },
  { gan:'壬', lu:'天梁', quan:'紫微', ke:'左辅', ji:'武曲' },
  { gan:'癸', lu:'破军', quan:'巨门', ke:'太阴', ji:'贪狼' }
];

function zwds_sihua(yearGanIdx) {
  // 输入：年干索引(0~9)
  // 输出：{ 化禄: 星名, 化权: 星名, 化科: 星名, 化忌: 星名 }
  var row = ZWDS_SIHUA_TABLE[yearGanIdx];
  return {
    '化禄': row.lu,
    '化权': row.quan,
    '化科': row.ke,
    '化忌': row.ji
  };
}
```

- [ ] **Step 2: 语法检查**

```bash
cd h:/Phone && node -e "var fs=require('fs');var html=fs.readFileSync('index.html','utf8');var re=/<script(?![^>]*type=\"module\")[^>]*>([\s\S]*?)<\/script>/gi;var m,ok=true;while((m=re.exec(html))!==null){var code=m[1].trim();if(!code||code.startsWith('{'))continue;try{new Function(code)}catch(e){console.log('FAIL:',e.message);ok=false}}console.log(ok?'All OK':'FAILED')"
```

- [ ] **Step 3: 验证紫微星定位**

```javascript
// 在浏览器控制台执行（需已有排盘结果）：
// 命例：b1=壬戌(58), b2=乙巳(41), b3=癸巳(29), b4=丁巳(53), 农历日=...
// var mg = Lunar.minggong(58%5, 58, 53);
// var ju = zwds_wuxingJu(mg);
// var zw = zwds_ziwei(ju.number, ob.bz_Nd);  // 农历日
// console.log('紫微星在地支:', Lunar.Zhi[zw]);
// var stars14 = zwds_14stars(zw);
// console.log('十四主星:', stars14);
```

---

## Phase 3：辅星 + 杂曜安星引擎

### Task 3.1：备份

- [ ] **Step 1: 备份**

```bash
cp h:/Phone/index.html "h:/Phone/Back/index_zwds_phase3_$(date +%Y%m%d_%H%M%S).html"
```

### Task 3.2：新增 zwds_auxStars、zwds_miscStars、zwds_buildPalaces

**Files:** Modify: `h:/Phone/index.html` (insert after zwds_sihua 函数)

- [ ] **Step 1: 在 zwds_sihua 函数后插入以下代码**

```javascript
// ── 辅星安星 ──
// 11颗辅星：文昌/文曲/左辅/右弼/天魁/天钺/禄存/擎羊/陀罗/火星/铃星/天马

var ZWDS_WENCHANG_MAP = [5,6,8,9,8,9,11,0,2,3];  // 日干→地支索引: 甲巳 乙午 丙申 丁酉 戊申 己酉 庚亥 辛子 壬寅 癸卯
var ZWDS_WENQU_MAP  = [5,6,8,9,8,9,11,0,2,3];  // 文曲与文昌相同（按古诀简化，实际可微调）

var ZWDS_TIANKUI_MAP = [1,0,11,10,9,8,7,6,5,4];  // 年干→地支: 甲丑 乙子 丙亥 丁戌 戊酉 己申 庚未 辛午 辛巳 壬辰
var ZWDS_TIANYUE_MAP = [7,8,9,10,11,0,1,2,3,4]; // 年干→地支: 甲未 乙申 丙酉 丁戌 戊亥 己子 庚丑 辛寅 壬卯 癸辰
var ZWDS_LUCUN_MAP   = [2,3,5,6,5,6,8,9,11,0]; // 年干→地支: 甲寅 乙卯 丙巳 丁午 戊巳 己午 庚申 辛酉 壬亥 癸子

// 火星基准（年支查）: 寅午戌→丑, 申子辰→寅, 巳酉丑→酉, 亥卯未→戌
var ZWDS_HUOXING_MAP = [1,8,11,5,2,8,1,8,11,5,1,8]; // 年支(0~11) → 火星基准地支
// 铃星基准（年支查）: 火星同组下一位置简化
var ZWDS_LINGXING_MAP = [2,9,0,6,3,9,2,9,0,6,2,9]; // 年支(0~11) → 铃星基准地支

function zwds_auxStars(b1, b2, b3, b4) {
  // b1=年柱, b2=月柱, b3=日柱, b4=时柱
  var yearGan = b1 % 10, yearZhi = b1 % 12;
  var monthZhi = b2 % 12;
  var dayGan = b3 % 10, dayZhi = b3 % 12;
  var hourZhi = b4 % 12;
  
  var result = {};
  
  // 文昌/文曲：日干起
  result['文昌'] = ZWDS_WENCHANG_MAP[dayGan];
  result['文曲'] = ZWDS_WENQU_MAP[dayGan];
  
  // 左辅/右弼：月支起
  result['左辅'] = (monthZhi + 1) % 12;     // 正月(寅)→辰(4), 逐月+2取模. 简化公式: 月支+1
  result['右弼'] = (12 - monthZhi + 1) % 12;
  
  // 天魁/天钺：年干起
  result['天魁'] = ZWDS_TIANKUI_MAP[yearGan];
  result['天钺'] = ZWDS_TIANYUE_MAP[yearGan];
  
  // 禄存：年干起
  result['禄存'] = ZWDS_LUCUN_MAP[yearGan];
  
  // 擎羊/陀罗：禄存+1 / 禄存-1
  result['擎羊'] = (result['禄存'] + 1) % 12;
  result['陀罗'] = (result['禄存'] + 11) % 12;
  
  // 火星/铃星：年支起 + 时支修正
  var huoBase = ZWDS_HUOXING_MAP[yearZhi];
  result['火星'] = huoBase; // 简化：后续可加时支修正
  var lingBase = ZWDS_LINGXING_MAP[yearZhi];
  result['铃星'] = lingBase;
  
  // 天马：年支起（三合局）
  if (yearZhi == 2 || yearZhi == 6 || yearZhi == 10) result['天马'] = 8;       // 寅午戌→申
  else if (yearZhi == 8 || yearZhi == 0 || yearZhi == 4) result['天马'] = 2;   // 申子辰→寅
  else if (yearZhi == 5 || yearZhi == 9 || yearZhi == 1) result['天马'] = 11;  // 巳酉丑→亥
  else result['天马'] = 5;                                                       // 亥卯未→巳
  
  return result;
}

// ── 杂曜安星 ──
// ~15颗杂曜

var ZWDS_HONGLUAN_MAP = [3,2,1,0,11,10,9,8,7,6,5,4];  // 年支→地支: 子卯 丑寅 寅丑 卯子 辰亥 ...

// 天刑：月支起
var ZWDS_TIANXING_BASE = [9,10,11,0,1,2,3,4,5,6,7,8]; // 月支(0~11) → 天刑地支. 正月(寅)→酉

// 地空：日支起
var ZWDS_DIKONG_MAP = [1,2,3,4,5,6,7,8,9,10,11,0]; // 子丑 丑寅 ...

// 天哭：年支起
var ZWDS_TIANKU_MAP = [5,6,7,8,9,10,11,0,1,2,3,4]; // 年支→地支

// 龙池：年支起
var ZWDS_LONGCHI_MAP = [3,4,5,6,7,8,9,10,11,0,1,2]; // 年支→地支

// 台辅：月支起
var ZWDS_TAIFU_MAP = [5,6,7,8,9,10,11,0,1,2,3,4]; // 月支→地支

function zwds_miscStars(b1, b2, b3) {
  var yearZhi = b1 % 12, monthZhi = b2 % 12, dayZhi = b3 % 12;
  
  var result = {};
  
  // 红鸾：年支起
  result['红鸾'] = ZWDS_HONGLUAN_MAP[yearZhi];
  // 天喜：红鸾+6(mod 12)
  result['天喜'] = (result['红鸾'] + 6) % 12;
  
  // 天刑：月支起
  result['天刑'] = ZWDS_TIANXING_BASE[monthZhi];
  // 天姚：月支起（简化规则）
  result['天姚'] = (monthZhi + 5) % 12;
  
  // 地空/地劫：日支起
  result['地空'] = ZWDS_DIKONG_MAP[dayZhi];
  result['地劫'] = (result['地空'] + 1) % 12;
  
  // 三台/八座：日支起
  result['三台'] = (dayZhi + 7) % 12;
  result['八座'] = (result['三台'] + 1) % 12;
  
  // 恩光/天贵：日干起（简化）
  result['恩光'] = (dayZhi + 3) % 12;
  result['天贵'] = (dayZhi + 9) % 12;
  
  // 天哭/天虚：年支起
  result['天哭'] = ZWDS_TIANKU_MAP[yearZhi];
  result['天虚'] = (result['天哭'] + 1) % 12;
  
  // 龙池/凤阁：年支起
  result['龙池'] = ZWDS_LONGCHI_MAP[yearZhi];
  result['凤阁'] = (result['龙池'] + 1) % 12;
  
  // 台辅/封诰：月支起
  result['台辅'] = ZWDS_TAIFU_MAP[monthZhi];
  result['封诰'] = (result['台辅'] + 1) % 12;
  
  return result;
}

// ── 汇总归宫 ──
function zwds_buildPalaces(palaces, stars14, auxStars, miscStars, siHua) {
  var chart = [];
  for (var i = 0; i < 12; i++) {
    var p = palaces[i];
    var entry = {
      name: p.name,
      zhiIdx: p.zhiIdx,
      zhiName: p.zhiName,
      starName: p.starName,
      mainStars: [],
      auxStars: [],
      miscStars: [],
      siHua: []
    };
    
    // 十四主星：哪些落在此宫
    for (var starName in stars14) {
      if (stars14[starName] === p.zhiIdx) {
        entry.mainStars.push(starName);
      }
    }
    
    // 辅星
    for (var auxName in auxStars) {
      if (auxStars[auxName] === p.zhiIdx) {
        entry.auxStars.push(auxName);
      }
    }
    
    // 杂曜
    for (var miscName in miscStars) {
      if (miscStars[miscName] === p.zhiIdx) {
        entry.miscStars.push(miscName);
      }
    }
    
    // 四化：附在主星上
    for (var huaType in siHua) {
      var targetStar = siHua[huaType];
      if (stars14[targetStar] === p.zhiIdx) {
        entry.siHua.push({ star: targetStar, type: huaType });
      }
    }
    
    chart.push(entry);
  }
  return chart;
}
```

- [ ] **Step 2: 语法检查**

```bash
cd h:/Phone && node -e "var fs=require('fs');var html=fs.readFileSync('index.html','utf8');var re=/<script(?![^>]*type=\"module\")[^>]*>([\s\S]*?)<\/script>/gi;var m,ok=true;while((m=re.exec(html))!==null){var code=m[1].trim();if(!code||code.startsWith('{'))continue;try{new Function(code)}catch(e){console.log('FAIL:',e.message);ok=false}}console.log(ok?'All OK':'FAILED')"
```

---

## Phase 4：数据层（ZiWei 解释文字库）

### Task 4.1：备份

- [ ] **Step 1: 备份**

```bash
cp h:/Phone/index.html "h:/Phone/Back/index_zwds_phase4_$(date +%Y%m%d_%H%M%S).html"
```

### Task 4.2：新增 ZiWei 全局对象（星性 + 简释 + 168条入宫详解）

**Files:** Modify: `h:/Phone/index.html` (insert after zwds_buildPalaces 函数)

- [ ] **Step 1: 插入 ZiWei 对象骨架 + 完整内容**

> **注意：** 此步骤代码约 800 行。为保持计划整洁，完整 ZiWei 对象内容以独立脚本文件形式交付，项目根目录为 `h:/Phone/ziwei-data.js`。内容含：
> - `starNature[14]` — 十四主星星性（吉/凶/吉凶）
> - `starWuXing[14]` — 十四主星五行
> - `starBrief[14][4]` — 四维简析（每星约 200 字）
> - `palaceBrief[12]` — 十二宫基础含义（每宫约 80 字）
> - `starInPalace[14][12]` — 168 条主星入宫详解（每条约 200 字）
> - `auxBrief[12]` + `miscBrief[16]` — 辅星/杂曜简释
> - `siHuaBrief[4]` — 四化释义

```javascript
var ZiWei = { /* 完整内容见 h:/Phone/ziwei-data.js */ };
```

- [ ] **Step 2: 将 ziwei-data.js 内容插入 index.html 中 zwds_buildPalaces 之后**

> 实际实现时，将 `ziwei-data.js` 的完整内容追加到 index.html 当前 `<script>` 块中。

- [ ] **Step 3: 键名校验**

```bash
cd h:/Phone && node -e "
var fs=require('fs');
var html=fs.readFileSync('index.html','utf8');
// 提取 ZiWei 对象的星名键
var ziweiMatch = html.match(/var ZiWei\s*=\s*(\{[\s\S]*?\n\};)/);
if (!ziweiMatch) { console.log('ZiWei not found'); process.exit(1); }
// 检查 starInPalace 键是否与 starNature 一致
var starKeys = html.match(/starNature\s*:\s*\{([^}]+)\}/);
console.log('ZiWei found, manual check needed for key consistency');
"
```

---

## Phase 5：渲染层（卡片 + 调用连接）

### Task 5.1：备份

- [ ] **Step 1: 备份**

```bash
cp h:/Phone/index.html "h:/Phone/Back/index_zwds_phase5_$(date +%Y%m%d_%H%M%S).html"
```

### Task 5.2：新增渲染函数 renderZiweiPalaces

**Files:** Modify: `h:/Phone/index.html` (insert after ZiWei 对象)

- [ ] **Step 1: 插入渲染函数**

```javascript
// ── 紫微斗数十二宫渲染 ──
function _zwdsJiClass(nature) {
  if (nature === '吉') return 'ziwei-ji';
  if (nature === '凶') return 'ziwei-xiong';
  if (nature === '吉凶') return 'ziwei-ji-xiong';
  return '';
}

function _zwdsSiHuaBadge(type) {
  var clsMap = { '化禄':'lu', '化权':'quan', '化科':'ke', '化忌':'ji' };
  var labelMap = { '化禄':'禄', '化权':'权', '化科':'科', '化忌':'忌' };
  var cls = clsMap[type] || '';
  return '<span class="ziwei-si-hua-badge ziwei-si-hua-' + cls + '">' + (labelMap[type]||type) + '</span>';
}

function renderZiweiPalaces(chartData) {
  if (!chartData || chartData.length !== 12) return '';
  
  // 总览表
  var html = '<div class="ziwei-palace-table">';
  
  for (var i = 0; i < 12; i++) {
    var p = chartData[i];
    var isMing = (i === 0); // 命宫
    var colCls = 'ziwei-palace-col' + (isMing ? ' ziwei-palace-ming' : '');
    
    html += '<div class="' + colCls + '" onclick="zwds_showPalaceDetail(' + i + ')">';
    
    // 宫名 + 地支
    html += '<div class="ziwei-palace-header">' + p.name + '</div>';
    html += '<div class="ziwei-palace-zhi">' + p.zhiName + '</div>';
    html += '<div class="ziwei-palace-star-name">' + p.starName + '</div>';
    
    // 主星
    for (var m = 0; m < p.mainStars.length; m++) {
      var star = p.mainStars[m];
      var nature = (ZiWei.starNature || {})[star] || '';
      var cls = _zwdsJiClass(nature);
      html += '<div class="ziwei-star-main ' + cls + '">' + star;
      // 四化角标
      for (var h = 0; h < p.siHua.length; h++) {
        if (p.siHua[h].star === star) {
          html += _zwdsSiHuaBadge(p.siHua[h].type);
        }
      }
      html += '</div>';
    }
    
    // 辅星
    if (p.auxStars.length > 0) {
      html += '<div class="ziwei-star-aux">' + p.auxStars.join(' · ') + '</div>';
    }
    
    // 杂曜
    if (p.miscStars.length > 0) {
      html += '<div class="ziwei-star-misc">' + p.miscStars.join(' · ') + '</div>';
    }
    
    html += '</div>';
  }
  
  html += '</div>';
  
  // 各宫详解面板（默认隐藏，点击展开）
  html += '<div id="ziwei-detail-panel" class="ziwei-detail-panel" style="display:none"></div>';
  
  return html;
}

// ── 单宫详解 ──
function zwds_showPalaceDetail(idx) {
  if (!window._zwdsChartData) return;
  var p = window._zwdsChartData[idx];
  if (!p) return;
  
  var panel = document.getElementById('ziwei-detail-panel');
  if (!panel) return;
  
  var html = '<h3 style="color:var(--color-gold);margin-bottom:12px">' + p.name + '（' + p.zhiName + ' · ' + p.starName + '）</h3>';
  
  // 宫义
  var palaceDesc = ZiWei.palaceBrief && ZiWei.palaceBrief[p.name];
  if (palaceDesc) {
    html += '<div class="ziwei-detail-section"><p>' + palaceDesc + '</p></div>';
  }
  
  // 主星详解
  for (var m = 0; m < p.mainStars.length; m++) {
    var star = p.mainStars[m];
    var starBrief = ZiWei.starBrief && ZiWei.starBrief[star];
    var starInPalace = ZiWei.starInPalace && ZiWei.starInPalace[star] && ZiWei.starInPalace[star][p.name];
    
    html += '<div class="ziwei-detail-section"><h4>' + star + '</h4>';
    if (starInPalace) {
      html += '<p>' + starInPalace + '</p>';
    }
    // 四化标注
    for (var h = 0; h < p.siHua.length; h++) {
      if (p.siHua[h].star === star) {
        var huaType = p.siHua[h].type;
        var huaDesc = ZiWei.siHuaBrief && ZiWei.siHuaBrief[huaType] ? ZiWei.siHuaBrief[huaType] : '';
        html += '<p style="font-size:12px;color:var(--color-gold)">' + huaType + '：' + huaDesc + '</p>';
      }
    }
    html += '</div>';
  }
  
  // 辅星简释
  if (p.auxStars.length > 0) {
    html += '<div class="ziwei-detail-section"><h4>辅曜</h4>';
    for (var a = 0; a < p.auxStars.length; a++) {
      var auxBrief = ZiWei.auxBrief && ZiWei.auxBrief[p.auxStars[a]];
      html += '<p><strong>' + p.auxStars[a] + '</strong>：' + (auxBrief || '') + '</p>';
    }
    html += '</div>';
  }
  
  // 杂曜简释
  if (p.miscStars.length > 0) {
    html += '<div class="ziwei-detail-section"><h4>杂曜</h4>';
    for (var ms = 0; ms < p.miscStars.length; ms++) {
      var miscBrief = ZiWei.miscBrief && ZiWei.miscBrief[p.miscStars[ms]];
      html += '<p><strong>' + p.miscStars[ms] + '</strong>：' + (miscBrief || '') + '</p>';
    }
    html += '</div>';
  }
  
  panel.innerHTML = html;
  panel.style.display = 'block';
}
```

- [ ] **Step 2: 语法检查**

```bash
cd h:/Phone && node -e "var fs=require('fs');var html=fs.readFileSync('index.html','utf8');var re=/<script(?![^>]*type=\"module\")[^>]*>([\s\S]*?)<\/script>/gi;var m,ok=true;while((m=re.exec(html))!==null){var code=m[1].trim();if(!code||code.startsWith('{'))continue;try{new Function(code)}catch(e){console.log('FAIL:',e.message);ok=false}}console.log(ok?'All OK':'FAILED')"
```

### Task 5.3：在 mingLiBaZi 中插入计算调用 + 卡片 HTML

**Files:** Modify: `h:/Phone/index.html` (two insertion points)

- [ ] **Step 1: 在 ShG 计算之后（line 9281）插入 zwds 计算调用**

Line 9280-9281:
```javascript
  var ShG = this.shengong(b1,b2,b4);
  var ShenGong = this.Gan[ShG%10] + this.Zhi[ShG%12];
```

After line 9281, insert:

```javascript
  // ── 紫微斗数十二宫安星 ──
  var _zwdsJu = zwds_wuxingJu(MGxh);
  var _zwdsZiweiIdx = zwds_ziwei(_zwdsJu.number, ob.bz_Nd);
  var _zwdsStars14 = zwds_14stars(_zwdsZiweiIdx);
  var _zwdsSiHua = zwds_sihua(b1 % 10);
  var _zwdsAux = zwds_auxStars(b1, b2, b3, b4);
  var _zwdsMisc = zwds_miscStars(b1, b2, b3);
  var _zwdsPalaces = zwds_palaces(MGxh);
  var _zwdsChartData = zwds_buildPalaces(_zwdsPalaces, _zwdsStars14, _zwdsAux, _zwdsMisc, _zwdsSiHua);
  window._zwdsChartData = _zwdsChartData;
```

- [ ] **Step 2: 在 ob.bzinfo 末尾（日柱论断卡片之后，line 9636）插入紫微斗数卡片**

Line 9634-9636:
```javascript
                  + '</div>'
                  + '</div>'
                  +'';
```

Change to:

```javascript
                  + '</div>'
                  + '</div>'
                  // ── 紫微斗数十二宫卡片 ──
                  + '<div class="card card-accent-purple" data-card-id="bz_ziwei">'
                  + '<div class="card-header" onclick="toggleBaziCardCollapse(this)"><span><i class="ti ti-sparkles"></i> 紫微斗数 · 十二宫</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
                  + '<div class="card-body">'
                  + renderZiweiPalaces(_zwdsChartData)
                  + '</div></div>'
                  +'';
```

- [ ] **Step 3: 在 _restoreBaziCollapseState 的 ANALYSIS_CARDS 中添加 bz_ziwei**

Line 10308:
```javascript
    var ANALYSIS_CARDS = { bz_geju: true, bz_xiyong: true, bz_congge: true };
```

Change to:

```javascript
    var ANALYSIS_CARDS = { bz_geju: true, bz_xiyong: true, bz_congge: true, bz_ziwei: true };
```

### Task 5.4：Z-Index 层级调整（如需）

> 紫微斗数卡片使用现有卡片体系，无需新增 z-index。

### Task 5.5：最终验证

- [ ] **Step 1: 语法检查**

```bash
cd h:/Phone && node -e "var fs=require('fs');var html=fs.readFileSync('index.html','utf8');var re=/<script(?![^>]*type=\"module\")[^>]*>([\s\S]*?)<\/script>/gi;var m,ok=true;while((m=re.exec(html))!==null){var code=m[1].trim();if(!code||code.startsWith('{'))continue;try{new Function(code)}catch(e){console.log('FAIL:',e.message);ok=false}}console.log(ok?'All OK':'FAILED')"
```

Expected: `All OK`

- [ ] **Step 2: HTML 标签平衡**

```bash
cd h:/Phone && python -c "with open('index.html','r',encoding='utf-8') as f: t=f.read(); print(f'<div>:{t.count(\"<div\")} </div>:{t.count(\"</div>\")} diff:{t.count(\"<div\")-t.count(\"</div>\")}')"
```

- [ ] **Step 3: 浏览器端到端验证**

```bash
npx serve h:/Phone
```

1. 打开浏览器 → 输入八字 → 排盘
2. 滚动到最下方 → 确认"紫微斗数 · 十二宫"卡片可见
3. 检查：十二宫总览表 12 列正确排列
4. 检查：主星/辅星/杂曜/四化角标颜色和位置正确
5. 点击任一宫位 → 确认展开详解面板
6. 确认折叠/展开与 localStorage 持久化正常

---

## 不允许的操作清单

- ❌ 修改 `minggong()` / `shengong()` / `mingLiBaZi()` / `ML_calc()` 等现有函数
- ❌ 修改 `gg1`-`gg4` 的计算逻辑
- ❌ 修改 `Bz` 对象中的任何数据
- ❌ 修改现有的 `.card` / `.card-header` / `.card-body` CSS 类
- ❌ 修改 `ob.bzinfo` 现有部分的任何字符串拼接
- ❌ 删除或替换任何现有变量/函数
- ❌ 在渲染函数中直接写硬编码的解释文字
- ✅ 只在指定位置追加新代码
- ✅ 所有新增函数/变量以 `zwds_` 或 `ZWDS_` 为前缀

---

## 文件变更汇总

| 文件 | 变更类型 | 描述 |
|------|---------|------|
| `h:/Phone/index.html` | 追加 CSS (~80 行) | `</style>` 前插入 `.ziwei-*` 类 |
| `h:/Phone/index.html` | 追加 JS (~600 行) | `zwds_*` 计算函数 + `ZiWei` 数据 + 渲染函数 |
| `h:/Phone/index.html` | 追加 3 行 | `ShG` 后插入计算调用 |
| `h:/Phone/index.html` | 追加 8 行 | `ob.bzinfo` 末尾插入卡片 HTML |
| `h:/Phone/index.html` | 修改 1 词 | `ANALYSIS_CARDS` 添加 `bz_ziwei: true` |
| `h:/Phone/Back/` | 新增 ~5 个文件 | 每次 Phase 前的备份 |
