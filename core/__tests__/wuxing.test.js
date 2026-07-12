// core/__tests__/wuxing.test.js
const test = require('node:test');
const assert = require('node:assert');
const wu = require('../wuxing.js');

test('_DG_BENQI 本气验证（12地支）', () => {
  assert.equal(wu._DG_BENQI[0], '癸');  // 子
  assert.equal(wu._DG_BENQI[1], '己');  // 丑
  assert.equal(wu._DG_BENQI[2], '甲');  // 寅
  assert.equal(wu._DG_BENQI[3], '乙');  // 卯
  assert.equal(wu._DG_BENQI[4], '戊');  // 辰
  assert.equal(wu._DG_BENQI[5], '丙');  // 巳
  assert.equal(wu._DG_BENQI[6], '丁');  // 午
  assert.equal(wu._DG_BENQI[7], '己');  // 未
  assert.equal(wu._DG_BENQI[8], '庚');  // 申
  assert.equal(wu._DG_BENQI[9], '辛');  // 酉
  assert.equal(wu._DG_BENQI[10], '戊'); // 戌
  assert.equal(wu._DG_BENQI[11], '壬'); // 亥
});

test('_DG_GAN 天干→索引', () => {
  assert.equal(wu._DG_GAN['甲'], 0);
  assert.equal(wu._DG_GAN['乙'], 1);
  assert.equal(wu._DG_GAN['癸'], 9);
  assert.equal(wu._DG_GAN['壬'], 8);
});

test('_cgGanWx 天干→五行索引', () => {
  assert.equal(wu._cgGanWx('甲'), 0); // 木
  assert.equal(wu._cgGanWx('乙'), 0); // 木
  assert.equal(wu._cgGanWx('丙'), 1); // 火
  assert.equal(wu._cgGanWx('丁'), 1); // 火
  assert.equal(wu._cgGanWx('戊'), 2); // 土
  assert.equal(wu._cgGanWx('己'), 2); // 土
  assert.equal(wu._cgGanWx('庚'), 3); // 金
  assert.equal(wu._cgGanWx('辛'), 3); // 金
  assert.equal(wu._cgGanWx('壬'), 4); // 水
  assert.equal(wu._cgGanWx('癸'), 4); // 水
});

test('_cgGanWx 无效输入', () => {
  assert.equal(wu._cgGanWx('?'), -1);
});

test('_localSShen 十神计算', () => {
  // 日主甲(0) 见 甲(0) → 比肩
  assert.equal(wu._localSShen(0, 0), '比肩');
  // 日主甲(0) 见 乙(1) → 劫财
  assert.equal(wu._localSShen(0, 1), '劫财');
  // 日主甲(0) 见 丙(2) → 食神
  assert.equal(wu._localSShen(0, 2), '食神');
  // 日主甲(0) 见 辛(7) → 正官
  assert.equal(wu._localSShen(0, 7), '正官');
  // 日主甲(0) 见 癸(9) → 正印
  assert.equal(wu._localSShen(0, 9), '正印');
});

test('_cgSSKind 十神→类别', () => {
  var ri = 0; // 甲日主
  assert.equal(wu._cgSSKind(ri, 9), '印');    // 甲见癸→正印
  assert.equal(wu._cgSSKind(ri, 0), '比');    // 甲见甲→比肩
  assert.equal(wu._cgSSKind(ri, 5), '财');    // 甲见己→正财
  assert.equal(wu._cgSSKind(ri, 7), '官');    // 甲见辛→正官
  assert.equal(wu._cgSSKind(ri, 2), '食伤');  // 甲见丙→食神
});

test('_cgIsShengZhu 生助判断', () => {
  assert.equal(wu._cgIsShengZhu('印'), true);
  assert.equal(wu._cgIsShengZhu('比'), true);
  assert.equal(wu._cgIsShengZhu('财'), false);
  assert.equal(wu._cgIsShengZhu('官'), false);
  assert.equal(wu._cgIsShengZhu('食伤'), false);
});

test('_csState 长生状态（0=长生）', () => {
  // 甲长生在亥(索引10)
  assert.equal(wu._csState(0, 10), 0);  // 甲在亥=长生
  // 丙长生在寅(索引2)
  assert.equal(wu._csState(2, 2), 0);   // 丙在寅=长生
  // 庚长生在巳(索引4)
  assert.equal(wu._csState(6, 4), 0);   // 庚在巳=长生
  // 壬长生在申(索引7)
  assert.equal(wu._csState(8, 7), 0);   // 壬在申=长生
});

test('_csWeight 长生权重', () => {
  // 甲(_CS_START[0]=10=亥): 亥(10)=长生=0.7, 子(11)=沐浴=0.2, 丑(0)=冠带=0.55, 寅(2)=临官=1.0
  assert.equal(wu._csWeight(0, 10), 0.7);  // 甲在亥 长生
  assert.equal(wu._csWeight(2, 2), 0.7);   // 丙在寅 长生
  assert.equal(wu._csWeight(0, 0), 0.55);  // 甲在子=丑? 纠正：子(0)→甲在子=(0-10+12)%12=2→冠带=0.55
  assert.equal(wu._csWeight(6, 8), 1.0);   // 庚在申 临官
  // 验证临官：甲在寅(zhi=2): (2-10+12)%12=4→4=临官=1.0
  assert.equal(wu._csWeight(0, 2), 1.0);   // 甲在寅 临官
});

test('Qiulq 季节旺衰索引', () => {
  // 基本调用验证（不崩溃+返回有效索引）
  var result = wu.Qiulq(0, 2);
  assert.ok(result >= 1 && result <= 10, 'Qiulq should return 1-10');
});
