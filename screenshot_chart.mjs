import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, 'ziwei_chart_preview.png');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 760, height: 640 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(__dirname, 'web/ziwei-chart.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#chart .palace', { timeout: 5000 });
  await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('saved:', outPath);
  await browser.close();
})();
