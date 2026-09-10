import { chromium } from 'playwright';
import { createHmac } from 'node:crypto';

const machineId = 'TEST-MID';
const ts = Math.floor(Date.now() / 1000);
const nonce = Math.random().toString(36).slice(2, 12);
const sign = (mid, t, n, p) => createHmac('sha256', 'workbuddy-secret').update(`${mid}\n${t}\n${n}\n${p}`).digest('hex');
const sig = sign(machineId, ts, nonce, '/api/v1/ziwei/astrolabe');

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1600 } });
await page.route('**/*', (route) => {
  const u = route.request().url();
  if (u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com')) return route.abort();
  return route.continue();
});
await page.goto('http://localhost:3000/app.html', { waitUntil: 'domcontentloaded' });
await page.click('#tabZiwei');
await page.waitForSelector('#zw-name');
await page.fill('#zw-name', '王');
await page.selectOption('#zw-sex', '男');
await page.click('input[name="zw-cal"][value="solar"]');
await page.selectOption('#zw-y', '1982');
await page.selectOption('#zw-m', '5');
await page.selectOption('#zw-d', '10');
await page.fill('#zw-time', '12:20');
await page.click('#zw-submit');
await page.waitForSelector('.zw-palace', { timeout: 8000 });

const data = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.zw-palace').forEach(pal => {
    const name = pal.querySelector('.zw-palace-name')?.textContent || '?';
    const blocks = [...pal.querySelectorAll('.zw-star-block')];
    const rects = blocks.map(b => {
      const r = b.getBoundingClientRect();
      return { name: b.querySelector('.zw-star-block-name')?.textContent || b.textContent, x: Math.round(r.x), w: Math.round(r.width), top: Math.round(r.top) };
    });
    out.push({ palace: name, blocks: rects });
  });
  return out;
});

let maxGap = 0, minGap = 99;
console.log('宫位 | 星列宽(均) | 最大相邻间距');
for (const p of data) {
  const ws = p.blocks.map(b => b.w);
  const avg = Math.round(ws.reduce((a,b)=>a+b,0)/ws.length);
  let localMax = 0;
  const gaps = [];
  for (let i = 1; i < p.blocks.length; i++) {
    if (Math.abs(p.blocks[i-1].top - p.blocks[i].top) < 4) {
      const g = p.blocks[i].x - (p.blocks[i-1].x + p.blocks[i-1].w);
      gaps.push(g); localMax = Math.max(localMax, g); maxGap = Math.max(maxGap, g); minGap = Math.min(minGap, g);
    }
  }
  console.log(`${p.palace.padEnd(3)} | avg w=${avg}px | gaps=[${gaps.join(', ')}]`);
}
console.log(`\n全局 最小间距=${minGap}px 最大间距=${maxGap}px`);
await browser.close();
