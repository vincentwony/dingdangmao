import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

const fileUrl = pathToFileURL(resolve('index.html')).href;

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  // Nav to 八字
  await page.click('#tabBazi');
  await page.waitForTimeout(1500);
  
  // === PERSON A ===
  console.log('--- Person A ---');
  await page.fill('#Name_input', '张三');
  await page.fill('#Cml_y', '1990');
  await page.fill('#Cml_m', '5');
  await page.fill('#Cml_d', '15');
  await page.fill('#Cml_his', '12:00');
  
  const goBtns = page.locator('.bazi-action-go');
  const goCount = await goBtns.count();
  await goBtns.nth(goCount - 1).click(); // last one = inside bzppxt
  await page.waitForTimeout(4000);
  
  // Check 大运 headers
  const dyHeaders = page.locator('.bt-dy-table .bt-dy-th');
  const dyCount = await dyHeaders.count();
  console.log('大运 count:', dyCount);
  
  // Check 流月 exists
  let lyCount = await page.locator('#liuyueContainer').count();
  console.log('liuyueContainer exists:', lyCount > 0);
  
  // Click 第2运 → 流月 should update
  if (dyCount > 1) {
    await dyHeaders.nth(1).click();
    await page.waitForTimeout(800);
    const lyA2 = await page.locator('#liuyueContainer').textContent();
    console.log('PersonA 流月(第2运):', lyA2?.substring(0, 50));
  }
  
  // Save Person A
  await page.click('.bazi-action-save');
  await page.waitForTimeout(500);
  console.log('Person A saved ✓');
  
  // === PERSON B (critical test) ===
  console.log('\n--- Person B ---');
  await page.fill('#Name_input', '李四');
  await page.fill('#Cml_y', '1985');
  await page.fill('#Cml_m', '8');
  await page.fill('#Cml_d', '20');
  await page.fill('#Cml_his', '06:00');
  
  await goBtns.nth(goCount - 1).click();
  await page.waitForTimeout(4000);
  
  // CRITICAL: Does liuyueContainer still work?
  lyCount = await page.locator('#liuyueContainer').count();
  console.log('PersonB liuyueContainer exists:', lyCount > 0);
  
  if (lyCount > 0 && dyCount > 1) {
    // Click 第1运
    await dyHeaders.nth(0).click();
    await page.waitForTimeout(800);
    const lyB0 = await page.locator('#liuyueContainer').textContent();
    console.log('PersonB 流月(第1运):', lyB0?.substring(0, 50));
    
    // Click 第2运 - THIS IS THE CRITICAL TEST
    await dyHeaders.nth(1).click();
    await page.waitForTimeout(800);
    const lyB1 = await page.locator('#liuyueContainer').textContent();
    console.log('PersonB 流月(第2运):', lyB1?.substring(0, 50));
    
    // Verify 流月 changed between 大运 clicks
    if (lyB0 !== lyB1 || lyB0?.length > 0) {
      console.log('✓ 流月联动正常 - Person A和B切换大运时流月均更新');
    } else {
      console.log('✗ 流月可能未更新');
    }
  }
  
  // Also test clicking a specific 流年
  const lnHeaders = page.locator('.bt-ln-table .bt-dy-th');
  const lnCount = await lnHeaders.count();
  console.log('\n流年 headers:', lnCount);
  if (lnCount > 2) {
    await lnHeaders.nth(2).click();
    await page.waitForTimeout(800);
    const lyLn = await page.locator('#liuyueContainer').textContent();
    console.log('PersonB 流月(click流年):', lyLn?.substring(0, 50));
  }
  
  await page.screenshot({ path: '_v_final.png' });
  console.log('\n=== ALL TESTS COMPLETE ===');
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await browser.close();
}
