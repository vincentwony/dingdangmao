const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const OUT = 'H:/Phone/server/_footer_shots';
fs.mkdirSync(OUT, { recursive: true });

const recs = [];
const rec = (name, pass, info) => { recs.push({ name, pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? ' :: ' + info : '')); };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 414, height: 820 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('response', r => {
    const u = r.url();
    const s = r.status();
    if (s >= 400 && !/favicon\.ico/.test(u)) errs.push('HTTP ' + s + ' ' + u);
  });

  await page.evaluate(() => { try { localStorage.setItem('theme', 'light'); } catch (e) {} });
  await page.goto(BASE + '/app.html#calendar', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#Cal3 .cal-cell', { timeout: 8000 });
  // 应用默认 dark，先切到 light 截图
  await page.evaluate(() => { try { localStorage.setItem('theme', 'light'); } catch (e) {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#Cal3 .cal-cell', { timeout: 8000 });
  await page.waitForTimeout(400);

  // 1) 默认折叠（无痕上下文，不应有 cal_footExpanded=1）
  let collapsed = await page.locator('#pageFoot').evaluate(el => el.classList.contains('collapsed'));
  rec('默认折叠不遮挡内容', collapsed, 'collapsed=' + collapsed);

  // 2) 折叠态下印章手柄存在且可点，body 不可见
  let sealVisible = await page.locator('#footTab .foot-seal').isVisible();
  let bodyOpacity = await page.locator('#pageFoot .foot-body').evaluate(el => parseFloat(getComputedStyle(el).opacity));
  rec('印章手柄可见', sealVisible, 'sealVisible=' + sealVisible);
  rec('折叠态面板不可见(opacity≈0)', bodyOpacity < 0.05, 'opacity=' + bodyOpacity);

  await page.screenshot({ path: OUT + '/light_collapsed.png' });

  // 3) 点击展开 → 面板可见 + 文案 + aria-expanded
  await page.waitForTimeout(700); // 等入场动效结束，元素稳定
  await page.locator('#footTab').click({ force: true });
  await page.waitForTimeout(500);
  let expanded = await page.locator('#pageFoot').evaluate(el => !el.classList.contains('collapsed'));
  let aria = await page.locator('#footTab').getAttribute('aria-expanded');
  let bodyOpacity2 = await page.locator('#pageFoot .foot-body').evaluate(el => parseFloat(getComputedStyle(el).opacity));
  let txt = await page.locator('#pageFoot .foot-body').innerText();
  rec('点击展开面板', expanded && bodyOpacity2 > 0.9, 'expanded=' + expanded + ' opacity=' + bodyOpacity2);
  rec('aria-expanded=true', aria === 'true', 'aria=' + aria);
  rec('含品牌/来源/署名文案', /八卦掌决版/.test(txt) && /寿星万年历/.test(txt) && /王贵柱/.test(txt) && /梓踊/.test(txt), 'len=' + txt.length);
  await page.screenshot({ path: OUT + '/light_expanded.png' });

  // 4) 偏好记忆：重载后仍展开
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#Cal3 .cal-cell', { timeout: 8000 });
  await page.waitForTimeout(300);
  let stillExpanded = await page.locator('#pageFoot').evaluate(el => !el.classList.contains('collapsed'));
  rec('展开偏好持久化', stillExpanded, 'stillExpanded=' + stillExpanded);

  // 5) 暗色模式截图
  await page.evaluate(() => { try { localStorage.setItem('theme', 'dark'); } catch (e) {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#Cal3 .cal-cell', { timeout: 8000 });
  await page.waitForTimeout(300);
  await page.locator('#footTab').click({ force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '/dark_expanded.png' });
  rec('暗色模式展开无报错', true, 'screenshot saved');

  rec('无控制台错误', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  const failed = recs.filter(r => !r.pass);
  console.log('\n==== 页脚验证结果: ' + (recs.length - failed.length) + '/' + recs.length + ' 通过 ====');
  if (failed.length) { console.log('失败项: ' + failed.map(f => f.name).join(', ')); process.exit(1); }
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
