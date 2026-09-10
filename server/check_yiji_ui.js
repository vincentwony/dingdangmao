// 前端冒烟：宜忌（日课）卡片渲染 + 红砂后置注入可见性
// 用法：node check_yiji_ui.js
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  const results = [];
  const assert = (name, cond) => { results.push((cond ? '✅ ' : '❌ ') + name); };

  try {
    await page.goto(BASE + '/app.html#calendar', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#Cal3 .cal-cell', { timeout: 10000 });
    await page.waitForTimeout(500);

    // 点选大红砂日 2026-09-05
    await page.click('#Cal3 .cal-cell[data-year="2026"][data-month="9"][data-day="5"]');
    await page.waitForSelector('.detail-yiji', { timeout: 8000 });
    await page.waitForTimeout(400);
    const da = await page.evaluate(() => {
      const el = document.querySelector('.detail-yiji');
      return {
        goodText: (el.querySelector('.yiji-good .yiji-items') || {}).textContent || '',
        extraCount: el.querySelectorAll('.yiji-extra').length,
        cardShown: !!el
      };
    });
    assert('大红砂日宜忌卡片渲染', da.cardShown);
    assert('大红砂日「宜」含「百事吉（大红砂·吉）」', da.goodText.includes('百事吉（大红砂·吉）'));
    assert('红砂补充项带 yiji-extra 标注', da.extraCount >= 1);

    // 点选小红砂日 2026-09-16
    await page.click('#Cal3 .cal-cell[data-year="2026"][data-month="9"][data-day="16"]');
    await page.waitForTimeout(700);
    const xi = await page.evaluate(() => {
      const el = document.querySelector('.detail-yiji');
      return {
        badText: (el.querySelector('.yiji-bad .yiji-items') || {}).textContent || '',
        extraCount: el.querySelectorAll('.yiji-extra').length
      };
    });
    assert('小红砂日「忌」含「红砂日（小红砂·忌百事）」', xi.badText.includes('红砂日（小红砂·忌百事）'));
    assert('小红砂补充项带 yiji-extra 标注', xi.extraCount >= 1);

    // 今日（非红砂）卡片也应正常渲染且非空
    await page.click('#Cal3 .cal-cell[data-year="2026"][data-month="9"][data-day="6"]');
    await page.waitForTimeout(500);
    const today = await page.evaluate(() => {
      const el = document.querySelector('.detail-yiji');
      const good = el.querySelector('.yiji-good .yiji-items');
      const bad = el.querySelector('.yiji-bad .yiji-items');
      return { good: good.textContent.trim().length, bad: bad.textContent.trim().length };
    });
    assert('常规日宜忌卡片有内容（非空）', today.good > 0 && today.bad > 0);

    assert('无控制台报错', errors.length === 0);
  } catch (e) {
    results.push('❌ 脚本异常: ' + e.message);
  }

  console.log(results.join('\n'));
  if (errors.length) console.log('\n控制台错误:\n' + errors.join('\n'));
  const failed = results.filter(r => r.startsWith('❌')).length;
  console.log('\n' + (failed ? '❌ 有 ' + failed + ' 项失败' : '✅ 全部通过') + ' (' + results.length + ' 项)');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
