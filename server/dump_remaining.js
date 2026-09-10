// 枚举 lunisolar 全量神煞，减去已覆盖/已验证的，dump 其余定义结构
const fs = require("fs");
const s = fs.readFileSync("node_modules/@lunisolar/plugin-thegods/dist/index.js", "utf8");

// 运行时全量名
const lunisolar = require("lunisolar");
const tg = require("@lunisolar/plugin-thegods");
lunisolar.extend(tg.theGods);
const names = new Set();
for (let m = 1; m <= 12; m++) {
  const dim = new Date(2026, m, 0).getDate();
  for (let d = 1; d <= dim; d++) {
    const lsr = lunisolar(new Date(2026, m - 1, d));
    lsr.theGods.getGoodGods().forEach(g => names.add(String(g)));
    lsr.theGods.getBadGods().forEach(g => names.add(String(g)));
  }
}

const COVERED = new Set([
  "天德","天德合","月德","月德合","天赦","天恩","天願","鳴吠對","鳴吠",
  "月恩","四相","時德","母倉","五富","往亡","月破","月刑","月害","六合",
  "三合","生氣","死氣","驛馬","重日","復日"
]);

const remaining = [...names].filter(n => !COVERED.has(n)).sort((a,b)=>a.localeCompare(b,"zh"));

// 抽取定义片段
function snippet(name) {
  const key = `"${name}":[`;
  const i = s.indexOf(key);
  if (i < 0) return "(not found as key)";
  // 取前 320 字符
  return s.slice(i, i + 320).replace(/\n/g, " ");
}
const out = [];
out.push(`全量神煞数: ${names.size} | 已覆盖: ${COVERED.size} | 剩余: ${remaining.length}\n`);
remaining.forEach(n => {
  out.push(`\n##### ${n}`);
  out.push(snippet(n));
});
fs.writeFileSync("remaining_dump.txt", out.join("\n"), "utf8");
console.log(`remaining: ${remaining.length}`);
console.log(remaining.join(" "));
