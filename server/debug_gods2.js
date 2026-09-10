const { chromium } = require('H:/Phone/node_modules/playwright');
async function setToggle(page, ds, c){ await page.locator(`#settingsPanel input[data-set="${ds}"]`).evaluate((el,v)=>{el.checked=v;el.dispatchEvent(new Event('change',{bubbles:true}));}, c); await page.waitForTimeout(150); }
async function openSettings(page){ await page.click('#tabSettings'); await page.waitForSelector('#settingsPanel.show',{timeout:4000}); await page.waitForTimeout(160); }
async function closeSettings(page){ await page.keyboard.press('Escape'); await page.waitForTimeout(60); }
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/app.html', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.goto('http://localhost:3000/app.html#calendar', { waitUntil: 'load' });
  await page.waitForSelector('#Cal3 .cal-cell', { timeout: 6000 });
  // gods-off
  await openSettings(page); await setToggle(page,'cal_showGods',false); await closeSettings(page);
  await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#Cal3 .cal-cell',{timeout:6000});
  await page.locator('#Cal3 .cal-cell:not(.other-month)').first().click();
  await page.waitForTimeout(1200);
  let off = await page.evaluate(()=>{const h=document.getElementById('cal-detail-inline');return {show:h&&h.classList.contains('show'),gt:!!(h&&h.querySelector('.good-title')),ls:localStorage.getItem('cal_showGods')};});
  console.log('gods-off', JSON.stringify(off));
  // gods-on (mirror smoke)
  await openSettings(page); await setToggle(page,'cal_showGods',true); await closeSettings(page);
  await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#Cal3 .cal-cell',{timeout:6000});
  const firstCellInfo = await page.evaluate(()=>{const c=document.querySelector('#Cal3 .cal-cell:not(.other-month)');return {day:c&&c.dataset.day, detailOn:c&&c.classList.contains('detail-on')};});
  console.log('before click', JSON.stringify(firstCellInfo));
  await page.locator('#Cal3 .cal-cell:not(.other-month)').first().click();
  await page.waitForTimeout(1200);
  let on = await page.evaluate(()=>{const h=document.getElementById('cal-detail-inline');return {show:h&&h.classList.contains('show'),gt:!!(h&&h.querySelector('.good-title')),ls:localStorage.getItem('cal_showGods'),len:h?h.innerHTML.length:-1};});
  console.log('gods-on', JSON.stringify(on));
  await browser.close();
})();
