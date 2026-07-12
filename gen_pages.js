// 为所有子路由生成占位页面
var fs = require('fs');
var path = require('path');

var pages = [
  { dir: 'bazi',        title: '八字排盘',       icon: '命', desc: '录入生辰，按古法自动起盘排柱。八字详批、合盘对照。' },
  { dir: 'ziwei',       title: '紫微斗数',       icon: '紫', desc: '十二宫排盘，看主星四化与大限流年。' },
  { dir: 'qizheng',     title: '七政四余',       icon: '星', desc: '果老星宗 · 恒星制 — 以二十八宿论先天命格。' },
  { dir: 'hecan',       title: '三术合参',       icon: '参', desc: '八字 × 紫微 × 七政三盘互证 — 信度分级的旗舰整合解读。', badge: '旗舰' },
  { dir: 'qimen',       title: '奇门遁甲',       icon: '奇', desc: '据时起局，用神锚定 — 古籍策略推演。' },
  { dir: 'daliuren',    title: '大六壬',         icon: '壬', desc: '月将加时 · 三传定事之始中末 — 一课通断万事。' },
  { dir: 'liuyao',      title: '六爻起卦',       icon: '卦', desc: '依《增删卜易》《卜筮正宗》参详卦象。' },
  { dir: 'daily',       title: '每日时令',       icon: '辰', desc: '结合本命与节气，参考宜忌与日辰。' },
  { dir: 'toolkit',     title: '百宝袋',         icon: '宝', desc: '寻时定盘 · 实用小工具集，持续上新。' },
  { dir: 'wiki',        title: '藏经阁',         icon: '经', desc: '古籍原文数据库 — 《周易》《滴天髓》《三命通会》等经典文献。' },
  { dir: 'talks',       title: '主创说',         icon: '说', desc: '关于青囊的设计哲学与技术选型。' },
  { dir: 'terms',       title: '服务条款',       icon: '约', desc: '使用条款与隐私政策。' },
  { dir: 'auth',        title: '登录 / 注册',    icon: '青', desc: '注册即赠 50 灵签，按次计费、无订阅。', cta: '免费注册' },
];

// 子页面: bazi/hepan
var subPages = [
  { dir: 'bazi/hepan',  title: '八字合盘',       icon: '缘', desc: '两盘对照，参看缘分契合与互补。' },
];

var allPages = pages.concat(subPages);

var baseDir = 'h:/qlcc';

allPages.forEach(function(p) {
  var dir = path.join(baseDir, p.dir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  var badgeHtml = p.badge ? '<span class="badge-gold" style="margin-left:0.75rem;vertical-align:middle">' + p.badge + '</span>' : '';
  var ctaHtml = p.cta ? '<a class="cta-btn" href="/auth" style="display:inline-block;margin-top:2rem">' + p.cta + '</a>' : '';

  var html = '<!DOCTYPE html>\n<html lang="zh-CN" data-theme="classic">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n<title>' + p.title + ' — 青囊 Aether Pouch</title>\n<meta name="theme-color" content="#0B1414">\n<link rel="icon" href="/assets/og.png" type="image/png">\n<link rel="stylesheet" href="/css/style.css">\n</head>\n<body>\n\n<header class="qn-navbar">\n  <nav class="qn-nav-inner">\n    <a class="qn-brand" href="/">\n      <span class="qn-brand-name">青囊</span>\n      <span class="qn-brand-sub">Aether Pouch</span>\n    </a>\n    <div class="qn-nav-links">\n      <a href="/bazi">八字</a>\n      <a href="/ziwei">紫微</a>\n      <a href="/qizheng">七政</a>\n      <a href="/hecan">三术合参</a>\n      <a href="/qimen" class="hide-lg">奇门</a>\n      <a href="/daliuren" class="hide-lg">大六壬</a>\n      <a href="/liuyao">六爻</a>\n      <a href="/daily" class="hide-lg">每日时令</a>\n      <a href="/toolkit" class="hide-lg">百宝袋</a>\n      <a href="/wiki">藏经阁</a>\n    </div>\n    <div class="qn-nav-actions"><div class="qn-nav-placeholder"></div></div>\n  </nav>\n</header>\n\n<main style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8rem 1.5rem 4rem;text-align:center">\n  <span style="font-family:var(--font-serif);font-size:5rem;color:var(--color-hu-po-jin);display:block;margin-bottom:1.5rem">' + p.icon + '</span>\n  <h1 style="font-family:var(--font-serif);font-size:2.25rem;color:var(--color-dai-qing);margin-bottom:0.75rem">' + p.title + badgeHtml + '</h1>\n  <div class="divider-ink" style="margin:0 auto 1.5rem;width:128px"></div>\n  <p style="max-width:28rem;font-size:1.0625rem;line-height:1.8;color:rgba(var(--color-dai-qing-rgb),0.6)">' + p.desc + '</p>\n  ' + ctaHtml + '\n  <a href="/" style="display:inline-block;margin-top:2.5rem;font-size:0.875rem;color:var(--color-dai-qing);opacity:0.5;transition:opacity 0.3s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.5">← 返回首页</a>\n</main>\n\n<footer class="footer">\n  <p class="footer-brand">青囊 · Aether Pouch</p>\n  <p class="footer-desc">古籍数字化 · AI 参详 — 仅作文化研究与体验，不构成任何决策建议</p>\n  <nav class="footer-nav">\n    <a href="/wiki">藏经阁</a>\n    <a href="/talks">主创说</a>\n    <a href="/terms">服务条款</a>\n  </nav>\n  <p class="footer-copy">© 2026 Aether Pouch. All rights reserved.</p>\n</footer>\n\n<nav class="mobile-nav">\n  <a class="mn-item active" href="/"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg><span>首页</span></a>\n  <a class="mn-item" href="/bazi"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/></svg><span>八字</span></a>\n  <a class="mn-item" href="/ziwei"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z"/></svg><span>紫微</span></a>\n  <a class="mn-item" href="/wiki"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="5" r="1.4"/><circle cx="12" cy="5" r="1.4"/><circle cx="19" cy="5" r="1.4"/><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/><circle cx="5" cy="19" r="1.4"/><circle cx="12" cy="19" r="1.4"/><circle cx="19" cy="19" r="1.4"/></svg><span>更多</span></a>\n  <a class="mn-item" href="/auth"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0112 0v1"/></svg><span>我的</span></a>\n</nav>\n\n<div class="theme-float">\n  <button class="theme-btn" onclick="var t=document.documentElement;var i=[\'classic\',\'zen\',\'zen-dark\'];var c=t.getAttribute(\'data-theme\')||\'classic\';var n=i.indexOf(c);n=(n+1)%3;t.setAttribute(\'data-theme\',i[n]);localStorage.setItem(\'qn-theme\',i[n]);this.querySelector(\'.theme-label\').textContent=[\'华彩\',\'禅意\',\'禅夜\'][n]">\n    <span class="theme-label">华彩</span>\n    <span class="theme-dots"><span class="tdot active"></span><span class="tdot"></span><span class="tdot"></span></span>\n  </button>\n</div>\n\n<script>(function(){var t=localStorage.getItem(\'qn-theme\')||\'classic\';document.documentElement.setAttribute(\'data-theme\',t);var b=document.querySelector(\'.theme-label\');if(b)b.textContent={classic:\'华彩\',zen:\'禅意\',zenDark:\'禅夜\'}[t]||\'华彩\'})();</script>\n</body>\n</html>';

  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  console.log('OK  ' + p.dir + '/index.html');
});

console.log('\n全部 ' + allPages.length + ' 个子页面已生成');
