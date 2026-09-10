const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('' + e));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await page.goto('http://localhost:3000/app.html#home', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.home-entries', { timeout: 8000 });

  // 校验 5 个图标均已是 svg（非 ti 字体）
  const info = await page.$$eval('.home-entry-icon', els => els.map(e => {
    const svg = e.querySelector('svg');
    return { cls: e.className, isSvg: !!svg, paths: svg ? svg.querySelectorAll('path,circle,rect').length : 0 };
  }));
  console.log('ICON_NODES=' + JSON.stringify(info));

  const el = await page.$('.home-entries');
  await el.screenshot({ path: 'server/_shots/home_icons.png' });
  console.log('SHOT_OK errors=' + errors.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
