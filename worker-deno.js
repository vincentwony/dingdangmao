/**
 * 公信万年历 — 商业化发码服务 (Deno Deploy 版)
 * 部署到 https://deno.com/deploy （免费额度：10万请求/天）
 *
 * 部署步骤：
 *   1. 打开 dash.deno.com，用 GitHub 登录
 *   2. New Playground → 粘贴此文件
 *   3. Settings → Environment Variables 添加：
 *      API_KEY = 你的管理密钥
 *      HMAC_SECRET = 381cb51f0923fc771bf7e81547c485f7
 *   4. Deploy → 获得 URL（如 wannianli.deno.dev）
 *
 * API：
 *   POST /api/generate  → 生成激活码
 *   POST /api/verify    → 在线验码
 *   GET  /health        → 健康检查
 */

const HMAC_SECRET = Deno.env.get("HMAC_SECRET") || "381cb51f0923fc771bf7e81547c485f7";
const API_KEY = Deno.env.get("API_KEY");
if (!API_KEY) {
  console.error('[worker] ❌ 未设置 API_KEY 环境变量');
  // Deno Deploy 上通过 Dashboard 设置，本地通过 Deno.env 设置
}

const TIER_CONFIG = {
  Q: { label: "季卡(3个月)", days: 90, price: 68 },
  Y: { label: "年卡", days: 365, price: 198 },
  U: { label: "终身卡", days: 0, price: 598 },
};

// HMAC 签名
async function hmacSign(message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(HMAC_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + m + day;
}

async function generateCode(machineId, tier) {
  const rawMid = machineId.replace(/-/g, "").toUpperCase();
  const config = TIER_CONFIG[tier];
  if (!config) throw new Error("无效等级");
  const expireDate = config.days > 0 ? daysFromNow(config.days) : '00000000';
  const message = rawMid + tier + expireDate;
  const fullSig = await hmacSign(message);
  const checkCode = fullSig.slice(0, 8);
  return `BZ-${tier}-${expireDate}-${checkCode}`;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    // === 健康检查 ===
    if (path === "/health" && req.method === "GET") {
      return json({ status: "ok", time: new Date().toISOString() });
    }

    // === 生成激活码 ===
    if (path === "/api/generate" && req.method === "POST") {
      const apiKey = req.headers.get("X-API-Key");
      if (apiKey !== API_KEY) {
        return json({ error: "无效的 API Key" }, 401);
      }

      const body = await req.json();
      const { machineId, tier } = body;

      if (!machineId || !tier || !TIER_CONFIG[tier]) {
        return json({ error: "缺少参数或等级无效 (Q/Y/U)" }, 400);
      }

      const code = await generateCode(machineId, tier);
      const config = TIER_CONFIG[tier];

      return json({
        success: true,
        code,
        tier: config.label,
        expireDate: code.split("-")[2],
        message: `${config.label}激活码已生成`,
      });
    }

    // === 在线验码 ===
    if (path === "/api/verify" && req.method === "POST") {
      const body = await req.json();
      const { code, machineId } = body;
      if (!code || !machineId) {
        return json({ valid: false, reason: "缺少参数" }, 400);
      }

      const m = code.toUpperCase().match(
        /^BZ-?([QYU])-?(\d{8})-?([A-F0-9]{8})$/,
      );
      if (!m) {
        return json({ valid: false, reason: "激活码格式无效" }, 400);
      }

      const rawMid = machineId.replace(/-/g, "").toUpperCase();
      const message = rawMid + m[1] + m[2];
      const fullSig = await hmacSign(message);

      if (fullSig.slice(0, 8) !== m[3]) {
        return json({ valid: false, reason: "校验失败" }, 200);
      }

      const expY = parseInt(m[2].slice(0, 4));
      const expM = parseInt(m[2].slice(4, 6));
      const expD = parseInt(m[2].slice(6, 8));
      const expire = new Date(expY, expM - 1, expD + 1);
      if (new Date() > expire) {
        return json({ valid: false, reason: "激活码已过期" }, 200);
      }

      return json({
        valid: true,
        tier: m[1],
        tierLabel: TIER_CONFIG[m[1]]?.label || "未知",
        expireDate: m[2],
        remainingDays: Math.ceil((expire - new Date()) / 86400000),
      });
    }

    return json({ error: "Not found", path }, 404);
  } catch (e) {
    return json({ error: "内部错误", detail: e.message }, 500);
  }
});
