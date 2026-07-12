import { chromium } from 'playwright';

const browser = await chromium.launch({ 
  headless: true,
  channel: 'chrome'  // Use system Chrome
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const fs = await import('fs');

try {
  const html = fs.readFileSync('index.html', 'utf-8');
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('Page loaded');
  
  // Navigate to 八字
  await page.click('#tabBazi');
  await page.waitForTimeout(1000);
  
  // Check initial blank state
  const cal62Init = await page.textContent('#Cal62');
  console.log('Initial Cal62:', cal62Init?.substring(0, 60));
  
  // Person A
  await page.fill('#Name_input', '张三');
  await page.fill('#Cml_y', '1990');
  await page.fill('#Cml_m', '5');
  await page.fill('#Cml_d', '15');
  await page.fill('#Cml_his', '12:00');
  
  const goBtns = page.locator('.bazi-action-go');
  const goCount = await goBtns.count();
  console.log('确定 buttons:', goCount);
  
  if (goCount > 1) {
    await goBtns.nth(1).click(); // The one inside bzppxt
  } else {
    await goBtns.first().click();
  }
  await page.waitForTimeout(3000);
  
  // Check 流月 exists
  const ly1 = await page.locator('#liuyueContainer').count();
  console.log('Person A liuyueContainer:', ly1 > 0 ? 'EXISTS' : 'MISSING');
  
  // Click 第2运
  const dyHeaders = page.locator('.bt-dy-table .bt-dy-th');
  const dyCount = await dyHeaders.count();
  console.log('大运 headers:', dyCount);
  
  if (dyCount > 1) {
    await dyHeaders.nth(1).click();
    await page.waitForTimeout(500);
    const lyText = await page.locator('#liuyueContainer').textContent();
    console.log('Person A 流月 after 第2运:', lyText?.substring(0, 60));
  }
  
  // Save
  await page.click('.bazi-action-save');
  await page.waitForTimeout(500);
  console.log('Person A saved');
  
  // Person B
  await page.fill('#Name_input', '李四');
  await page.fill('#Cml_y', '1985');
  await page.fill('#Cml_m', '8');
  await page.fill('#Cml_d', '20');
  await page.fill('#Cml_his', '06:00');
  
  if (goCount > 1) {
    await goBtns.nth(1).click();
  } else {
    await goBtns.first().click();
  }
  await page.waitForTimeout(3000);
  
  // CRITICAL TEST: Person B 流月 linkage
  const ly2 = await page.locator('#liuyueContainer').count();
  console.log('Person B liuyueContainer:', ly2 > 0 ? 'EXISTS' : 'MISSING');
  
  if (dyCount > 1) {
    await dyHeaders.nth(1).click();
    await page.waitForTimeout(500);
    const lyTextB = await page.locator('#liuyueContainer').textContent();
    console.log('Person B 流月 after 第2运:', lyTextB?.substring(0, 60));
    
    // Check if 流月 text is different from Person A's
    await dyHeaders.nth(0).click();
    await page.waitForTimeout(500);
    const lyTextB0 = await page.locator('#liuyueContainer').textContent();
    console.log('Person B 流月 after 第1运:', lyTextB0?.substring(0, 60));
  }
  
  console.log('\n=== VERIFICATION COMPLETE ===');
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await browser.close();
}
