'use strict';
// 神煞同类排查：用协纪辨方书正统规则做独立参考源，对 lunisolar 全量差分
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);

const STEM = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BR   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
// 60 甲子序号（甲子=0）
function gzIdx(s, b){ // s,b 为 0-based 干支序号
  for (let k = 0; k < 60; k++) if (k % 10 === s && k % 12 === b) return k;
  return -1;
}
// 预生成若干日辰序号
function gz(name){ const s = STEM.indexOf(name[0]); const b = BR.indexOf(name[1]); return gzIdx(s,b); }

// 月支 -> 月德天干
const YUEDE = {2:2,6:2,10:2, 11:0,3:0,7:0, 8:8,0:8,4:8, 5:6,9:6,1:6}; // branch->stem
const YUEDE_HE = {2:7,6:7,10:7, 11:5,3:5,7:5, 8:3,0:3,4:3, 5:1,9:1,1:1}; // 五合
const TIANDE = {2:3,3:9,4:8,5:5,6:11,7:0,8:9,9:2,10:2,11:1,0:5,1:6};
const TIANDE_HE = {2:8,3:null,4:3,5:2,6:null,7:5,8:4,9:null,10:7,11:6,0:null,1:1};
const FOUR_ZHONG = new Set([0,6,3,9]); // 子午卯酉

// 参考源：传入 (monthBranch 0-11, season 0-3, dayStem 0-9, dayBranch 0-11, dayVal 0-59)
const REF = {
  月德: (m,s,ds,db,dv) => ds === YUEDE[m],
  月德合: (m,s,ds,db,dv) => ds === YUEDE_HE[m],
  天赦: (m,s,ds,db,dv) => {
    // 春戊寅 夏甲午 秋戊申 冬甲子（按节气季）
    const map = {0:gz('戊寅'),1:gz('甲午'),2:gz('戊申'),3:gz('甲子')};
    return dv === map[s];
  },
  月恩: (m,s,ds,db,dv) => ds === [0,7,2,3,6,5,4,7,8,9,6,1][m],
  四相: (m,s,ds,db,dv) => {
    const set = {0:[2,3],1:[4,5],2:[8,9],3:[0,1]}[s];
    return set.includes(ds);
  },
  時德: (m,s,ds,db,dv) => ds>=0 && [6,4,0,2][s] === db,
  母倉: (m,s,ds,db,dv) => {
    const set = {0:[11,0],1:[2,3],2:[4,7,10,1],3:[8,9]}[s];
    return set.includes(db);
  },
  鳴吠: (m,s,ds,db,dv) => [gz('甲午'),gz('丙午'),gz('庚午'),gz('壬午'),gz('甲申'),gz('丙申'),gz('庚申'),gz('壬申'),gz('乙酉'),gz('丁酉'),gz('己酉'),gz('辛酉'),gz('癸酉')].includes(dv),
  天恩: (m,s,ds,db,dv) => [gz('甲子'),gz('乙丑'),gz('丙寅'),gz('丁卯'),gz('戊辰'),gz('己卯'),gz('庚辰'),gz('辛巳'),gz('壬午'),gz('癸未'),gz('己酉'),gz('庚戌'),gz('辛亥'),gz('壬子'),gz('癸丑')].includes(dv),
  鳴吠對: (m,s,ds,db,dv) => [gz('丙子'),gz('庚子'),gz('壬子'),gz('甲寅'),gz('丙寅'),gz('庚寅'),gz('壬寅'),gz('乙卯'),gz('丁卯'),gz('辛卯'),gz('癸卯')].includes(dv),
  天願: (m,s,ds,db,dv) => {
    // 协纪辨方书正统：正寅甲午 二卯甲戌 三辰乙酉 四巳丙子 五午丁丑 六未戊午 七申甲寅 八酉丙辰 九戌辛卯 十亥戊辰 十一子甲子 十二丑癸未
    const map = {2:gz('甲午'),3:gz('甲戌'),4:gz('乙酉'),5:gz('丙子'),6:gz('丁丑'),7:gz('戊午'),8:gz('甲寅'),9:gz('丙辰'),10:gz('辛卯'),11:gz('戊辰'),0:gz('甲子'),1:gz('癸未')};
    return dv === map[m];
  },
  五富: (m,s,ds,db,dv) => {
    const map = {2:11,6:11,10:11, 11:2,3:2,7:2, 8:5,0:5,4:5, 5:8,9:8,1:8}; // 寅午戌->亥 亥卯未->寅 申子辰->巳 巳酉丑->申
    return db === map[m];
  },
  往亡: (m,s,ds,db,dv) => {
    // 协纪辨方书卷四历例：正寅二巳三申四亥五卯六午七酉八子九辰十未十一戌十二丑
    const map = {2:2,3:5,4:8,5:11,6:3,7:6,8:9,9:0,10:4,11:7,0:10,1:1};
    return db === map[m];
  },
  // —— 以下为按权威规则独立实现的参考（月支 m 为生肖序 0-11，posOf 转月序位；返回布尔：当日该神是否成立）——
  月破: (m, s, ds, db) => db === (m + 6) % 12,
  月刑: (m, s, ds, db) => db === YUE_XING[posOf(m)],
  月害: (m, s, ds, db) => db === YUE_HAI[posOf(m)],
  六合: (m, s, ds, db) => LIUHE_DAY[db] === m,
  三合: (m, s, ds, db) => !!(SANHE_DAY[db] && SANHE_DAY[db].indexOf(m) >= 0),
  生氣: (m, s, ds, db) => db === (m + 10) % 12,
  死氣: (m, s, ds, db) => db === (m + 4) % 12,
  驛馬: (m, s, ds, db) => db === YIMA[m],
  重日: (m, s, ds, db) => m === db,
  復日: (m, s, ds) => !!(FU[m] && FU[m].indexOf(ds) >= 0),
};

