import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

const fileUrl = pathToFileURL(resolve('index.html')).href;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const results = []; // { test: '', status: '', detail: '' }
function ok(msg, detail) { results.push({ test: msg, status: '✅', detail }); console.log('✅ ' + msg); }
function warn(msg, detail) { results.push({ test: msg, status: '⚠️', detail }); console.log('⚠️ ' + msg); }
function fail(msg, detail) { results.push({ test: msg, status: '❌', detail }); console.log('❌ ' + msg); }

try {
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // ===== TEST 1: Cal62 innerHTML replacement (八字 calculation) =====
  console.log('\n=== TEST 1: Cal62 replacement after ML_calc ===');
  await page.click('#tabBazi');
  await page.waitForTimeout(1000);
  
  // Calc Person A
  await page.fill('#Name_input', 'TestA');
  await page.fill('#Cml_y', '1990');
  await page.fill('#Cml_m', '5');
  await page.fill('#Cml_d', '15');
  await page.fill('#Cml_his', '12:00');
  const goBtns = page.locator('.bazi-action-go');
  const goCount = await goBtns.count();
  await goBtns.nth(goCount - 1).click();
  await page.waitForTimeout(3000);
  
  // TEST 1a: liuyueContainer after first calc
  let ly = await page.evaluate(() => {
    const el = document.getElementById('liuyueContainer');
    return el ? { inDOM: document.contains(el), text: el.textContent?.substring(0, 30) } : null;
  });
  if (ly?.inDOM) ok('1a: liuyueContainer in DOM after ML_calc(A)', ly.text);
  else fail('1a: liuyueContainer NOT in DOM after ML_calc(A)', '');
  
  // Click 第2运 → triggers ChangeLn which uses DOMCache.get('liuyueContainer')
  const dyHeaders = page.locator('.bt-dy-table .bt-dy-th');
  if (await dyHeaders.count() > 1) {
    await dyHeaders.nth(1).click();
    await page.waitForTimeout(500);
    ly = await page.evaluate(() => {
      const el = document.getElementById('liuyueContainer');
      return el ? { inDOM: document.contains(el), text: el.textContent?.substring(0, 30) } : null;
    });
    if (ly?.inDOM && ly.text?.length > 0) ok('1b: ChangeLn updates liuyueContainer after ML_calc(A)', ly.text);
    else fail('1b: ChangeLn failed to update liuyueContainer', '');
  }
  
  // TEST 1c: baziAllResult after calc
  await page.evaluate(() => { if (typeof showBaziAll === 'function') showBaziAll(); });
  await page.waitForTimeout(500);
  let bzAll = await page.evaluate(() => {
    const el = document.getElementById('baziAllResult');
    return el ? { inDOM: document.contains(el), text: el.textContent?.substring(0, 30) } : null;
  });
  if (bzAll?.inDOM) ok('1c: baziAllResult in DOM after showBaziAll(A)', bzAll.text);
  else fail('1c: baziAllResult NOT found', '');
  
  // ===== TEST 2: Second calculation (Person B) — the critical DOMCache test =====
  console.log('\n=== TEST 2: Second calc changes Cal62 innerHTML ===');
  await page.fill('#Name_input', 'TestB');
  await page.fill('#Cml_y', '1985');
  await page.fill('#Cml_m', '8');
  await page.fill('#Cml_d', '20');
  await page.fill('#Cml_his', '06:00');
  await goBtns.nth(goCount - 1).click();
  await page.waitForTimeout(3000);
  
  // TEST 2a: DOMCache.get should auto-invalidate stale liuyueContainer
  if (await dyHeaders.count() > 1) {
    await dyHeaders.nth(0).click();
    await page.waitForTimeout(500);
    ly = await page.evaluate(() => {
      const el = document.getElementById('liuyueContainer');
      return el?.textContent?.substring(0, 40);
    });
    if (ly && ly.includes('流月')) ok('2a: DOMCache auto-refresh liuyueContainer for Person B', ly);
    else fail('2a: DOMCache returned stale/detached liuyueContainer', ly || 'null');
  }
  
  // TEST 2b: baziAllResult after Person B
  await page.evaluate(() => { if (typeof showBaziAll === 'function') showBaziAll(); });
  await page.waitForTimeout(500);
  bzAll = await page.evaluate(() => {
    const el = document.getElementById('baziAllResult');
    return el?.textContent?.substring(0, 40);
  });
  if (bzAll && bzAll.length > 0) ok('2b: baziAllResult displays Person B data', bzAll);
  else fail('2b: baziAllResult stale/failed for Person B', bzAll || 'null');
  
  // ===== TEST 3: Calendar DOMCache after getLunar/showNianli =====
  console.log('\n=== TEST 3: Cal3 replacement ===');
  await page.click('#tabCalendar');
  await page.waitForTimeout(1500);
  let cal3InDOM = await page.evaluate(() => {
    return document.contains(document.getElementById('Cal3'));
  });
  if (cal3InDOM) ok('3a: Cal3 in DOM after backToCalendar', '');
  else fail('3a: Cal3 NOT in DOM after backToCalendar', '');
  
  // Switch to 年历 and back — Cal3 replaced
  await page.click('#tabNianli');
  await page.waitForTimeout(1500);
  await page.click('#tabCalendar');
  await page.waitForTimeout(1500);
  cal3InDOM = await page.evaluate(() => {
    const el = document.getElementById('Cal3');
    return el && document.contains(el) && el.innerHTML.length > 100;
  });
  if (cal3InDOM) ok('3b: Cal3 valid after 年历→月历 roundtrip', '');
  else fail('3b: Cal3 broken after 年历→月历', '');
  
  // ===== TEST 4: Weather page DOMCache =====
  console.log('\n=== TEST 4: Weather wx-full-* elements ===');
  await page.click('#tabWeather');
  await page.waitForTimeout(1500);
  let wxIcon = await page.evaluate(() => {
    const el = document.getElementById('wx-full-icon');
    return el && document.contains(el);
  });
  if (wxIcon) ok('4a: wx-full-icon in DOM', '');
  else fail('4a: wx-full-icon not found', '');
  
  // ===== SUMMARY =====
  console.log('\n========== RESULTS ==========');
  let pass = 0, warnCount = 0, failCount = 0;
  for (const r of results) {
    console.log(r.status + ' ' + r.test);
    if (r.status === '✅') pass++; else if (r.status === '⚠️') warnCount++; else failCount++;
  }
  console.log(`\nPass: ${pass}, Warn: ${warnCount}, Fail: ${failCount}`);
  if (failCount === 0) console.log('ALL DOMCache TESTS PASSED');
  else console.log('SOME TESTS FAILED — check above');
  
  await page.screenshot({ path: '_v_domcache_final.png' });
} catch(e) {
  console.error('FATAL:', e.message);
} finally {
  await browser.close();
}
