// server/index.js — 公信万年历 API 服务
'use strict';

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '16kb' }));

// 中间件
const cors = require('./middleware/cors.js');
const hmacAuth = require('./middleware/auth.js');
const createRateLimiter = require('./middleware/ratelimit.js');
const errorHandler = require('./middleware/error.js');

app.use(cors);

// 静态文件服务 — web/ 前端
var path = require('path');

// PWA 资源（必须在 express.static 之前，确保正确 MIME / SW 不被缓存）
app.get('/manifest.webmanifest', function (req, res) {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(__dirname, '..', 'web', 'manifest.webmanifest'));
});
app.get('/sw.js', function (req, res) {
  res.setHeader('Content-Type', 'text/javascript');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, '..', 'web', 'sw.js'));
});

app.use(express.static(path.join(__dirname, '..', 'web')));
// 原版 index.html 用于对比
app.get('/original', function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});
	// 紫微斗数主页 → 直跳排盘页（必须在 static 之前）
	// 紫微斗数主页 → SPA 自行渲染（保留 hash 路由）
	// 无 hash 时自动跳排盘（由 index.html 内脚本处理）
	app.use("/ziwei", express.static(path.join(__dirname, "..", "ziwei")));
	// SPA 回退：/ziwei/* 非文件路径均返回 index.html
	app.get("/ziwei/*", function(req, res) {
	  res.sendFile(path.join(__dirname, "..", "ziwei", "index.html"));
	});
	// 紫微 SPA 裸路由重定向
	var _ziweiRoutes = ["/astrolabe", "/tutorial", "/search", "/statistics", "/about"];
	app.get(_ziweiRoutes, function(req, res) {
	  res.redirect(301, "/ziwei/#" + req.path);
	});
	// AI 解读（SSE 流式代理 deepseek，支持客户端传入 apiKey）
	app.post("/api/interpret", async function(req, res) {
	  try {
	    const { prompt, apiKey } = req.body || {};
	    const KEY = apiKey || process.env.DEEPSEEK_API_KEY;
	    if (!KEY) {
	      return res.status(503).json({ error: "未配置 API Key：请在客户端填写 DeepSeek Key，或在服务端设置 DEEPSEEK_API_KEY 环境变量。" });
	    }
	    const resp = await fetch("https://api.deepseek.com/chat/completions", {
	      method: "POST",
	      headers: { "Content-Type": "application/json", Authorization: "Bearer " + KEY },
	      body: JSON.stringify({
	        model: "deepseek-chat",
	        messages: [
	          { role: "system", content: "你是精通紫微斗数的命理大师。专业、准确、有深度地解读命盘。" },
	          { role: "user", content: prompt || "请解读此紫微斗数命盘" }
	        ],
	        temperature: 0.7, max_tokens: 3000, stream: true
	      })
	    });
	    if (!resp.ok) {
	      const err = await resp.json().catch(() => ({}));
	      return res.status(resp.status).json({ error: err.error && err.error.message ? err.error.message : ("DeepSeek HTTP " + resp.status) });
	    }
	    res.setHeader("Content-Type", "text/event-stream");
	    res.setHeader("Cache-Control", "no-cache");
	    res.setHeader("Connection", "keep-alive");
	    const reader = resp.body.getReader();
	    const decoder = new TextDecoder();
	    let buf = "";
	    try {
	      while (true) {
	        const { done, value } = await reader.read();
	        if (done) break;
	        buf += decoder.decode(value, { stream: true });
	        const lines = buf.split("\n");
	        buf = lines.pop() || "";
	        for (const line of lines) {
	          if (!line.startsWith("data: ")) continue;
	          const data = line.slice(6);
	          if (data === "[DONE]") { res.write("data: [DONE]\n\n"); continue; }
	          try {
	            const j = JSON.parse(data);
	            const c = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
	            if (c) res.write("data: " + JSON.stringify({ delta: { text: c } }) + "\n\n");
	          } catch (e) {}
	        }
	      }
	    } finally {
	      reader.releaseLock();
	      res.end();
	    }
	  } catch (e) {
	    if (!res.headersSent) res.status(500).json({ error: e.message });
	  }
	});

// 健康检查（无需签名，注册在 auth 之前）
app.get('/api/v1/health', function(req, res) {
  res.json({ ok: true, data: { uptime: process.uptime() }, took: 0 });
});

app.use('/api/v1', createRateLimiter({ windowMs: 60000, max: 60 }));
app.use('/api/v1', hmacAuth);

// 路由
const calendarRouter = require('./routes/calendar.js');
const baziRouter = require('./routes/bazi.js');
const ziweiRouter = require('./routes/ziwei.js');
app.use('/api/v1/calendar', calendarRouter);
app.use('/api/v1/bazi', baziRouter);
app.use('/api/v1/ziwei', ziweiRouter);

// 错误处理（最后注册）
app.use(errorHandler);

app.listen(PORT, function() {
  console.log('[server] listening on port ' + PORT);
});
