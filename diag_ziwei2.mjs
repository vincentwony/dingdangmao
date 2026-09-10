import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
// 阻断外网字体请求，避免 fonts.ready 永不返回
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

await page.waitForFunction(() => {
  const palaces = document.querySelectorAll('.zw-palace');
  return palaces.length === 12;
}, { timeout: 15000 }).catch(() => {});

// 导出每个宫的文本与结构
const dump = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.zw-palace').forEach((el) => {
    const name = el.querySelector('.zw-palace-name')?.textContent || '?';
    const branch = el.querySelector('.zw-palace-branch')?.textContent || '';
    const right = el.querySelector('.zw-palace-rightcol')?.textContent || '';
    const center = el.querySelector('.zw-palace-center')?.textContent || '';
    const left = el.querySelector('.zw-palace-leftcol')?.textContent || '';
    const foot = el.querySelector('.zw-palace-foot')?.textContent || '';
    out.push({ name, branch, center, left, right, foot });
  });
  return out;
});

console.log('=== 12宫 实际渲染文本 ===');
dump.forEach((d) => {
  console.log(`[${d.name} ${d.branch}]`);
  console.log(`  左(长生): ${JSON.stringify(d.left)}`);
  console.log(`  中(星耀): ${JSON.stringify(d.center)}`);
  console.log(`  右(数字): ${JSON.stringify(d.right)}`);
  console.log(`  底(神煞): ${JSON.stringify(d.foot)}`);
});

await browser.close();
console.log('DUMP_DONE');
