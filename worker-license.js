/**
 * 公信万年历 — 商业化授权 Worker
 * 部署到 Cloudflare Workers + KV
 *
 * 功能：
 *   1. POST /api/generate  — 生成激活码（需 API Key）
 *   2. POST /api/verify    — 在线验码（可选，离线也能验）
 *   3. POST /webhook/alipay — 支付宝支付回调 → 自动发码到用户手机/邮箱
 *   4. POST /webhook/wechat — 微信支付回调
 *
 * 环境变量（wrangler.toml 或 CF Dashboard 设置）：
 *   HMAC_SECRET  — HMAC-SHA256 密钥（与 index.html 中 _LIC_HMAC_K1+K2 一致）
 *   API_KEY      — 管理 API 密钥（用于 /api/generate）
 *   ADMIN_EMAIL  — 管理员邮箱（用于通知）
 *
 * KV 命名空间：
 *   LICENSE_CODES — 存储已生成的激活码记录
 *
 * 部署：
 *   wrangler deploy
 */

// ── HMAC 签名 ──
async function hmacSign(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('').toUpperCase();
}

// ── 生成激活码 ──
// 格式: BZ-{tier}-{YYYYMMDD}-{4chars}
// 4chars = HMAC-SHA256(machineId + tier + expireDate, secret) 前4位hex
async function generateCode(machineId, tier, days) {
  const rawMid = machineId.replace(/-/g, '').toUpperCase();
  const expireDate = days > 0 ? daysFromNow(days) : '00000000';
  const message = rawMid + tier + expireDate;
  const fullSig = await hmacSign(message, HMAC_SECRET);
  const checkCode = fullSig.slice(0, 8);
  return `BZ-${tier}-${expireDate}-${checkCode}`;
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + m + day;
}

// ── 会员等级定义 ──
const TIER_CONFIG = {
  'Q': { label: '季卡(3个月)', days: 90, price: 68 },
  'Y': { label: '年卡', days: 365, price: 198 },
  'U': { label: '终身卡', days: 0, price: 598 },
};

// ── CORS 头 ──
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };
}

