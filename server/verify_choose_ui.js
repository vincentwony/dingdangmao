'use strict';
// 离线验证 web/js/choose-ui.js 真实渲染函数：_renderResultsHtml / _dayCardHtml
// 在给定真实择日结果时是否产出候选日卡、吉/平/忌 分级、真实理由、查看按钮、出处参考。
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'web', 'js', 'choose-ui.js'), 'utf8')
  .replace(/^\s*import .*$/gm, '')                       // 去 ES import
  .replace(/export\s*\{[^}]*\};?\s*$/, '');              // 去 ES export

const factory = new Function(
  'document', 'window', 'API', '$',
  SRC + '\n;return { _renderResultsHtml: _renderResultsHtml, _dayCardHtml: _dayCardHtml, _dayUserRelation: _dayUserRelation, _applyBenming: _applyBenming, _nayinRelation: _nayinRelation, _bazi3col: _bazi3col, ZHI_ARR: ZHI_ARR, NAYIN: NAYIN };'
);
const stubDoc = { getElementById: () => null, createElement: () => ({ style: {}, addEventListener() {}, appendChild() {}, setAttribute() {} }) };
const stubWin = {};
const { _renderResultsHtml, _dayCardHtml, _dayUserRelation, _applyBenming, _nayinRelation, _bazi3col, ZHI_ARR, NAYIN } = factory(stubDoc, stubWin, {}, () => {});

let fail = 0;
const log = (ok, m) => { console.log((ok ? '✅ ' : '❌ ') + m); if (!ok) fail++; };

const mock = {
  event: 'jiahun', label: '嫁娶（结婚）', y: 2026, m: 10, total: 31,
  ref: '《协纪辨方书·义例》嫁娶宜天德、月德、天喜、三合、六合、不将…',
  days: [
    { y: 2026, m: 10, d: 3, lunarD: '廿四', gz: { year: '丙午', month: '戊戌', day: '甲子' }, jianChu: '成', grade: '吉', score: 36,
      reasons: ['宜：嫁娶、納采', '吉神：天德、三合'], isHongSha: false, isYanggongJi: false, universal: false, conflict: false, matchedYi: ['嫁娶'], preferHit: ['天德'], avoidHit: [] },
    { y: 2026, m: 10, d: 8, lunarD: '廿九', gz: { year: '丙午', month: '己亥', day: '己巳' }, jianChu: '收', grade: '忌', score: -40,
      reasons: ['黄历明示忌嫁娶'], isHongSha: false, isYanggongJi: false, universal: false, conflict: true, matchedYi: [], preferHit: [], avoidHit: [] }
  ],
  avoidDays: [{ y: 2026, m: 10, d: 8, lunarD: '廿九', gz: { day: '己巳' }, jianChu: '收', reason: '黄历忌嫁娶' }],
  sources: ['《协纪辨方书·义例》', '《选择宗镜》', '《玉匣记》', '当日宜忌与神煞来自 lunisolar theGods 真实计算']
};

const html = _renderResultsHtml(mock);
log(html.indexOf('推荐候选日（1）') >= 0, '候选区仅含非「忌」日（吉/平），计数正确');
log(html.indexOf('本月诸事不宜日（1）') >= 0, '诸事不宜区渲染');
log(html.indexOf('丙午年') >= 0 && html.indexOf('戊戌月') >= 0 && html.indexOf('甲子日') >= 0, '候选日展示八字三柱（年/月/日 真实干支）');
log(html.indexOf('grade-吉') >= 0 && html.indexOf('grade-忌') < 0, '候选区含 grade-吉、不含 grade-忌（忌日已归入诸事不宜）');
log(html.indexOf('data-d="3"') >= 0, '候选日(10-3)渲染 data-y/m/d 跳转属性');
log(html.indexOf('查看日课') >= 0, '含「查看日课」按钮（点击跳转日课）');
log(html.indexOf('宜：嫁娶、納采') >= 0, '真实理由（宜）渲染');
log(html.indexOf('吉神：天德、三合') >= 0, '真实理由（吉神）渲染');
log(html.indexOf('参考：') >= 0, '含出处参考行');

// 边界：空数据
log(_renderResultsHtml(null).indexOf('暂无数据') >= 0, '空数据 → 暂无数据');

