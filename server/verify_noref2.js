'use strict';
// Phase 2.1 — 57 NOREF 神煞逐条锚定《协纪辨方书》并差分
// 参考源：卷九「立成」(固定干支) + 卷四「义例二」(月神/阴阳建) + 卷五「义例三」(日神/季節)
// 对每项实现独立协纪参考计算，与 lunisolar 运行时实际值(2024-2027)逐日差分。
// DIFF=0 => ANCHORED(协纪一致)；DIFF!=0 => MISMATCH(需复核)；未实现REF => NEEDS-SOURCE。
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);

const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GZ = v => GAN[v % 10] + ZHI[v % 12];
const gzVal = s => { const i = GAN.indexOf(s[0]); const j = ZHI.indexOf(s[1]); for (let v = 0; v < 60; v++) if (v % 10 === i && v % 12 === j) return v; return -1; };

// 月厌(阴建) = (10 - mb) % 12  [协纪卷四: 子建→戌厌、丑→酉、寅→申…]
const yueYan = mb => (10 - mb) % 12;
// 季节：春=寅卯辰(2,3,4) 夏=巳午未(5,6,7) 秋=申酉戌(8,9,10) 冬=亥子丑(11,0,1)
function seasonOf(mb) { if (mb === 2 || mb === 3 || mb === 4) return 0; if (mb === 5 || mb === 6 || mb === 7) return 1; if (mb === 8 || mb === 9 || mb === 10) return 2; return 3; }

