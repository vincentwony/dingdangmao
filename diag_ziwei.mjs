import { chromium } from 'playwright';

const URL = 'http://localhost:3000/app.html';
function log(...a){ console.log(...a); }

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on('console', m => { if (m.type()==='error') log('PAGE-ERR:', m.text()); });
page.on('pageerror', e => log('PAGE-EXCEPTION:', e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.click('#tabZiwei');
await page.waitForSelector('#zw-name', { timeout: 10000 });

await page.fill('#zw-name', '王');
await page.selectOption('#zw-sex', '男');
await page.click('input[name="zw-cal"][value="solar"]');
await page.selectOption('#zw-y', '1982');
await page.selectOption('#zw-m', '5');
await page.selectOption('#zw-d', '10');
await page.fill('#zw-time', '12:20');
await page.click('#zw-submit');

await page.waitForFunction(() => document.querySelectorAll('.zw-palace').length >= 12, { timeout: 15000 }).catch(()=>{});
await page.waitForTimeout(600);

const mingHTML = await page.$$eval('.zw-palace', els => {
  let best = null, bestLen = -1;
  els.forEach(e => {
    const n = e.querySelectorAll('.zw-star-block').length;
    if (n > bestLen) { bestLen = n; best = e; }
  });
  if (!best) return 'NO PALACE';
  const sl = best.querySelector('.zw-palace-starline');
  const cs = sl ? getComputedStyle(sl) : null;
  const sb = best.querySelector('.zw-star-block');
  const sbcs = sb ? getComputedStyle(sb) : null;
  return {
    html: best.outerHTML.slice(0, 1800),
    starlineDisplay: cs ? cs.display : 'n/a',
    starlineFlexDir: cs ? cs.flexDirection : 'n/a',
    starBlockDisplay: sbcs ? sbcs.display : 'n/a',
    starBlockFlexDir: sbcs ? sbcs.flexDirection : 'n/a',
  };
});
log('--- 命宫 palace ---'); log(JSON.stringify(mingHTML, null, 2));

const az = await page.$$eval('.zw-palace-azimuth', els => {
  if (!els.length) return 'NO AZIMUTH';
  const e = els[0];
  const cs = getComputedStyle(e);
  return { text: e.textContent, color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight, opacity: cs.opacity, side: e.getAttribute('data-side') };
});
log('--- azimuth ---'); log(JSON.stringify(az, null, 2));

const dx = await page.$eval('.zw-info-dx-list', e => e.outerHTML).catch(()=> 'NO DX LIST');
log('--- dx-list ---'); log(dx);

const sihua = await page.$eval('.zw-info-sihua', e => e.outerHTML).catch(()=> 'NO SIHUA');
const legend = await page.$eval('.zw-self-mutagen-legend', e => e.outerHTML).catch(()=> 'NO LEGEND');
log('--- info sihua ---'); log(sihua);
log('--- self mutagen legend ---'); log(legend);

const perPalace = await page.$$eval('.zw-palace', els => els.map(e => ({
  name: (e.querySelector('.zw-palace-name')||{}).textContent,
  starBlocks: e.querySelectorAll('.zw-star-block').length,
  starlines: e.querySelectorAll('.zw-palace-starline').length,
})));
log('--- per palace star count ---'); log(JSON.stringify(perPalace, null, 2));

await browser.close();
log('DIAG_DONE');
