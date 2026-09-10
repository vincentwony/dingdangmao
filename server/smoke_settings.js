// server/smoke_settings.js — 设置扩展冒烟测试（2026-08-10, rev2）
// 验证：周起始 / 主显农历 / 节气开关(顶栏) / 神煞开关 / 减少动效 / 配色预设 /
//       今日徽章 / 启动页 / 紫微默认视图 / 提醒点 / 导出 / 导入
// 约定：channel msedge + serviceWorkers block（防 SW 缓存）
const { chromium } = require('H:/Phone/node_modules/playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = 'http://localhost:3000';
const results = [];
function rec(name, pass, info) { results.push({ name, pass, info: info || '' }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  :: ' + info : '')); }

async function openSettings(page) {
  await page.click('#tabSettings');
  await page.waitForSelector('#settingsPanel.show', { timeout: 4000 });
  await page.waitForTimeout(160); // 等 initNewControls 绑定 + 初始化
}
async function closeSettings(page) { await page.keyboard.press('Escape'); await page.waitForTimeout(60); }

// 切换面板里的隐藏 checkbox（视觉隐藏，用 change 事件驱动，等价于用户拨动开关）
async function setToggle(page, dataSet, checked) {
  await page.locator(`#settingsPanel input[data-set="${dataSet}"]`).evaluate((el, c) => {
    el.checked = c;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, checked);
  await page.waitForTimeout(150);
}

// 轮询等待详情内出现神煞块（避免 API 返回时序导致偶发失败）
async function waitForGods(page, timeout = 9000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ok = await page.evaluate(() => {
      const h = document.getElementById('cal-detail-inline');
      return !!(h && h.querySelector('.good-title, .bad-title, .good-tag, .bad-tag'));
    });
    if (ok) return true;
    await page.waitForTimeout(200);
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', args: ['--no-sandbox'] });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/favicon/i.test(t)) return; errors.push('console.error: ' + t); } });

  // 清理 localStorage 起始状态
  await page.goto(BASE + '/app.html', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  try {
    // ── 1. 周起始（cal_weekStart）→ 周一
    await page.goto(BASE + '/app.html#calendar', { waitUntil: 'load' });
    await page.waitForSelector('#Cal3 .cal-cell', { timeout: 6000 });
    await openSettings(page);
    await page.locator('#settingsPanel select[data-set="cal_weekStart"]').selectOption('mon');
    await page.waitForTimeout(250);
    let firstWd = await page.locator('#Cal3 .cal-wd').first().textContent();
    let firstWdWeekend = await page.locator('#Cal3 .cal-wd').first().evaluate(el => el.classList.contains('weekend'));
    rec('周起始=周一(即时)', (firstWd.trim() === '一') && !firstWdWeekend, '首列=' + firstWd.trim() + ' weekend=' + firstWdWeekend);
    await closeSettings(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('#Cal3 .cal-cell', { timeout: 6000 });
    firstWd = await page.locator('#Cal3 .cal-wd').first().textContent();
    rec('周起始=周一(刷新持久)', firstWd.trim() === '一', '首列=' + firstWd.trim());

    // ── 2. 主显农历（cal_primaryDisplay）
    await openSettings(page);
    await page.locator('#settingsPanel select[data-set="cal_primaryDisplay"]').selectOption('lunar');
    await page.waitForTimeout(200);
    let hasLunar = await page.locator('#Cal3').evaluate(el => el.classList.contains('lunar-primary'));
    rec('主显农历=农历(即时)', hasLunar, 'Cal3.lunar-primary=' + hasLunar);
    await closeSettings(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('#Cal3 .cal-cell', { timeout: 6000 });
    hasLunar = await page.locator('#Cal3').evaluate(el => el.classList.contains('lunar-primary'));
    rec('主显农历(刷新持久)', hasLunar, 'Cal3.lunar-primary=' + hasLunar);

    // ── 3. 节气开关（cal_showJieqi）→ 顶栏本月节气 .jq-term
    await openSettings(page);
    let jqOn = await page.locator('#jqTopBar .jq-term').count();
    rec('节气默认开启顶栏有节气名', jqOn > 0, 'jq-term=' + jqOn);
    await setToggle(page, 'cal_showJieqi', false);
    await page.waitForTimeout(200);
    let jqOff = await page.locator('#jqTopBar .jq-term').count();
    rec('节气关闭顶栏无节气名', jqOff === 0, 'jq-term=' + jqOff);
    await setToggle(page, 'cal_showJieqi', true); // 还原
    await closeSettings(page);

    // ── 4. 神煞开关（cal_showGods）→ 详情面板
    await openSettings(page);
    await setToggle(page, 'cal_showGods', false);
    await closeSettings(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('#Cal3 .cal-cell', { timeout: 6000 });
    await page.locator('#Cal3 .cal-cell:not(.other-month)').first().click();
    await page.waitForTimeout(1200);
    let godsOff = await page.locator('#cal-detail-inline').evaluate(el => !!el.querySelector('.good-title, .bad-title, .good-tag, .bad-tag'));
    rec('神煞关闭→详情无神煞块', !godsOff, '含神煞块=' + godsOff);
    await openSettings(page);
    await setToggle(page, 'cal_showGods', true);
    await closeSettings(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('#Cal3 .cal-cell', { timeout: 6000 });
    await page.locator('#Cal3 .cal-cell[data-day="15"]:not(.other-month)').click();
    let godsOn = await waitForGods(page);
    rec('神煞开启→详情有神煞块', godsOn, '含神煞块=' + godsOn);

    // ── 5. 减少动效（cal_reduceMotion）→ html.reduce-motion
    await openSettings(page);
    await setToggle(page, 'cal_reduceMotion', true);
    await page.waitForTimeout(150);
    let rm = await page.evaluate(() => document.documentElement.classList.contains('reduce-motion'));
    rec('减少动效→html.reduce-motion', rm, 'reduce-motion=' + rm);
    await closeSettings(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(200);
    rm = await page.evaluate(() => document.documentElement.classList.contains('reduce-motion'));
    rec('减少动效(刷新持久)', rm, 'reduce-motion=' + rm);
    await openSettings(page);
    await setToggle(page, 'cal_reduceMotion', false);
    await closeSettings(page);

    // ── 6. 配色预设（cal_themePreset）
    await openSettings(page);
    await page.locator('#settingsPanel select[data-set="cal_themePreset"]').selectOption('cinnabar');
    await page.waitForTimeout(150);
    let tp = await page.evaluate(() => document.documentElement.getAttribute('data-theme-preset'));
    rec('配色预设=cinnabar', tp === 'cinnabar', 'data-theme-preset=' + tp);
    await closeSettings(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(200);
    tp = await page.evaluate(() => document.documentElement.getAttribute('data-theme-preset'));
    rec('配色预设(刷新持久)', tp === 'cinnabar', 'data-theme-preset=' + tp);
    await openSettings(page);
    await page.locator('#settingsPanel select[data-set="cal_themePreset"]').selectOption('gold');
    await closeSettings(page);

    // ── 7. 今日徽章（cal_todayStyle）
    await openSettings(page);
    await page.locator('#settingsPanel select[data-set="cal_todayStyle"]').selectOption('minimal');
    await page.waitForTimeout(150);
    let ts = await page.evaluate(() => document.documentElement.getAttribute('data-today-style'));
    rec('今日徽章=minimal', ts === 'minimal', 'data-today-style=' + ts);
    await closeSettings(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(200);
    ts = await page.evaluate(() => document.documentElement.getAttribute('data-today-style'));
    rec('今日徽章(刷新持久)', ts === 'minimal', 'data-today-style=' + ts);
    await openSettings(page);
    await page.locator('#settingsPanel select[data-set="cal_todayStyle"]').selectOption('default');
    await closeSettings(page);

    // ── 8. 启动页（cal_defaultTab）→ 无 hash 时跳 ziwei
    await openSettings(page);
    await page.locator('#settingsPanel select[data-set="cal_defaultTab"]').selectOption('ziwei');
    await closeSettings(page);
    await page.goto(BASE + '/app.html', { waitUntil: 'load' }); // 无 hash
    await page.waitForTimeout(600);
    let hash = await page.evaluate(() => location.hash);
    let ziweiActive = await page.locator('.zw-view-panel').count();
    rec('启动页=ziwei(无hash跳转)', /ziwei/.test(hash) && ziweiActive > 0, 'hash=' + hash + ' panels=' + ziweiActive);

    // ── 9. 紫微默认视图（zw_defaultView→zw_viewMode）
    await page.waitForSelector('.zw-view-panel.active', { timeout: 6000 });
    await page.evaluate(() => { localStorage.setItem('zw_viewMode', 'feixing'); }); // 模拟已存默认视图
    await page.reload({ waitUntil: 'load' }); // 当前已在 #ziwei，goto 同 hash 不重载，必须 reload 才重新读取默认视图
    await page.waitForSelector('.zw-view-panel[data-view="feixing"].active', { timeout: 6000 });
    let feiActive = await page.locator('.zw-view-panel[data-view="feixing"]').evaluate(el => el.classList.contains('active'));
    let sanActive = await page.locator('.zw-view-panel[data-view="sanhe"]').evaluate(el => el.classList.contains('active'));
    rec('紫微默认视图=飞星', feiActive && !sanActive, 'feixing.active=' + feiActive + ' sanhe.active=' + sanActive);
    // 通过面板设置即时生效
    await openSettings(page);
    await page.locator('#settingsPanel select[data-set="zw_defaultView"]').selectOption('sihua');
    await page.waitForTimeout(250);
    let sihuaActive = await page.locator('.zw-view-panel[data-view="sihua"]').evaluate(el => el.classList.contains('active'));
    let sihuaTabActive = await page.locator('.zw-bottom-tab[data-view="sihua"]').evaluate(el => el.classList.contains('active'));
    let vm2 = await page.evaluate(() => localStorage.getItem('zw_viewMode'));
    rec('紫微默认视图面板切换即时(sihua)', sihuaActive && sihuaTabActive && vm2 === 'sihua', 'sihua.active=' + sihuaActive + ' tab=' + sihuaTabActive + ' zw_viewMode=' + vm2);
    await closeSettings(page);

    // ── 10. 提醒点（cal_enableReminders + zw_reminders）
    await page.evaluate(() => {
      localStorage.setItem('zw_reminders', JSON.stringify([{ type: 'daily', title: '测试提醒' }]));
      localStorage.setItem('cal_enableReminders', 'true');
    });
    await page.goto(BASE + '/app.html?rb=1#calendar', { waitUntil: 'load' }); // 强制整页重载，避免同文档导航导致渲染时序抖动
    await page.waitForSelector('#Cal3 .cal-cell', { timeout: 6000 });
    await page.waitForTimeout(600);
    let dotDiag = await page.evaluate(() => {
      const h = document.getElementById('cal-detail-inline');
      return {
        remType: typeof window.Reminders,
        forDate: window.Reminders ? window.Reminders.forDate(2026,8,15).length : 'NA',
        enable: localStorage.getItem('cal_enableReminders'),
        zwrem: localStorage.getItem('zw_reminders'),
        cells: document.querySelectorAll('#Cal3 .cal-cell').length,
        dots: document.querySelectorAll('#Cal3 .cal-reminder-dot').length
      };
    });
    let dotOn = dotDiag.dots;
    rec('提醒开启→日历出现提醒点', dotOn > 0, 'diag=' + JSON.stringify(dotDiag));
    await page.evaluate(() => localStorage.setItem('cal_enableReminders', 'false'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('#Cal3 .cal-cell', { timeout: 6000 });
    await page.waitForTimeout(300);
    let dotOff = await page.locator('#Cal3 .cal-reminder-dot').count();
    rec('提醒关闭→无提醒点', dotOff === 0, 'dot数量=' + dotOff);

    // ── 11. 导出（#exportDataBtn）
    await page.evaluate(() => localStorage.setItem('cal_export_probe', '42'));
    await page.goto(BASE + '/app.html#calendar', { waitUntil: 'load' });
    await page.waitForSelector('#Cal3 .cal-cell', { timeout: 6000 });
    await openSettings(page);
    const [ download ] = await Promise.all([
      page.waitForEvent('download', { timeout: 6000 }),
      page.locator('#exportDataBtn').click()
    ]);
    let fname = download.suggestedFilename();
    let dpath = await download.path();
    let content = dpath ? fs.readFileSync(dpath, 'utf8') : '';
    let hasProbe = content.includes('cal_export_probe');
    rec('导出→下载且含设置键', /mingli-backup/.test(fname) && hasProbe, 'file=' + fname + ' 含probe=' + hasProbe);
    await closeSettings(page);

    // ── 12. 导入（#importDataBtn）
    const importFile = path.join(os.tmpdir(), 'mingli-import-probe.json');
    fs.writeFileSync(importFile, JSON.stringify({ cal_imported_probe: 'YES' }));
    await page.goto(BASE + '/app.html#calendar', { waitUntil: 'load' });
    await page.waitForSelector('#Cal3 .cal-cell', { timeout: 6000 });
    await openSettings(page);
    await page.locator('#importDataFile').setInputFiles(importFile);
    await page.waitForTimeout(1500); // 导入后 800ms 触发 reload
    let imported = await page.evaluate(() => localStorage.getItem('cal_imported_probe'));
    rec('导入→设置键写入', imported === 'YES', 'cal_imported_probe=' + imported);
    await closeSettings(page);

    // ── 控制台错误
    rec('无运行时报错', errors.length === 0, errors.slice(0, 5).join(' | '));

  } catch (e) {
    rec('测试异常', false, e.message);
  }

  await browser.close();
  const passed = results.filter(r => r.pass).length;
  const failed = results.length - passed;
  console.log('\n==== 冒烟结果 ====');
  console.log('通过 ' + passed + ' / 共 ' + results.length + '（失败 ' + failed + '）');
  process.exit(failed === 0 ? 0 : 1);
})();