// _dayCardHtml 纯净
const card = _dayCardHtml(mock.days[0]);
log(card.indexOf('class="choose-day-card grade-吉"') >= 0, '_dayCardHtml 渲染 grade-吉 卡');
log(card.indexOf('data-y="2026"') >= 0 && card.indexOf('data-m="10"') >= 0 && card.indexOf('data-d="3"') >= 0, '_dayCardHtml 含 data-y/m/d 跳转属性');

// ── Phase 3.2 + 3.2.1：八字三柱 + 本命合参（日柱 + 年命 双维度） ──
log(_bazi3col({ year: '丙午', month: '戊戌', day: '甲子' }) === '丙午年 戊戌月 甲子日', '_bazi3col 拼装三柱');
log(_bazi3col(null) === '', '_bazi3col 空值兜底');

// 六冲：子(0) 午(6) — ctx=日（默认）
log(JSON.stringify(_dayUserRelation('子', '午', '日')) === JSON.stringify([{ type: '冲', label: '冲本命', kind: 'bad', ctx: '日' }]), '六冲：子 冲 午（ctx=日）');
// 年命维度：子 冲 午（ctx=年）
log(_dayUserRelation('子', '午', '年').some(function(r){ return r.type === '冲' && r.ctx === '年'; }), '六冲：子 冲 午（ctx=年，年命维度）');
// 六合：子(0) 丑(1)
log(_dayUserRelation('子', '丑').some(function(r){ return r.type === '合'; }), '六合：子 合 丑');
// 三合：申(2) 子(0) 辰(4) 同局
log(_dayUserRelation('申', '子').some(function(r){ return r.type === '三合'; }), '三合：申 与 子 同局（申子辰）');
// 六害：子(0) 未(7)
log(_dayUserRelation('子', '未').some(function(r){ return r.type === '害'; }), '六害：子 害 未');
// 同支无标注
log(_dayUserRelation('子', '子').length === 0, '同日支不标注');

// _applyBenming：单维度（日柱）同等级内冲本命下沉、合本命上浮；grade 不变
var bmDays = [
  { y: 2026, m: 10, d: 1, gz: { day: '庚午' }, grade: '吉', score: 20 },   // 午 冲 子(本命) → 下沉
  { y: 2026, m: 10, d: 2, gz: { day: '甲子' }, grade: '吉', score: 20 },   // 子 同支(不标) 中位
  { y: 2026, m: 10, d: 3, gz: { day: '戊辰' }, grade: '吉', score: 20 }    // 辰 三合 子(本命) → 上浮
];
var applied = _applyBenming(bmDays, '子');
log(applied[0].gz.day === '戊辰' && applied[2].gz.day === '庚午', '_applyBenming 单维度(日柱)同等级内按冲合重排（三合上浮、六冲下沉）');
log(applied[0].grade === '吉' && applied[1].grade === '吉' && applied[2].grade === '吉', '_applyBenming 不改 grade 吉凶定级');

// ── Phase 3.2.3：年命纳音维度（纳音生克 vs 年命纳音）──
// 纳音表完整性 + 抽样
log(Object.keys(NAYIN).length === 60, '六十甲子纳音表 60 项齐全');
log(NAYIN['丙午'] === '水' && NAYIN['庚午'] === '土' && NAYIN['甲子'] === '金', '纳音表抽样正确（丙午水/庚午土/甲子金）');
// 课年维度（地支）仍可用
log(_dayUserRelation('子', '午', '课年').some(function(r){ return r.type === '冲' && r.ctx === '课年'; }), '六冲：日课年支 子 冲 年命 午（ctx=课年）');
// 纳音生克：日课日柱纳音 土 克 年命纳音 水 → 纳音克(凶)
log(_nayinRelation('土', '水', '日纳').some(function(r){ return r.type === '克' && r.ctx === '日纳'; }), '纳音克：日课日柱纳音(土) 克 年命纳音(水) → 凶（ctx=日纳）');
// 日课纳音 生 年命纳音 → 吉（金生水）
log(_nayinRelation('金', '水', '年纳').some(function(r){ return r.type === '生' && r.ctx === '年纳'; }), '纳音生：日课纳音(金) 生 年命纳音(水) → 吉（ctx=年纳）');
// 同五行 → 比和
log(_nayinRelation('水', '水', '年纳').some(function(r){ return r.type === '比和'; }), '纳音比和：日课纳音 与 年命纳音 同五行');
// 本命生日课(我生泄)/本命克日课(我克财) 属中性，不标注
log(_nayinRelation('火', '木', '日纳').length === 0 && _nayinRelation('木', '金', '日纳').length === 0, '纳音：本命生日课(木→火)/本命克日课(金→木) 中性不标注');
// 日元纳音双参照（ctx=日纳元）：候选日 日柱纳音 比 本命日元纳音
log(_nayinRelation('火', '金', '日纳元').some(function(r){ return r.type === '克' && r.ctx === '日纳元'; }), '纳音克：日课日柱纳音(火) 克 日元纳音(金) → 凶（ctx=日纳元）');
log(_nayinRelation('金', '金', '日纳元').some(function(r){ return r.type === '比和'; }), '纳音比和：日课日柱纳音 与 日元纳音(金) 同五行（ctx=日纳元）');
log(_nayinRelation('水', '金', '日纳元').length === 0 && _nayinRelation('木', '金', '日纳元').length === 0, '纳音：日元生日课(金→水)/日元克日课(金→木) 中性不标注');