// 月序位：寅=0,卯=1,辰=2,巳=3,午=4,未=5,申=6,酉=7,戌=8,亥=9,子=10,丑=11
function posOf(mb){ return {2:0,3:1,4:2,5:3,6:4,7:5,8:6,9:7,10:8,11:9,0:10,1:11}[mb]; }
// 月刑（寅刑巳、巳刑申、申刑寅；丑刑戌、戌刑未、未刑丑；子刑卯、卯刑子；辰午酉亥自刑）
// 按 月序位(寅=0..丑=11) 给出 月刑日支的 BR 序号：巳=5 子=0 辰=4 申=8 午=6 丑=1 寅=2 酉=9 未=7 亥=11 卯=3 戌=10
const YUE_XING = [5,0,4,8,6,1,2,9,7,11,3,10];
// 月害（正月巳逆行十二辰）：寅→巳 卯→辰 辰→卯 巳→寅 午→丑 未→子 申→亥 酉→戌 戌→酉 亥→申 子→未 丑→午
const YUE_HAI  = [5,2,3,2,1,0,9,8,7,8,5,6];
// 日支六合表
const LIUHE_DAY = {0:1,1:0,2:11,11:2,3:10,10:3,4:9,9:4,5:8,8:5,6:7,7:6};
// 日支三合（另两支）
const SANHE_DAY = {0:[8,4],8:[0,4],4:[0,8], 2:[6,10],6:[2,10],10:[2,6], 5:[9,1],9:[5,1],1:[5,9], 11:[3,7],3:[11,7],7:[11,3]};
// 驿马（月支三合局驿马）：申子辰→寅(2) 巳酉丑→亥(11) 寅午戌→申(8) 亥卯未→巳(5)
const YIMA = {0:2,8:2,4:2, 5:11,9:11,1:11, 2:8,6:8,10:8, 11:5,3:5,7:5};
// 复日：寅申甲庚 卯酉乙辛 辰戌丑未戊己 巳亥丙壬 午子丁癸（日干）
const FU = {2:[0,6],8:[0,6], 3:[1,7],9:[1,7], 4:[4,5],10:[4,5],7:[4,5],1:[4,5], 5:[2,8],11:[2,8], 6:[3,9],0:[3,9]};

