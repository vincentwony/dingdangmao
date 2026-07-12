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
	// AI 解读桩
	app.post("/api/interpret", function(req, res) {
	  res.status(503).json({ error: "AI 解读服务未配置。请在服务端设置 DEEPSEEK_API_KEY 环境变量。" });
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
app.use('/api/v1/calendar', calendarRouter);
app.use('/api/v1/bazi', baziRouter);

// 错误处理（最后注册）
app.use(errorHandler);

app.listen(PORT, function() {
  console.log('[server] listening on port ' + PORT);
});
