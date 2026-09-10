// 探针：提取 lunisolar theGods 实际输出的神煞名（精确字符串），用于对齐 20 个 MISMATCH 元数据键名。
'use strict';
const lunisolar = require('lunisolar');
const theGodsPlugin = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGodsPlugin.theGods);

const TARGET = ['九坎','了戾','地囊','地火','大会','孤辰','孤阳','专日','小会','气往亡','氣往亡','短星','义日','義日','行狠','阴道冲阳','陰道沖陽','阴错','陰錯','阴阳俱错','陰陽俱錯','兵吉','临日','臨日','天后','天吏'];

function* dates() {
  for (let y = 2024; y <= 2027; y++)
    for (let m = 1; m <= 12; m++)
      for (let d = 1; d <= 31; d++) {
        const dt = new Date(y, m - 1, d);
        if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) yield dt;
      }
}

const all = new Map(); // name -> count
const hit = {}; // target -> Set of exact emitted names
TARGET.forEach(t => hit[t] = new Set());

let n = 0;
for (const dt of dates()) {
  n++;
  const lsr = lunisolar(dt);
  const good = lsr.theGods.getGoodGods().map(g => String(g));
  const bad = lsr.theGods.getBadGods().map(g => String(g));
  const names = good.concat(bad);
  names.forEach(nm => all.set(nm, (all.get(nm) || 0) + 1));
  TARGET.forEach(t => { if (names.includes(t)) hit[t].add(t); });
}

console.log('=== 全部 distinct 神煞名（共 ' + all.size + ' 个），含命中计数 ===');
[...all.entries()].sort((a,b)=>b[1]-a[1]).forEach(([nm,c]) => console.log(c + '\t' + nm));

console.log('\n=== 20 MISMATCH 目标名 命中情况（exact match）===');
const MISMATCH = ['九坎','了戾','地囊','地火','大會','大会','孤辰','孤陽','孤阳','專日','专日','小會','小会','氣往亡','气往亡','短星','義日','义日','行狠','陰道沖陽','阴道冲阳','陰錯','阴错','陰陽俱錯','阴阳俱错','兵吉','臨日','临日','天后','天吏'];
MISMATCH.forEach(t => {
  const present = all.has(t);
  console.log((present ? '✅' : '❌') + ' ' + t + (present ? ' (count=' + all.get(t) + ')' : '  — 未在输出中出现！'));
});

console.log('\n=== 与 20 目标 字形相近 的已出现名（人工核对映射）===');
const reExps = [/九坎/,/了戾/,/地囊/,/地火/,/大会/,/孤辰/,/孤阳/,/专日/,/小会/,/往亡/,/短星/,/义日/,/行狠/,/阴道/,/阴错/,/阴阳俱错/,/兵吉/,/临日/,/天后/,/天吏/];
[...all.keys()].filter(nm => reExps.some(re => re.test(nm))).forEach(nm => console.log('  ' + nm + '  (count=' + all.get(nm) + ')'));
