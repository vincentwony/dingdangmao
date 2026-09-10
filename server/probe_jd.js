'use strict';
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const JD = ['建','除','满','平','定','执','破','危','成','收','开','闭'];
const gz = v => GAN[v % 10] + ZHI[v % 12];
const TARGETS = ['天罡','河魁','反支'];
let lastLM = null, shuoGZ = null;
const out = {天罡:[],河魁:[],反支:[]};
const start = new Date(2024,0,1), end = new Date(2027,11,31);
for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const l = lunisolar(dt);
  const lm = l.lunar.month, ld = l.lunar.day;
  if (lm !== lastLM) { lastLM = lm; shuoGZ = gz(l.char8.day.value); }
  const all = l.theGods.getGoodGods().map(x=>String(x)).concat(l.theGods.getBadGods().map(x=>String(x)));
  const mb = l.char8.month.branch.value, db = l.char8.day.branch.value;
  const jdIdx = ((db - mb) % 12 + 12) % 12;
  for (const t of TARGETS) {
    if (all.includes(t)) {
      if (t === '反支') out[t].push('lm'+lm+' ld'+ld+' shuo['+shuoGZ+'] day='+gz(l.char8.day.value));
      else out[t].push('lm'+lm+' mb'+mb+' db'+ZHI[db]+' 建除='+JD[jdIdx]+' day='+gz(l.char8.day.value));
    }
  }
}
for (const t of TARGETS) {
  console.log('\n##### '+t+' (共 '+out[t].length+')');
  if (t !== '反支') {
    const m = {};
    for (const s of out[t]) {
      const lm = +s.match(/lm(\d+)/)[1];
      (m[lm] = m[lm] || new Set()).add(s.match(/建除=(.)/)[1] + ':' + s.match(/db(.)/)[1]);
    }
    for (const lm of Object.keys(m).sort((a,b)=>a-b)) console.log('  lm'+lm+': ' + [...m[lm]].join(' '));
  } else {
    const m = {};
    for (const s of out[t]) {
      const lm = +s.match(/lm(\d+)/)[1];
      const shuo = s.match(/shuo\[(.+?)\]/)[1];
      const day = s.match(/day=(.+)$/)[1];
      (m[lm] = m[lm] || {shuo:new Set(), days:new Set()});
      m[lm].shuo.add(shuo); m[lm].days.add(day);
    }
    for (const lm of Object.keys(m).sort((a,b)=>a-b)) console.log('  lm'+lm+' shuo='+[...m[lm].shuo].join('/')+' 反支日='+[...m[lm].days].join(' '));
  }
}