// ── JSON 响应 ──
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// ═══════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin') || '';

    // HMAC 密钥
    globalThis.HMAC_SECRET = env.HMAC_SECRET || '381cb51f0923fc771bf7e81547c485f7';

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const resHeaders = corsHeaders(origin);

    try {
      // ── API: 生成激活码 ──
      if (path === '/api/generate' && request.method === 'POST') {
        const apiKey = request.headers.get('X-API-Key');
        if (apiKey !== env.API_KEY) {
          return json({ error: '无效的 API Key' }, 401);
        }

        const body = await request.json();
        const { machineId, tier, amount } = body;

        if (!machineId || !tier) {
          return json({ error: '缺少必填参数: machineId, tier' }, 400);
        }

        const tierConfig = TIER_CONFIG[tier];
        if (!tierConfig) {
          return json({ error: '无效的会员等级，可选值: Q, Y, U' }, 400);
        }

        // 金额校验（可选，防止手误）
        if (amount && amount < tierConfig.price * 0.5) {
          return json({ error: `金额不足，${tierConfig.label}最低¥${tierConfig.price}` }, 400);
        }

        const code = await generateCode(machineId, tier, tierConfig.days);

        // 存储到 KV
        if (env.LICENSE_CODES) {
          const record = {
            code,
            machineId,
            tier,
            tierLabel: tierConfig.label,
            price: amount || tierConfig.price,
            expireDate: code.split('-')[2],
            createdAt: new Date().toISOString(),
            source: 'api',
          };
          await env.LICENSE_CODES.put(code, JSON.stringify(record));
        }

        return json({
          success: true,
          code,
          tier: tierConfig.label,
          expireDate: code.split('-')[2],
          message: `${tierConfig.label}激活码已生成`,
        }, 200);
      }

      // ── API: 在线验码 ──
      if (path === '/api/verify' && request.method === 'POST') {
        const body = await request.json();
        const { code, machineId } = body;

        if (!code || !machineId) {
          return json({ valid: false, reason: '缺少参数' }, 400);
        }

        const m = code.toUpperCase().match(/^BZ-?([QYU])-?(\d{8})-?([A-F0-9]{8})$/);
        if (!m) {
          return json({ valid: false, reason: '激活码格式无效' }, 400);
        }

        const rawMid = machineId.replace(/-/g, '').toUpperCase();
        const message = rawMid + m[1] + m[2];
        const fullSig = await hmacSign(message, HMAC_SECRET);

        if (fullSig.slice(0, 8) !== m[3]) {
          return json({ valid: false, reason: '校验失败' }, 200);
        }

        // 检查是否过期
        const expY = parseInt(m[2].slice(0, 4));
        const expM = parseInt(m[2].slice(4, 6));
        const expD = parseInt(m[2].slice(6, 8));
        const expire = new Date(expY, expM - 1, expD + 1);
        if (new Date() > expire) {
          return json({ valid: false, reason: '激活码已过期' }, 200);
        }

        return json({
          valid: true,
          tier: m[1],
          tierLabel: TIER_CONFIG[m[1]]?.label || '未知',
          expireDate: m[2],
          remainingDays: Math.ceil((expire - new Date()) / 86400000),
        }, 200);
      }

      // ── Webhook: 支付宝支付回调 ──
      if (path === '/webhook/alipay' && request.method === 'POST') {
        const body = await request.json();
        const { out_trade_no, total_amount, trade_status, custom_params } = body;

        if (trade_status !== 'TRADE_SUCCESS') {
          return json({ success: false, message: '支付未完成' }, 200);
        }

        const machineId = custom_params?.machineId;
        const tier = custom_params?.tier;

        if (!machineId || !tier || !TIER_CONFIG[tier]) {
          return json({ error: '缺少机器码或等级' }, 400);
        }

        const tierConfig = TIER_CONFIG[tier];
        const code = await generateCode(machineId, tier, tierConfig.days);

        // 存储
        if (env.LICENSE_CODES) {
          await env.LICENSE_CODES.put(code, JSON.stringify({
            code, machineId, tier, tierLabel: tierConfig.label,
            price: parseFloat(total_amount),
            outTradeNo: out_trade_no,
            expireDate: code.split('-')[2],
            createdAt: new Date().toISOString(),
            source: 'alipay',
          }));
        }

        // 管理通知（预留：可接邮件/Slack）
        console.log(`[支付] ${tierConfig.label} ¥${total_amount} → ${machineId} → ${code}`);

        return json({ success: true, code, message: '支付成功，激活码已生成' }, 200);
      }

      // ── Webhook: 微信支付回调 ──
      if (path === '/webhook/wechat' && request.method === 'POST') {
        const body = await request.json();
        const { out_trade_no, amount, attach } = body;

        let customParams = {};
        try { customParams = JSON.parse(attach || '{}'); } catch (e) {}

        const machineId = customParams.machineId;
        const tier = customParams.tier;

        if (!machineId || !tier || !TIER_CONFIG[tier]) {
          return json({ error: '缺少机器码或等级' }, 400);
        }

        const tierConfig = TIER_CONFIG[tier];
        const code = await generateCode(machineId, tier, tierConfig.days);

        if (env.LICENSE_CODES) {
          await env.LICENSE_CODES.put(code, JSON.stringify({
            code, machineId, tier, tierLabel: tierConfig.label,
            price: amount / 100, // 微信支付以分为单位
            outTradeNo: out_trade_no,
            expireDate: code.split('-')[2],
            createdAt: new Date().toISOString(),
            source: 'wechat',
          }));
        }

        console.log(`[微信支付] ${tierConfig.label} ¥${amount / 100} → ${machineId} → ${code}`);
        return json({ success: true, code, message: '支付成功，激活码已生成' }, 200);
      }

      // ── 健康检查 ──
      if (path === '/health') {
        return json({ status: 'ok', time: new Date().toISOString() });
      }

      // ── 404 ──
      return json({ error: 'Not found' }, 404);

    } catch (e) {
      console.error('[Worker Error]', e);
      return json({ error: '内部服务器错误', detail: e.message }, 500);
    }
  },
};