// 访问器（与 dist 一致）
const I=(l,e,n=0)=>'month'===e?l.getMonthBuilder(n)[0]:l.char8[e];
const _=(l,e,n)=>{let t=I(l,e,0);return n?t.branch.value%n:t.branch.value;};
const L=(l,e,n)=>{let t=I(l,e,0);return n?t.stem.value%n:t.stem.value;};

// 已被 server 覆盖层按协纪主流释义有意覆盖的神煞（lunisolar 原始与协纪不同属预期差异，CI 不视为失败）
// 注：月刑 lunisolar 原始即与协纪一致，无需覆盖，故未列入
const OVERRIDDEN = new Set(['天恩','天願','月害','重日','復日']);

const GOD_NAMES = Object.keys(REF);
const results = {}; // name -> {fp:[], fn:[]}  fp: lunisolar真但参考假; fn: 参考真但lunisolar假
GOD_NAMES.forEach(n=>results[n]={fp:[],fn:[]});

const start = new Date(2024,0,1), end = new Date(2027,11,31);
for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
  const lsr = lunisolar(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  const mb = _(lsr,'month');                 // 月支 0-11
  const season = lsr.getSeasonIndex();
  const ds = L(lsr,'day');                   // 日干 0-9
  const db = _(lsr,'day');                   // 日支 0-11
  const dv = lsr.char8.day.value;            // 日干支 60序号
  const good = lsr.theGods.getGoodGods().map(g=>String(g));
  const bad  = lsr.theGods.getBadGods().map(g=>String(g));
  const has = n => good.includes(n) || bad.includes(n);
  for (const name of GOD_NAMES) {
    const ref = !!REF[name](mb, season, ds, db, dv);
    const ls = has(name);
    if (ls && !ref) results[name].fp.push(`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`);
    if (!ls && ref) results[name].fn.push(`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`);
  }
}

console.log('神煞同类排查结果（2024-01-01 ~ 2027-12-31）');
console.log('参考源：协纪辨方书正统规则；对比对象：lunisolar 原始 getGoodGods/getBadGods\n');
let anyIssue = false;        // 未预期差异（CI 失败）
let anyExpected = false;     // 预期差异（已被覆盖层有意覆盖）
for (const name of GOD_NAMES) {
  const fp = results[name].fp.length, fn = results[name].fn.length;
  const expected = OVERRIDDEN.has(name);
  let status;
  if (fp===0 && fn===0) status = 'OK  ';
  else if (expected) { status = 'OVR '; anyExpected = true; }
  else { status = 'DIFF'; anyIssue = true; }
  console.log(`${status}  ${name.padEnd(4)}  lunisolar多报=${fp}  漏报=${fn}${expected?'  (已覆盖)':''}`);
  if (fp) console.log('         lunisolar多报样本: ' + results[name].fp.slice(0,6).join(', ') + (fp>6?` ...(共${fp})`:''));
  if (fn) console.log('         漏报样本: ' + results[name].fn.slice(0,6).join(', ') + (fn>6?` ...(共${fn})`:''));
}
console.log('\n总结: ' + (anyIssue ? '存在未预期不一致 ❌（需排查 lunisolar 新引入的 bug）' : '非覆盖神煞全部一致 ✅'));
if (anyExpected) console.log('注: 标记为 OVR 的神煞(lunisolar 原始与协纪不同)已由 server 覆盖层按协纪主流修正，不计入 CI 失败。');

// CI 友好：仅当存在【未预期】差异时才以非零退出码结束
process.exit(anyIssue ? 1 : 0);
