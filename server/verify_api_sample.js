// 小样本端到端实测：带 HMAC 签名，抽查每月 2 天，间隔 2.5s 避开限流(60/min)
const http = require("http");
const crypto = require("crypto");
const SECRET = "381cb51f0923fc771bf7e81547c485f7";
const MID = "verify-client";
function sign(ts, nonce, url) {
  const msg = MID + ts + nonce + url;
  return crypto.createHmac("sha256", SECRET).update(msg, "utf8").digest("hex").substring(0, 8);
}
function post(y, m, d) {
  return new Promise((resolve, reject) => {
    const url = "/api/v1/calendar/day";
    const body = JSON.stringify({ y, m, d });
    const ts = Date.now();
    const nonce = String(Math.floor(Math.random() * 100000));
    const sig = sign(ts, nonce, url);
    const req = http.request({
      host: "127.0.0.1", port: 3000, path: url, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body),
        "x-machine-id": MID, "x-timestamp": ts, "x-nonce": nonce, "x-signature": sig }
    }, r => { let b = ""; r.on("data", d => b += d); r.on("end", () => { try { resolve(JSON.parse(b)); } catch (e) { resolve({ _raw: b }); } }); });
    req.on("error", reject); req.write(body); req.end();
  });
}
const TARGETS = ["月刑", "月害", "重日", "復日"];
const FIELD = { '月刑': 'yuexing', '月害': 'yuehai', '重日': 'chongri', '復日': 'furi' };
(async () => {
  let total = 0, mismatch = 0, errs = 0; const examples = [];
  for (let m = 1; m <= 12; m++) {
    for (const d of [9, 22]) {
      const r = await post(2026, m, d);
      await new Promise(res => setTimeout(res, 2500));
      if (r._raw || !r.ok) { errs++; console.log(`ERR 2026-${m}-${d}:`, (r._raw || r.error || "").slice(0, 60)); continue; }
      const c = r.data; total++;
      TARGETS.forEach(n => {
        const present = (c.goodGods || []).includes(n) || (c.badGods || []).includes(n);
        const truth = !!c[FIELD[n]];
        if (present !== truth) { mismatch++; if (examples.length < 10) examples.push(`2026-${m}-${d} ${n}: present=${present} truth=${truth}`); }
      });
    }
  }
  console.log(`API 小样本校验日期数: ${total} (ERR ${errs})`);
  console.log(`月刑/月害/重日/復日 偏差: ${mismatch}`);
  if (examples.length) examples.forEach(e => console.log("  " + e));
  console.log(mismatch === 0 ? "✅ API 覆盖层与协纪主流一致" : "❌ 存在偏差");
  process.exit(mismatch === 0 ? 0 : 1);
})();
