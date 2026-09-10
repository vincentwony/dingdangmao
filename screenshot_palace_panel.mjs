import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, 'ziwei_palace_panel_preview.png');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  await page.goto('file://' + path.join(__dirname, 'web/ziwei-palace-panel.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.palace', { timeout: 5000 });
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('saved:', outPath);
  await browser.close();
})();