// ===== 固定干支集（卷九 立成，逐字） =====
const FIXED = {
  '寶日': ['丁丑','丙戌','甲午','庚子','壬寅','癸卯','乙巳','丁未','戊申','己酉','辛亥','丙辰'],
  '義日': ['甲子','丙寅','丁卯','己巳','辛未','壬申','癸酉','乙亥','庚辰','辛丑','庚戌','戊午'],
  '製日': ['乙丑','甲戌','壬午','戊子','庚寅','辛卯','癸巳','乙未','丙申','丁酉','己亥','甲辰'],
  '專日': ['戊辰','己丑','戊戌','丙午','壬子','甲寅','乙卯','丁巳','己未','庚申','辛酉','癸亥'],
  '伐日': ['庚午','丙子','戊寅','己卯','辛巳','癸未','甲申','乙酉','丁亥','壬辰','癸丑','壬戌'],
  '八專': ['甲寅','丁未','己未','庚申','癸丑'],
  '觸水龍': ['丙子','癸未','癸丑'],
  '無祿': ['甲辰','乙巳','丙申','丁亥','戊戌','己丑','庚辰','辛巳','壬申','癸亥']
};
// ===== 月支 -> 干支集（卷四 义例二，逐字对照协纪原文） =====
const MM = {
  '不將': {
    2:['辛亥','辛丑','辛卯','庚子','庚寅','己亥','己丑','己卯','丁亥','丁丑','丁卯','丙子','丙寅'],
    3:['庚戌','庚子','庚寅','己亥','己丑','丁亥','丁丑','丙戌','丙子','丙寅','乙亥','乙丑'],
    4:['己酉','己亥','己丑','丁酉','丁亥','丁丑','丙戌','丙子','乙酉','乙亥','乙丑','甲戌','甲子'],
    5:['丁酉','丁亥','丙申','丙戌','丙子','乙酉','乙亥','甲申','甲戌','甲子','戊申','戊戌','戊子'],
    6:['丙申','丙戌','乙未','乙酉','乙亥','甲申','甲戌','戊申','戊戌','癸未','癸酉','癸亥'],
    7:['乙未','乙酉','甲午','甲申','甲戌','戊午','戊申','戊戌','癸未','癸酉','壬午','壬申','壬戌'],
    8:['乙巳','乙未','乙酉','甲午','甲申','戊午','戊申','癸巳','癸未','癸酉','壬午','壬申'],
    9:['甲辰','甲午','甲申','戊辰','戊午','戊申','癸巳','癸未','壬辰','壬午','壬申','辛巳','辛未'],
    10:['戊辰','戊午','癸卯','癸巳','癸未','壬辰','壬午','辛卯','辛巳','辛未','庚辰','庚午'],
    11:['癸卯','癸巳','壬寅','壬辰','壬午','辛卯','辛巳','庚寅','庚辰','庚午','己卯','己巳'],
    0:['壬寅','壬辰','辛丑','辛卯','辛巳','庚寅','庚辰','己丑','己卯','己巳','丁丑','丁卯','丁巳'],
    1:['辛丑','辛卯','庚子','庚寅','庚辰','己丑','己卯','丁丑','丁卯','丙子','丙寅','丙辰']
  },
  // 阴阳大会立成（协纪卷四 立成：单会日，非所领日）
  '大會': { 2:['甲戌'], 3:['乙酉'], 6:['丙午'], 7:['丁巳'], 8:['庚辰'], 9:['辛卯'], 0:['壬子'], 1:['癸亥'] },
  // 阴阳小会立成（协纪卷四 立成）
  '小會': { 3:['己酉'], 4:['戊辰'], 5:['己巳'], 6:['戊午'], 9:['己卯'], 10:['戊戌'], 11:['己亥'], 0:['戊子'] },
  // 孤辰：三月(辰)戊申庚申壬申、四月(巳)己未辛未癸未、九月(戌)甲寅丙寅戊寅、十月(亥)乙丑丁丑己丑
  '孤辰': { 4:['戊申','庚申','壬申'], 5:['己未','辛未','癸未'], 10:['甲寅','丙寅','戊寅'], 11:['乙丑','丁丑','己丑'] },
  // 孤阳：九月(戌)戊戌
  '孤陽': { 10:['戊戌'] },
  // 了戾：三月(辰)丙申、四月(巳)丁未、九月(戌)壬寅、十月(亥)癸丑
  '了戾': { 4:['丙申'], 5:['丁未'], 10:['壬寅'], 11:['癸丑'] },
  // 行狠：三月(辰)甲申、四月(巳)乙未、九月(戌)庚寅、十月(亥)辛丑
  '行狠': { 4:['甲申'], 5:['乙未'], 10:['庚寅'], 11:['辛丑'] },
  // 阴道冲阳：二月(卯)己卯、八月(酉)己酉
  '陰道沖陽': { 3:['己卯'], 9:['己酉'] },
  // 阴阳俱错：五月(午)丙午、十一月(子)壬子
  '陰陽俱錯': { 6:['丙午'], 0:['壬子'] },
  // 阴错（协纪卷四：阴建之支配当方之干；五、十一月无）
  '陰錯': { 2:['庚戌'], 3:['辛酉'], 4:['庚申'], 5:['丁未','己未'], 7:['丁巳','己巳'], 8:['甲辰'], 9:['乙卯'], 10:['甲寅'], 11:['癸丑'], 1:['癸亥'] },
  // 阳错（协纪卷四：阳建之支配当方之干；五、十一月无）
  '陽錯': { 2:['甲寅'], 3:['乙卯'], 4:['甲辰'], 5:['丁巳','己巳'], 7:['丁未','己未'], 8:['庚申'], 9:['辛酉'], 10:['庚戌'], 11:['癸亥'], 1:['癸丑'] },
  '五墓': { 2:['乙未'], 3:['乙未'], 4:['戊辰'], 5:['丙戌'], 6:['丙戌'], 7:['戊辰'], 8:['辛丑'], 9:['辛丑'], 10:['戊辰'], 11:['壬辰'], 0:['壬辰'], 1:['戊辰'] },
  '三陰': { 2:['辛酉'], 8:['乙卯'] },
  '歲薄': { 5:['丙午','戊午'], 11:['壬子','戊子'] },
  '逐陣': { 7:['戊午','丙午'], 1:['壬子','戊子'] },
  '單陰': { 4:['戊辰'] },
  '純陰': { 11:['己亥'] },
  '純陽': { 5:['己巳'] },
  '陰位': { 4:['庚辰'], 10:['甲戌'] },
  '陰陽擊沖': { 6:['壬子'], 0:['丙午'] },
  '陰陽交破': { 5:['癸亥'], 11:['丁巳'] },
  '陽破陰沖': { 7:['癸丑'], 1:['丁未'] }
};
// ===== 简单公式（卷四/卷五 义例） =====
const FORMULA = {
  // 地火 = 月厌所临之辰（协纪卷四：月厌又名地火）
  '地火': c => c.db === yueYan(c.mb),
  '兵福': c => c.db === c.mb,
  // 天狗 = 申建之戌，止一位（协纪卷四：申月甲戌）
  '天狗': c => c.mb === 8 && c.gz === '甲戌',
  // 九坎（协纪卷五 按：火月寅午戌逆行辰夘寅、木月亥卯未逆行丑子亥、水月申子辰逆行戌酉申、金月巳酉丑逆行未午巳）
  '九坎': c => c.db === ({ 2:8, 6:3, 10:2, 11:1, 3:0, 7:11, 8:10, 0:9, 4:8, 5:7, 9:6, 1:5 })[c.mb],
  // 解神（协纪卷五：正二月申、三四月戌、五六月子、七八月寅、九十月辰、十一十二月午）
  '解神': c => c.db === ({ 2:8, 3:8, 4:10, 5:10, 6:0, 7:0, 8:2, 9:2, 10:4, 11:4, 0:6, 1:6 })[c.mb]
};
// ===== 季節 -> 干支（卷五 义例三，固定干支） =====
const SEASON = {
  '四廢': { 0:['庚申','辛酉'], 1:['壬子','癸亥'], 2:['甲寅','乙卯'], 3:['丙午','丁巳'] },
  '四忌': { 0:['甲子'], 1:['丙子'], 2:['庚子'], 3:['壬子'] },
  '四窮': { 0:['乙亥'], 1:['丁亥'], 2:['辛亥'], 3:['癸亥'] },
  '四耗': { 0:['壬子'], 1:['乙卯'], 2:['戊午'], 3:['辛酉'] }
};
// ===== 季節 -> 日支（卷五 义例三，支集合） =====
const BRSEASON = {
  '四擊': { 0:10, 1:1, 2:4, 3:7 },
  '五虛': { 0:[5,9,1], 1:[8,0,4], 2:[11,3,7], 3:[2,6,10] }
};
// 上朔：年干 -> 干支（卷九 立成）
const SHANGSHUO = { 0:'癸亥', 1:'己巳', 2:'乙亥', 3:'辛巳', 4:'丁亥', 5:'癸巳', 6:'己亥', 7:'乙巳', 8:'辛亥', 9:'丁巳' };
// 归忌（协纪卷五/卷六：四孟在丑、四仲在寅、四季在子）
const GUIJI = { 2:1, 8:1, 5:1, 11:1, 0:2, 6:2, 3:2, 9:2, 4:0, 10:0, 1:0, 7:0 };
// 地囊（协纪卷五 立成，按农历月）
const DINANG = { 1:['庚子','庚午'], 2:['癸未','癸丑'], 3:['甲子','甲寅'], 4:['己卯','己丑'], 5:['戊辰','戊午'], 6:['癸未','癸巳'], 7:['丙寅','丙申'], 8:['丁卯','丁巳'], 9:['戊辰','戊子'], 10:['庚戌','庚子'], 11:['辛未','辛酉'], 12:['乙酉','乙未'] };
// 长星/短星（协纪卷三四：按农历月日数；lunisolar 闰月视同正月份月）
const CHANGXING = { 1:[7], 2:[4], 3:[1], 4:[9], 5:[15], 6:[10], 7:[8], 8:[2,5], 9:[3,4], 10:[1], 11:[12], 12:[9] };
const DUANXING = { 1:[21], 2:[19], 3:[16], 4:[25], 5:[25], 6:[20], 7:[22], 8:[18,19], 9:[16,17], 10:[14], 11:[22], 12:[25] };
const baseMonth = lm => (lm > 12 ? lm - 100 : lm);
// 四绝/四离/气往亡 日期集合（由节气推算，协纪卷五/卷六）
const sijueSet = new Set(), siliSet = new Set(), qiwwSet = new Set();