// _applyBenming：五维度合并（日/年/课年/日纳/年纳），userDay=子, userYearPillar=丙午(午,水)
var bmDays5 = [
  { y: 2026, m: 10, d: 1, gz: { year: '丙午', day: '庚午' }, grade: '吉', score: 20 }, // 午冲子(日凶); 土克水(日纳凶); 水比和水(年纳吉)
  { y: 2026, m: 10, d: 2, gz: { year: '甲子', day: '甲子' }, grade: '吉', score: 20 }, // 子同子(日无); 子冲午(年/课年凶); 金生水(日纳/年纳吉)
  { y: 2026, m: 10, d: 3, gz: { year: '戊辰', day: '戊辰' }, grade: '吉', score: 20 }  // 辰三合子(日吉); 木生水(日纳/年纳吉)
];
var applied5 = _applyBenming(bmDays5, '子', '丙午');
log(applied5[0].gz.day === '戊辰' && applied5[2].gz.day === '庚午', '_applyBenming 五维度：三合+纳音生上浮(戊辰) 居首、纳音克+冲下沉(庚午) 居末');
log(applied5[0].grade === '吉' && applied5[1].grade === '吉' && applied5[2].grade === '吉', '_applyBenming 五维度不改 grade');
var c1tags = applied5[2].benming;
log(c1tags.some(function(r){ return r.type === '克' && r.ctx === '日纳'; }) && c1tags.some(function(r){ return r.type === '比和' && r.ctx === '年纳'; }), '_applyBenming 五维度：日纳克本命 + 年纳比和 同日均标注（非覆盖）');
log(applied5[2].benming.length === 3, '_applyBenming 五维度：庚午 含 冲(日)+纳音克(日纳)+纳音比和(年纳) 三标注');

// ── Phase 3.2.4：纳音双参照（年命 + 日元）→ 七维度 ──
// 候选日1 庚午(土)：日支午冲子(日凶); 土克水(日纳凶·年命); 土生金(日纳元吉·日元); 年柱丙午水比和水(年纳吉·年命)
var bmDays7 = [
  { y: 2026, m: 10, d: 1, gz: { year: '丙午', day: '庚午' }, grade: '吉', score: 20 }
];
var applied7 = _applyBenming(bmDays7, '子', '丙午', '甲子');
var gw = applied7[0].benming;
log(gw.some(function(r){ return r.type === '克' && r.ctx === '日纳'; }), '_applyBenming 七维度：日纳(日柱纳音 vs 年命纳音) 标注存在');
log(gw.some(function(r){ return r.type === '生' && r.ctx === '日纳元'; }), '_applyBenming 七维度：日纳元(日柱纳音 vs 日元纳音) 生 标注存在');
log(gw.some(function(r){ return r.type === '比和' && r.ctx === '年纳'; }), '_applyBenming 七维度：年纳(年柱纳音 vs 年命纳音) 标注存在');
log(applied7[0].grade === '吉', '_applyBenming 七维度不改 grade');

// 边界：无本命（双空）原样返回
log(_applyBenming(bmDays, null, null) === bmDays, '_applyBenming 无本命（双空）原样返回');

console.log('\n' + (fail === 0 ? '[CI OK] choose-ui 渲染校验通过（含 Phase 3.2 三柱 + 本命合参[日/年/课年/日纳/年纳/日纳元/年纳元 七维度]）' : '[CI FAIL] ' + fail + ' 项未通过'));
process.exit(fail === 0 ? 0 : 1);
