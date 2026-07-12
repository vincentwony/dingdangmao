/**
 * 公信万年历 — 本地发码服务 (Node.js)
 * 不需要任何云平台，本地或 VPS 运行即可
 *
 * 启动：
 *   node server-keygen.js
 *   然后访问 http://localhost:3456
 *
 * VPS 部署：
 *   npm install express cors
 *   node server-keygen.js
 *   （建议配合 nginx 反向代理 + SSL）
 */

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const app = express();

const PORT = process.env.PORT || 3456;
const API_KEY = process.env.API_KEY;
const HMAC_SECRET = process.env.HMAC_SECRET || "381cb51f0923fc771bf7e81547c485f7";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// 安全检查：API_KEY 和 ADMIN_PASSWORD 必须通过环境变量设置
if (!API_KEY) {
  console.error('[keygen] ❌ 未设置 API_KEY 环境变量，服务拒绝启动');
  console.error('[keygen]    用法: API_KEY=你的密钥 ADMIN_PASSWORD=你的密码 node server-keygen.js');
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  console.error('[keygen] ❌ 未设置 ADMIN_PASSWORD 环境变量，服务拒绝启动');
  process.exit(1);
}

const TIER_CONFIG = {
  Q: { label: "季卡(3个月)", days: 90, price: 68 },
  Y: { label: "年卡", days: 365, price: 198 },
  U: { label: "终身卡", days: 0, price: 598 },
};

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// === 网页版激活码生成器（浏览器直接打开用）===
app.get("/gen", (req, res) => {
  res.sendFile(__dirname + "/server-gen.html");
});

// === API: 生成激活码 ===
app.post("/api/generate", (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: "无效的 API Key" });
  }

  const { machineId, tier } = req.body;
  if (!machineId || !tier || !TIER_CONFIG[tier]) {
    return res.status(400).json({ error: "缺少参数: machineId, tier (Q/Y/U)" });
  }

  const rawMid = machineId.replace(/-/g, "").toUpperCase();
  const config = TIER_CONFIG[tier];

  // 计算到期日（终身卡 days=0 → 到期日 00000000）
  const expireDate = config.days > 0 ? (function() {
    const d = new Date();
    d.setDate(d.getDate() + config.days);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("");
  })() : '00000000';

  // HMAC-SHA256
  const message = rawMid + tier + expireDate;
  const sig = crypto.createHmac("sha256", HMAC_SECRET).update(message).digest("hex").toUpperCase();
  const checkCode = sig.slice(0, 8);
  const code = `BZ-${tier}-${expireDate}-${checkCode}`;

  console.log(`[生成] ${config.label} → ${machineId} → ${code}`);
  res.json({ success: true, code, tier: config.label, expireDate, message: `${config.label}激活码已生成` });
});

// === API: 在线验码 ===
app.post("/api/verify", (req, res) => {
  const { code, machineId } = req.body;
  if (!code || !machineId) {
    return res.status(400).json({ valid: false, reason: "缺少参数" });
  }

  const m = code.toUpperCase().match(/^BZ-?([QYU])-?(\d{8})-?([A-F0-9]{8})$/);
  if (!m) return res.json({ valid: false, reason: "激活码格式无效" });

  const rawMid = machineId.replace(/-/g, "").toUpperCase();
  const message = rawMid + m[1] + m[2];
  const sig = crypto.createHmac("sha256", HMAC_SECRET).update(message).digest("hex").toUpperCase();

  if (sig.slice(0, 8) !== m[3]) {
    return res.json({ valid: false, reason: "校验失败" });
  }

  const expY = parseInt(m[2].slice(0, 4));
  const expM = parseInt(m[2].slice(4, 6));
  const expD = parseInt(m[2].slice(6, 8));
  const remaining = Math.ceil((new Date(expY, expM - 1, expD + 1) - new Date()) / 86400000);

  if (remaining <= 0) return res.json({ valid: false, reason: "激活码已过期" });

  res.json({
    valid: true,
    tier: m[1],
    tierLabel: TIER_CONFIG[m[1]]?.label || "未知",
    expireDate: m[2],
    remainingDays: Math.max(0, remaining),
  });
});

// === 简单的 Web 管理页 ===
app.get("/admin", (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><title>激活码生成器</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; background: #F5EDE0; }
  .card { background: #FFFDF7; border: 1px solid #E5D5C0; border-radius: 12px; padding: 24px; margin: 16px 0; }
  h2 { color: #3C2415; margin: 0 0 16px; } label { display: block; margin: 8px 0 4px; color: #6B5540; font-size: 13px; }
  input, select { width: 100%; padding: 10px; border: 1px solid #D4A574; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
  button { width: 100%; padding: 12px; background: #C41E0A; color: #fff; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; margin-top: 12px; }
  button:hover { background: #8B1508; }
  #result { background: #f0f0f0; padding: 16px; border-radius: 8px; margin-top: 12px; word-break: break-all; display: none; }
  #result .code { font-size: 20px; font-weight: 700; color: #C41E0A; letter-spacing: 1px; }
</style></head>
<body>
<div class="card">
  <h2>&#9997; 激活码生成器</h2>
  <label>客户机器码</label>
  <input id="mid" placeholder="XXXX-XXXX-XXXX" maxlength="14">
  <label>会员等级</label>
  <select id="tier">
    <option value="Q">季卡 ¥68（90天）</option>
    <option value="Y" selected>年卡 ¥198（365天）</option>
    <option value="U">至尊卡 ¥598（8年）</option>
  </select>
  <button onclick="generate()">生成激活码</button>
  <div id="result"></div>
</div>
<script>
async function generate() {
  var mid = document.getElementById('mid').value.trim();
  var tier = document.getElementById('tier').value;
  if (!mid) { alert('请输入机器码'); return; }
  var resp = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': '${API_KEY}' },
    body: JSON.stringify({ machineId: mid, tier: tier })
  });
  var data = await resp.json();
  var el = document.getElementById('result');
  el.style.display = 'block';
  if (data.success) {
    el.innerHTML = '<div class="code">' + data.code + '</div><div style="margin-top:8px;color:#6B5540;">' + data.tier + ' · 到期 ' + data.expireDate + '</div>';
  } else {
    el.innerHTML = '<div style="color:#C41E0A;">错误: ' + (data.error || data.reason) + '</div>';
  }
}
</script>
</body></html>`;
  res.send(html);
});

// === 健康检查 ===
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log("====================================");
  console.log("  公信万年历 · 发码服务已启动");
  console.log("  Web 管理页: http://localhost:" + PORT + "/admin");
  console.log("  API:        http://localhost:" + PORT + "/api/generate");
  console.log("  验码:       http://localhost:" + PORT + "/api/verify");
  console.log("====================================");
});