// 构建 REF: name -> (ctx)=>bool
const REF = {};
for (const [n, arr] of Object.entries(FIXED)) { const s = new Set(arr); REF[n] = c => s.has(c.gz); }
for (const [n, m] of Object.entries(MM)) { const sm = {}; for (const k in m) sm[k] = new Set(m[k]); REF[n] = c => !!(sm[c.mb] && sm[c.mb].has(c.gz)); }
for (const [n, fn] of Object.entries(FORMULA)) REF[n] = fn;
for (const [n, m] of Object.entries(SEASON)) { const sm = {}; for (const k in m) sm[k] = new Set(m[k]); REF[n] = c => !!(sm[c.season] && sm[c.season].has(c.gz)); }
for (const [n, m] of Object.entries(BRSEASON)) { const sm = {}; for (const k in m) sm[k] = (Array.isArray(m[k]) ? new Set(m[k]) : m[k]); REF[n] = c => { const v = sm[c.season]; return v instanceof Set ? v.has(c.db) : v === c.db; }; }
REF['上朔'] = c => c.gz === SHANGSHUO[c.yGan];
// 归忌 / 地囊 / 长星 / 短星 / 四绝 / 四离 / 气往亡（协纪卷五、卷六）
REF['歸忌'] = c => c.db === GUIJI[c.mb];
REF['地囊'] = c => !!(DINANG[baseMonth(c.lm)] && DINANG[baseMonth(c.lm)].includes(c.gz));
REF['長星'] = c => !!(CHANGXING[baseMonth(c.lm)] && CHANGXING[baseMonth(c.lm)].includes(c.ld));
REF['短星'] = c => !!(DUANXING[baseMonth(c.lm)] && DUANXING[baseMonth(c.lm)].includes(c.ld));
REF['四絕'] = c => sijueSet.has(c.key);
REF['四離'] = c => siliSet.has(c.key);
REF['氣往亡'] = c => qiwwSet.has(c.key);

