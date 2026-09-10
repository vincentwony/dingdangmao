const { chromium } = require('H:/Phone/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('console', m => { if(m.type()==='error') console.log('CONSOLE.ERR', m.text()); });
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto('http://localhost:3000/app.html', { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('zw_reminders', JSON.stringify([{ type: 'daily', title: '测试提醒' }]));
    localStorage.setItem('cal_enableReminders', 'true');
  });
  await page.goto('http://localhost:3000/app.html#calendar', { waitUntil: 'load' });
  await page.waitForSelector('#Cal3 .cal-cell', { timeout: 6000 });
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    return {
      hasReminders: typeof window.Reminders,
      forDate: window.Reminders ? window.Reminders.forDate(2026,8,15).length : 'N/A',
      enableRaw: localStorage.getItem('cal_enableReminders'),
      dotCount: document.querySelectorAll('#Cal3 .cal-reminder-dot').length,
      firstCellHtml: (document.querySelector('#Cal3 .cal-cell:not(.other-month) .solar-num')||{}).innerHTML || 'none'
    };
  });
  console.log('REMINDER', JSON.stringify(info, null, 2));

  // export download test
  await page.evaluate(() => localStorage.setItem('cal_export_probe', '42'));
  await page.click('#tabSettings');
  await page.waitForSelector('#settingsPanel.show', { timeout: 4000 });
  await page.waitForTimeout(200);
  let dl = null;
  try {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 6000 }),
      page.click('#exportDataBtn')
    ]);
    const p = await download.path();
    const fs = require('fs');
    dl = { name: download.suggestedFilename(), hasProbe: fs.readFileSync(p,'utf8').includes('cal_export_probe') };
  } catch(e) { dl = { error: e.message }; }
  console.log('EXPORT', JSON.stringify(dl));
  await browser.close();
})();
