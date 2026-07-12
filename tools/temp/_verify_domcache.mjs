import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PORT = 8765;
const HTML = readFileSync('index.html', 'utf-8');

// Start minimal HTTP server
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});
server.listen(PORT);
console.log(`Server: http://localhost:${PORT}`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '_v_step0_load.png' });
  console.log('Step 0: Page loaded');

  // Step 1: Navigate to 八字 page
  const tabBazi = page.locator('#tabBazi');
  await tabBazi.click();
  await page.waitForTimeout(1500);
  console.log('Step 1: Navigated to 八字 page');

  // Verify placeholder is shown (blank state)
  const cal62Text = await page.locator('#Cal62').innerText();
  console.log('Cal62 placeholder:', cal62Text.substring(0, 80));

  // Step 2: Input Person A data and calculate
  await page.locator('#Name_input').fill('张三测试');
  await page.locator('#Cml_y').fill('1990');
  await page.locator('#Cml_m').fill('5');
  await page.locator('#Cml_d').fill('15');
  await page.locator('#Cml_his').fill('12:00');
  
  // Click 确定
  const goBtn = page.locator('.bazi-action-go').last();
  await goBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '_v_step2_person_a.png' });
  console.log('Step 2: Person A calculated');

  // Step 3: Verify 流月 container exists and has content
  const lyContainer = page.locator('#liuyueContainer');
  const lyExists = await lyContainer.count();
  console.log('liuyueContainer exists:', lyExists > 0);

  // Step 4: Click 第2运 header and check 流月 updates
  const dyHeaders = page.locator('.bt-dy-th');
  const dyCount = await dyHeaders.count();
  console.log('大运 headers found:', dyCount);
  
  if (dyCount > 1) {
    await dyHeaders.nth(1).click(); // 第2运
    await page.waitForTimeout(1000);
    const lyText2 = await lyContainer.innerText();
    console.log('流月 after 第2运 (first 60 chars):', lyText2.substring(0, 60));
    await page.screenshot({ path: '_v_step3_dayun2.png' });
    
    // Click back to 第1运
    await dyHeaders.nth(0).click();
    await page.waitForTimeout(500);
  }

  // Step 5: Save Person A
  const saveBtn = page.locator('.bazi-action-save').first();
  await saveBtn.click();
  await page.waitForTimeout(1000);
  console.log('Step 5: Person A saved');

  // Step 6: Input Person B data and calculate
  await page.locator('#Name_input').fill('李四测试');
  await page.locator('#Cml_y').fill('1985');
  await page.locator('#Cml_m').fill('8');
  await page.locator('#Cml_d').fill('20');
  await page.locator('#Cml_his').fill('06:00');
  
  await goBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '_v_step6_person_b.png' });
  console.log('Step 6: Person B calculated');

  // Step 7: Verify 流月 container still works for Person B
  const lyContainerB = page.locator('#liuyueContainer');
  const lyExistsB = await lyContainerB.count();
  console.log('liuyueContainer after Person B:', lyExistsB > 0);

  // Step 8: Click on 大运 headers for Person B - this is the critical test
  if (dyCount > 0) {
    await dyHeaders.nth(0).click();
    await page.waitForTimeout(800);
    const lyTextB1 = await lyContainerB.innerText();
    console.log('Person B 流月 after 第1运:', lyTextB1.substring(0, 60));
    await page.screenshot({ path: '_v_step8_person_b_dayun1.png' });
    
    if (dyCount > 1) {
      await dyHeaders.nth(1).click();
      await page.waitForTimeout(800);
      const lyTextB2 = await lyContainerB.innerText();
      console.log('Person B 流月 after 第2运:', lyTextB2.substring(0, 60));
      await page.screenshot({ path: '_v_step8_person_b_dayun2.png' });
    }
  }

  // Step 9: Try clicking on a specific 流年 to check 流月 linkage
  const lnHeaders = page.locator('.bt-ln-table .bt-dy-th');
  const lnCount = await lnHeaders.count();
  console.log('流年 headers:', lnCount);
  if (lnCount > 3) {
    await lnHeaders.nth(3).click();
    await page.waitForTimeout(800);
    const lyTextLn = await lyContainerB.innerText();
    console.log('Person B 流月 after clicking 流年:', lyTextLn.substring(0, 60));
    await page.screenshot({ path: '_v_step9_person_b_liunian.png' });
  }

  console.log('\n=== ALL STEPS PASSED ===');
} catch (e) {
  console.error('FAILED:', e.message);
  await page.screenshot({ path: '_v_error.png' });
} finally {
  await browser.close();
  server.close();
  console.log('Done');
}