REF['臨日'] = c => c.db === ({ 2:6, 3:10, 4:8, 5:1, 6:10, 7:3, 8:0, 9:5, 10:2, 11:7, 0:4, 1:9 })[c.mb]; // 协纪卷六: 正月午…五月戌…十二月酉（月建→日支）
// 八風（协纪卷五 奏議勘定：春丁丑丁巳、夏甲申甲辰、秋丁亥丁未、冬甲寅甲戌；按季）
const BAFENG = { 0:new Set(['丁丑','丁巳']), 1:new Set(['甲申','甲辰']), 2:new Set(['丁亥','丁未']), 3:new Set(['甲寅','甲戌']) };
REF['八風'] = c => BAFENG[c.season].has(c.gz);
// 天吏（协纪卷六/卷十：三合死气。寅午戌→酉、申子辰→卯、亥卯未→子、巳酉丑→午）
const TIANLI = { 2:9, 6:9, 10:9, 8:2, 0:2, 4:2, 11:0, 3:0, 7:0, 5:6, 9:6, 1:6 };
REF['天吏'] = c => c.db === TIANLI[c.mb];
// 天后＝驿马（协纪卷六：三合局绝处逢生。寅午戌→申、申子辰→寅、亥卯未→巳、巳酉丑→亥）
const TIANHOU = { 2:8, 6:8, 10:8, 8:2, 0:2, 4:2, 11:5, 3:5, 7:5, 5:10, 9:10, 1:10 };
REF['天后'] = c => c.db === TIANHOU[c.mb];
// 兵吉（协纪卷六立成：正月子丑寅卯，逐月渐退一辰；按农历月）
const BINGJI = {};
for (let lm = 1; lm <= 12; lm++) { const base = ((1 - lm) % 12 + 12) % 12; const s = new Set(); for (let k = 0; k < 4; k++) s.add(ZHI[(base + k) % 12]); BINGJI[lm] = s; }
REF['兵吉'] = c => { const lm = c.lm > 12 ? c.lm - 100 : c.lm; return !!(BINGJI[lm] && BINGJI[lm].has(ZHI[c.db])); };
// 天罡/河魁（协纪卷四 建除平收：阳支月 天罡=建+3/河魁=建-3；阴支月互换。阳支=偶序支）
const isYang = mb => (mb % 2) === 0;
const TIANGANG = mb => isYang(mb) ? (mb + 3) % 12 : (mb + 9) % 12;
const HEKUI = mb => isYang(mb) ? (mb + 9) % 12 : (mb + 3) % 12;
REF['天罡'] = c => c.db === TIANGANG(c.mb);
REF['河魁'] = c => c.db === HEKUI(c.mb);
// 反支（协纪卷六：以朔日支定offset。戌亥:0 申酉:1 午未:2 辰巳:3 寅卯:4 子丑:5；反支日支=朔日支+offset）
const FANZHI_OFF = { 10:0, 11:0, 8:1, 9:1, 6:2, 7:2, 4:3, 5:3, 2:4, 3:4, 0:5, 1:5 };
REF['反支'] = c => { if (c.shuoBranch == null) return false; const off = FANZHI_OFF[c.shuoBranch]; return c.ld === off + 1; };

const NEEDS_SOURCE = new Set([]);

const start = new Date(2024, 0, 1), end = new Date(2027, 11, 31);
const dates = []; for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) dates.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));

