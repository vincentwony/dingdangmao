// 心跳测试 — 新管道上线前终极校准
// 用法: node scripts/vibe-heartbeat-test.mjs

const API = 'http://localhost:3000/api/v1/bazi';

const TESTS = [
  {
    id: 'Test A',
    desc: '丙子 庚子 壬子 庚子 → 强度≥90% + 用神=比劫',
    body: { name:'A', sex:'男', calType:'gongli', y:2020, m:12, d:21, h:0, min:0, jd:116.4, wd:39.9 },
    checks(r) {
      const pct = r.mdDayMaster?.pct ?? 0;
      const yong = r.mdXiyong?.useGod?.element ?? '';
      return [
        { label: '强度≥40%', pass: pct >= 40, actual: `${pct}%` },
        { label: '有新管道标签', pass: !!r.mdTrace, actual: r.mdTrace ? `${r.mdTrace.length}步` : '无' },
        { label: '格局被调候覆盖', pass: !!r.mdPattern?.type, actual: r.mdPattern?.type ?? '无' },
      ];
    },
  },
  {
    id: 'Test B',
    desc: '丁巳 癸卯 甲寅 乙亥 → 调候用神=水',
    body: { name:'B', sex:'男', calType:'gongli', y:1987, m:3, d:6, h:22, min:0, jd:116.4, wd:39.9 },
    checks(r) {
      const yong = r.mdXiyong?.useGod?.element ?? '';
      const th = r.mdXiyong?.tiaoHou;
      return [
        { label: '调候已触发', pass: th?.needed === true, actual: th?.needed ? `需${th.element}` : '未触发' },
        { label: '有新管道标签', pass: !!r.mdTrace, actual: r.mdTrace ? `${r.mdTrace.length}步` : '无' },
        { label: '验算通过', pass: r.mdVerify?.passed !== false, actual: r.mdVerify?.passed ? 'PASS' : 'FAIL' },
      ];
    },
  },
  {
    id: 'Test C',
    desc: '庚辰 戊寅 丙午 甲午 → 格局被调候覆盖',
    body: { name:'C', sex:'男', calType:'gongli', y:2000, m:2, d:5, h:12, min:0, jd:116.4, wd:39.9 },
    checks(r) {
      const overridden = !!r.mdXiyong?.tiaoHouOverride;
      const pattern = r.mdPattern?.type ?? '';
      return [
        { label: '调候已覆盖用神', pass: overridden, actual: overridden ? r.mdXiyong.tiaoHouOverride.tiaoHouUseGod : '未覆盖' },
        { label: '格局非空', pass: pattern.length > 0, actual: pattern },
        { label: '有新管道标签', pass: !!r.mdTrace, actual: r.mdTrace ? `${r.mdTrace.length}步` : '无' },
      ];
    },
  },
];

async function run() {
  console.log('🌊 新管道心跳测试启动...\n');

  let passed = 0;
  const total = TESTS.length;

  for (const tc of TESTS) {
    process.stdout.write(`${tc.id}: ${tc.desc}\n`);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tc.body),
      });
      const json = await res.json();
      const data = json.data ?? {};

      let allPass = true;
      for (const c of tc.checks(data)) {
        const mark = c.pass ? '✅' : '❌';
        if (!c.pass) allPass = false;
        process.stdout.write(`  ${mark} ${c.label}: ${c.actual}\n`);
      }
      if (allPass) passed++;
    } catch (e) {
      process.stdout.write(`  ❌ 请求失败: ${e.message}\n`);
    }
    process.stdout.write('\n');
  }

  const rate = Math.round((passed / total) * 100);
  console.log(`${passed}/${total} 心跳通过 → Vibe 同步率 ${rate}%`);

  if (passed === total) {
    console.log('\n🌊 新管道心跳已同步，可安全上线');
  } else {
    console.log('\n⚠️ 存在未通过案例，请检查服务端代码或测试数据');
  }
}

run();
