import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.route('**/*', (route) => {
  const u = route.request().url();
  if (u.includes('fonts.googleapis') || u.includes('fonts.gstatic')) return route.abort();
  return route.continue();
});

await page.goto('http://localhost:3000/app.html', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#tabZiwei', { timeout: 10000 });
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

await page.waitForFunction(() => document.querySelectorAll('.zw-palace').length === 12, { timeout: 15000 });
await page.waitForTimeout(800);
await page.addStyleTag({ content: '* { font-family: system-ui, sans-serif !important; }' });

const data = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.zw-palace').forEach((pal) => {
    const name = pal.querySelector('.zw-palace-name')?.textContent || '?';
    const blocks = [];
    pal.querySelectorAll('.zw-star-block').forEach((blk) => {
      const r = blk.getBoundingClientRect();
      blocks.push({
        text: blk.textContent.slice(0, 12),
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height)
      });
    });
    out.push({ name, blocks });
  });
  return out;
});

console.log('=== 各宫星块位置（x,y,w,h）===');
data.forEach((p) => {
  console.log(`\n[${p.name}]`);
  p.blocks.forEach((b) => console.log(`  ${b.text}: x=${b.x} y=${b.y} w=${b.w} h=${b.h}`));
});

await browser.close();
