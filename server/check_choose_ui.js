// 择日助手 前端冒烟（Phase 3.1 三柱 + Phase 3.2 本命合参）
// 复用 check_hongsha_ui.js 启动约定：channel msedge / serviceWorkers block
'use strict';
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const recs = [];
const rec = (name, pass, info) => { recs.push({ name, pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? ' :: ' + info : '')); };

(async () => {
  // 预置一个本命档案（甲子日柱 → 子），供「本命合参」下拉与冲合标注验证
  const seed = [{ id: 't1', name: '测试命盘', sex: '男', pillars: { year: '丙午', month: '戊戌', day: '甲子' } }];
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 414, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript((s) => { try { localStorage.setItem('bazi_archives', s); } catch (e) {}; }, JSON.stringify(seed));

  await page.goto(BASE + '/app.html#calendar', { waitUntil: 'domcontentloaded' });
  // 等日历加载（择日按钮注入即代表日历就绪）
  await page.waitForSelector('#btnChoose', { state: 'visible', timeout: 15000 });

  // 点击「择日」→ 跳转到独立页面 #choose（不再是内联面板）
  await page.waitForSelector('#btnChoose', { timeout: 8000 });
  await page.click('#btnChoose');
  await page.waitForSelector('#choose-root', { state: 'visible', timeout: 8000 });
  await page.waitForSelector('#chooseBack', { timeout: 8000 });
  const hashAfterOpen = await page.evaluate(() => location.hash.replace('#', ''));
  rec('点击择日跳转到独立页面 #choose', hashAfterOpen === 'choose', 'hash=' + hashAfterOpen);

  const hasBenming = await page.$('#chooseBenming');
  const hasManual = await page.$('#chooseBenmingManual');
  rec('本命合参控件渲染（下拉 + 手动输入）', !!hasBenming && !!hasManual);

  // 选中保存命盘（甲子日柱 · 丙午年命；新编码值「甲子|丙午」）
  await page.selectOption('#chooseBenming', '甲子|丙午');
  // 选事项=嫁娶、2026-10
  await page.selectOption('#chooseEvent', 'jiahun');
  await page.selectOption('#chooseY', '2026');
  await page.selectOption('#chooseM', '10');
  await page.click('#chooseGo');

  await page.waitForSelector('.choose-day-card', { timeout: 8000 });

  // 三柱展示：候选卡含「年 … 月 … 日」
  const firstCard = await page.$('.choose-day-card');
  const cardText = await firstCard.innerText();
  rec('候选卡展示八字三柱（含「年/月/日」）', /年.*月.*日/.test(cardText), cardText.replace(/\s+/g, ' ').slice(0, 40));

  // 本命合参标注出现（冲/合/刑/害 之一）
  const bmCount = await page.$$eval('.cdc-bm', els => els.length);
  rec('本命合参标注渲染（冲/合/刑/害 标签）', bmCount > 0, '本命标签数=' + bmCount);

  // 年命维度标注出现（ctx=年）：种子命盘年命 丙午(午)，候选日 日支 子 → 冲本命(年)
  const ctxYear = await page.$$eval('.cdc-bm-ctx', els => els.filter(e => e.textContent === '年').length);
  rec('本命合参含年命维度标注（ctx=年）', ctxYear > 0, '年命标签数=' + ctxYear);

  // 年命纳音维度标注出现（年纳 比和）：2026-10 候选日课年柱=丙午(水)，年命=丙午(水) → 纳音比和
  const resText = await page.$eval('.choose-results', el => el.innerText);
  rec('本命合参含年命纳音维度标注（纳音比和）', /纳音比和/.test(resText), '含纳音比和=' + /纳音比和/.test(resText));

  // 跳转属性存在
  const hasJump = await page.$('.choose-day-card[data-y][data-m][data-d] .cdc-view');
  rec('候选卡含查看日课跳转按钮', !!hasJump);

  // 返回通道：点击页面内「返回」按钮 → 回到日历页 #calendar
  await page.click('#chooseBack');
  await page.waitForSelector('#cal-root', { state: 'visible', timeout: 8000 });
  const hashAfterBack = await page.evaluate(() => location.hash.replace('#', ''));
  rec('点击返回按钮回到日历页 #calendar', hashAfterBack === 'calendar', 'hash=' + hashAfterBack);

  // 返回通道：再次进入择日页，点击「查看日课」→ 回到日历并展开日课详情
  await page.click('#btnChoose');
  await page.waitForSelector('#choose-root', { state: 'visible', timeout: 8000 });
  await page.waitForSelector('.choose-day-card', { timeout: 8000 });
  await page.click('.choose-day-card .cdc-view');
  await page.waitForFunction(() => location.hash.replace('#', '') === 'calendar', { timeout: 8000 });
  await page.waitForSelector('#cal-detail-inline.show', { state: 'visible', timeout: 8000 });
  rec('查看日课跳转回日历并展开日课详情', true);

  // 无控制台报错
  rec('无控制台/页面 JS 报错', errors.length === 0, errors.slice(0, 2).join(' | '));

  await browser.close();
  const failed = recs.filter(r => !r.pass).length;
  console.log('\n' + (failed === 0 ? '[UI OK] 择日助手前端冒烟通过（三柱 + 本命合参）' : '[UI FAIL] ' + failed + ' 项未通过'));
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