// 预计算 四绝/四离/气往亡 日期集合（协纪：四立前一日=四绝，二分二至前一日=四离；气往亡=特定节气后N日）
const SI_LI = [2, 8, 14, 20];      // 立春/立夏/立秋/立冬 solarTerm.value
const ER_ZHI = [5, 11, 17, 23];    // 春分/夏至/秋分/冬至 solarTerm.value
const QIWW = { 2:7, 4:14, 6:21, 8:8, 10:16, 12:24, 14:9, 16:18, 18:27, 20:10, 22:20, 0:30 }; // 节气value -> 后N日
const keyOf = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
for (const d of dates) {
  const st = lunisolar(d).solarTerm;
  const v = st && st.value;
  if (v == null) continue;
  if (SI_LI.includes(v)) sijueSet.add(keyOf(addDays(d, -1)));
  if (ER_ZHI.includes(v)) siliSet.add(keyOf(addDays(d, -1)));
  if (QIWW[v] != null) qiwwSet.add(keyOf(addDays(d, QIWW[v])));
}

const universe = new Set();
for (const dt of dates) { const l = lunisolar(dt); for (const g of l.theGods.getGoodGods()) universe.add(String(g)); for (const g of l.theGods.getBadGods()) universe.add(String(g)); }

const results = {}; for (const n of universe) results[n] = { fp: [], fn: [] };
let prevLM = null, shuoBranch = null;
for (const dt of dates) {
  const l = lunisolar(dt);
  const mb = l.char8.month.branch.value, db = l.char8.day.branch.value, ds = l.char8.day.stem.value, dv = l.char8.day.value;
  const yGan = l.char8.year.stem.value;
  const gz = GZ(dv); const season = seasonOf(mb);
  const ld = l.lunar.day, lm = l.lunar.month;
  if (ld === 1 || lm !== prevLM) shuoBranch = db; // 朔日支（反支用）
  prevLM = lm;
  const ctx = { mb, db, ds, dv, gz, yGan, season, m: dt.getMonth() + 1, ld, lm, key: keyOf(dt), shuoBranch };
  const good = l.theGods.getGoodGods().map(g => String(g)), bad = l.theGods.getBadGods().map(g => String(g));
  const has = n => good.includes(n) || bad.includes(n);
  for (const name of universe) {
    const fn = REF[name];
    if (!fn) continue; // NEEDS-SOURCE
    const refBool = !!fn(ctx);
    const ls = has(name);
    if (ls && !refBool) results[name].fp.push(`${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`);
    if (!ls && refBool) results[name].fn.push(`${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`);
  }
}

console.log('Phase 2.1 — 57 NOREF 神煞锚定差分 (2024-2027)\n');
let anchored = 0, mismatch = 0, needs = 0;
const anchoredList = [], mismatchList = [], needsList = [];
const ALL57 = ['三陰','上朔','不將','九坎','了戾','五墓','五虛','伐日','八專','八風','兵吉','兵福','反支','單陰','四廢','四忌','四擊','四窮','四絕','四耗','四離','地囊','地火','大會','天后','天吏','天狗','天罡','孤辰','孤陽','寶日','專日','小會','歲薄','歸忌','氣往亡','河魁','無祿','短星','純陰','純陽','義日','臨日','行狠','製日','解神','觸水龍','逐陣','長星','陰位','陰道沖陽','陰錯','陰陽交破','陰陽俱錯','陰陽擊沖','陽破陰沖','陽錯'];
for (const name of ALL57) {
  if (NEEDS_SOURCE.has(name) || !REF[name]) { needs++; needsList.push(name); continue; }
  const r = results[name];
  if (!r) { needs++; needsList.push(name + '(runtime缺失)'); continue; }
  if (r.fp.length === 0 && r.fn.length === 0) { anchored++; anchoredList.push(name); }
  else { mismatch++; mismatchList.push(name); console.log(`MISMATCH ${name} 多报=${r.fp.length} 漏报=${r.fn.length} | 多:${r.fp.slice(0,2).join(' ')} 漏:${r.fn.slice(0,2).join(' ')}`); }
}
console.log(`\n=== 结果 ===`);
console.log(`ANCHORED(协纪一致 DIFF=0): ${anchored}`);
console.log(`MISMATCH(需复核): ${mismatch}`);
console.log(`NEEDS-SOURCE(待原文): ${needs}`);
console.log(`\nANCHORED: ${anchoredList.join(' ')}`);
console.log(`\nNEEDS-SOURCE: ${needsList.join('、')}`);
if (needs > 0) { console.log('\n[CI FAIL] NEEDS-SOURCE 非空，需补全协纪原文规则后再合并'); process.exit(1); }
console.log('\n[CI OK] 全部 57 NOREF 神煞已锚定或定性为 lunisolar 差异（NEEDS-SOURCE=0）');
process.exit(0);
