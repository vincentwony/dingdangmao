const { chromium } = require('H:/Phone/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type()==='error') console.log('CONSOLE.ERR', m.text()); });
  await page.goto('http://localhost:3000/app.html', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.goto('http://localhost:3000/app.html#calendar', { waitUntil: 'load' });
  await page.waitForSelector('#Cal3 .cal-cell', { timeout: 6000 });
  // 直接点 day 15 避免与 today 自动选中冲突
  const cell = page.locator('#Cal3 .cal-cell[data-day="15"]:not(.other-month)');
  await cell.click();
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const host = document.getElementById('cal-detail-inline');
    return {
      show: host && host.classList.contains('show'),
      len: host ? host.innerHTML.length : -1,
      hasGoodTitle: !!(host && host.querySelector('.good-title')),
      hasBadTitle: !!(host && host.querySelector('.bad-title')),
      hasGoodTag: !!(host && host.querySelector('.good-tag')),
      showGodsLS: localStorage.getItem('cal_showGods'),
      snippet: host ? host.innerHTML.slice(0, 300) : 'NO HOST'
    };
  });
  console.log(JSON.stringify(info, null, 2));
  // 也查一下 API 返回
  const api = await page.evaluate(async () => {
    const r = await fetch('/calendar/day', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({y:2026,m:8,d:15}) });
    const j = await r.json();
    return { ok: j.ok, goodN: (j.data&&j.data.goodGods||[]).length, badN: (j.data&&j.data.badGods||[]).length };
  }).catch(e => ({err:e.message}));
  console.log('API', JSON.stringify(api));
  await browser.close();
})();
