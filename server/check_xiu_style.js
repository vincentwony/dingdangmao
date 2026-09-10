// 二十八宿样式冒烟：确认 .xiu-text 颜色/字重生效，明暗两态无回归
'use strict';
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const recs = [];
const rec = (n, p, i) => { recs.push({ n, p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i ? ' :: ' + i : '')); };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  // 注意：≤480px 窄屏下 .xiu-text 被设计性隐藏（防堆叠溢出），故用桌面宽度验证
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1000, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));

  for (const theme of ['light', 'dark']) {
    // 注意：应用默认 dark。切主题需 goto 后写 localStorage 再 reload（同 check_footer.js 约定）
    await page.goto(BASE + '/app.html#calendar', { waitUntil: 'domcontentloaded' });
    // 先等首屏渲染完成，再写主题并 reload；否则会中断在途请求，产生 Failed to fetch 假阳性
    await page.waitForSelector('#Cal3 .cal-cell .xiu-text', { timeout: 10000 });
    await page.evaluate(t => { try { localStorage.setItem('theme', t); } catch (e) {} }, theme);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#Cal3 .cal-cell .xiu-text', { timeout: 10000 });
    await page.waitForTimeout(300);
    // 断言主题确实切到目标态，避免"主题没切成功"造成的假阳性
    const isDark = await page.evaluate(() => document.body.classList.contains('dark'));
    rec(theme + ' 主题已切换', theme === 'dark' ? isDark : !isDark, 'body.dark=' + isDark);
    const st = await page.locator('#Cal3 .cal-cell .xiu-text').first().evaluate(el => {
      const c = getComputedStyle(el);
      return { color: c.color, weight: c.fontWeight, text: el.textContent.trim() };
    });
    rec(theme + ' 二十八宿已渲染', st.text.length > 0, '首宿=' + st.text);
    rec(theme + ' 字重为粗体(>=700)', parseInt(st.weight, 10) >= 700, 'weight=' + st.weight);
    // 靛青：蓝色分量应明显高于红/绿分量
    const m = st.color.match(/\d+/g).map(Number);
    rec(theme + ' 颜色为靛青(B>R)', m && m[2] > m[0] + 20, 'color=' + st.color);
    // 与干支(灰)不同色
    const gz = await page.locator('#Cal3 .cal-cell .gz-text').first().evaluate(el => getComputedStyle(el).color);
    rec(theme + ' 与干支颜色可区分', gz !== st.color, 'xiu=' + st.color + ' gz=' + gz);
  }

  rec('无控制台错误', errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close();
  const failed = recs.filter(r => !r.p);
  console.log('\n==== 二十八宿样式冒烟: ' + (recs.length - failed.length) + '/' + recs.length + ' 通过 ====');
  if (failed.length) { console.log('失败项: ' + failed.map(f => f.n).join(', ')); process.exit(1); }
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
