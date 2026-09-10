// 前端冒烟：八字排盘 · 子时流派下拉（Phase 1.3）
// 用 Playwright(msedge) 验证 #ZiShi_sel 存在且切换后 23:30 出生者日柱/时柱渲染不同。
const { chromium } = require('playwright');

(async () => {
  let browser, pass = true;
  try {
    browser = await chromium.launch({ channel: 'msedge' });
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1100, height: 900 });
    const errs = [];
    // 忽略「资源加载类 404」噪声（如 favicon / 懒加载资源），仅捕获真实 JS 运行期错误
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/i.test(m.text())) errs.push(m.text()); });

    await page.goto('http://localhost:3000/app.html', { waitUntil: 'networkidle' });
    // 切到八字页
    await page.waitForSelector('#tabBazi', { timeout: 10000 });
    await page.click('#tabBazi');
    await page.waitForSelector('#ZiShi_sel', { timeout: 10000 });

    // 1) 下拉存在且默认 wan
    const optCount = await page.$$eval('#ZiShi_sel option', os => os.length);
    const defVal = await page.$eval('#ZiShi_sel', el => el.value);
    console.log('子时下拉选项数=' + optCount + ' 默认值=' + defVal);
    if (optCount !== 2 || defVal !== 'wan') { pass = false; console.log('❌ 子时下拉结构不符预期'); }

    // 辅助：填表并取结果正文
    async function calc(ziShiVal) {
      await page.selectOption('#Cml_y', '1996');
      await page.selectOption('#Cml_m', '7');
      await page.selectOption('#Cml_d', '1');
      await page.fill('#Cml_his', '23:30');
      await page.selectOption('#Dst_sel', 'off');        // 排除 DST 干扰
      await page.selectOption('#ZiShi_sel', ziShiVal);
      await page.click('#baziBtnSubmit');
      await page.waitForSelector('#baziResultArea', { timeout: 10000 });
      await page.waitForTimeout(400);
      return await page.$eval('#baziResultArea', el => el.innerText);
    }

    const wanTxt = await calc('wan');
    const zaoTxt = await calc('zao');
    console.log('wan 结果含「庚子」=' + wanTxt.includes('庚子'));
    console.log('zao 结果含「己亥」=' + zaoTxt.includes('己亥'));
    // 夜子时 23:30 → 日柱庚子(次日)；早子时 → 日柱己亥(当日)
    const differ = wanTxt !== zaoTxt && wanTxt.includes('庚子') && zaoTxt.includes('己亥');
    console.log('两派渲染结果不同=' + differ);
    if (!differ) { pass = false; console.log('❌ 子时流派切换未改变渲染结果'); }

    if (errs.length) { pass = false; console.log('❌ 控制台错误: ' + errs.join(' | ')); }
    console.log(pass ? '✅ 子时流派前端冒烟通过' : '❌ 子时流派前端冒烟失败');
  } catch (e) {
    pass = false;
    console.log('❌ 异常: ' + e.message);
  } finally {
    if (browser) await browser.close();
  }
  process.exit(pass ? 0 : 1);
})();
