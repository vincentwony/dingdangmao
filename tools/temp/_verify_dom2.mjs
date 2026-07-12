import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolve } from 'path';

const filePath = resolve('index.html');
const fileUrl = pathToFileURL(filePath).href;

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log('Page loaded from file');
  
  // Wait for app initialization (scripts run after DOM)
  await page.waitForSelector('#Cal3', { timeout: 5000 }).catch(() => console.log('Cal3 not found'));
  
  // Navigate to 八字 page
  await page.click('#tabBazi');
  await page.waitForTimeout(2000);
  
  // Check initial Cal62
  const cal62 = await page.textContent('#Cal62');
  console.log('Cal62:', cal62?.substring(0, 80) || 'EMPTY');
  
  // Check if bazi form is visible
  const bzppxt = await page.locator('#bzppxt');
  const display = await bzppxt.evaluate(el => el.style.display);
  console.log('bzppxt display:', display);
  
  // Try to input
  const nameInput = page.locator('#Name_input');
  const visible = await nameInput.isVisible().catch(() => false);
  console.log('Name_input visible:', visible);
  
  if (visible) {
    await nameInput.fill('张三');
    console.log('Filled name');
  }
  
  await page.screenshot({ path: '_v_screenshot.png' });
  console.log('Screenshot saved');
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await browser.close();
}
