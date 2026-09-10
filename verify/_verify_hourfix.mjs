import http from 'http';
import crypto from 'crypto';

const SECRET = '381cb51f0923fc771bf7e81547c485f7';
const URL = '/api/v1/bazi';

function call({y,m,d,h,min,sex}) {
  const body = JSON.stringify({y,m,d,h,min,sex});
  const mid = 'audit', ts = Date.now().toString(), nonce = crypto.randomBytes(6).toString('hex');
  const sig = crypto.createHmac('sha256', SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);
  return new Promise((resolve, reject) => {
    const req = http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{
      'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),
      'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}}, res=>{
      let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{resolve(JSON.parse(d));}catch(e){reject(new Error('parse '+res.statusCode+' '+d.slice(0,200)));}});
    });
    req.on('error',reject);req.write(body);req.end();
  });
}

function pillarStr(o){ const p=o.data||o; const pl=p.pillars||{};
  return [pl.year,pl.month,pl.day,pl.hour].filter(Boolean).join(' '); }
function dayunStr(o){ const p=o.data||o; const du=p.dayun||[]; return du.slice(0,3).map(x=>x&&(x.gz||x.pillar||x)).join('→'); }

const cases = [
  {y:2000,m:1,d:1,h:0,min:30,sex:'男', expectHour:'壬子', note:'午夜早子时(修复点)'},
  {y:2000,m:1,d:1,h:12,min:30,sex:'男', expectHour:'戊午', note:'正午午时(应不变)'},
  {y:1990,m:5,d:15,h:14,min:30,sex:'男', expectHour:'癸未', note:'非午夜(应不变)'},
  {y:1984,m:8,d:20,h:0,min:15,sex:'男', expectHour:'戊子', note:'午夜早子时(修复点)'},
  {y:1988,m:2,d:17,h:12,min:0,sex:'女', expectHour:'丙午', note:'非午夜(应不变)'},
];

let allOk = true;
for (const c of cases) {
  const o = await call(c);
  const s = pillarStr(o);
  const gotHour = s.split(' ')[3] || '(无)';
  const pass = gotHour === c.expectHour;
  if(!pass) allOk = false;
  console.log(`${pass?'  OK ':'FAIL'}  ${c.note}  ${c.y}-${c.m}-${c.d} ${String(c.h).padStart(2,'0')}:${String(c.min).padStart(2,'0')} ${c.sex} → ${s}  | 时柱期望=${c.expectHour} 实得=${gotHour}`);
}
// 大运回归：1990-05-15 14:30 男 起运7岁，序列首三柱
const du = await call({y:1990,m:5,d:15,h:14,min:30,sex:'男'});
console.log('\n大运回归(1990-05-15 14:30 男):', dayunStr(du), '| 起运:', (du.data||du).startYun||(du.data||du).qiYun||'(见字段)');
// 午夜出生大运亦应随修正后的时刻正确计算：2000-01-01 00:30 男 与 lunar-javascript 对照
const du2 = await call({y:2000,m:1,d:1,h:0,min:30,sex:'男'});
console.log('午夜大运(2000-01-01 00:30 男) 首三柱:', dayunStr(du2));
console.log(allOk ? '\n=== 时柱修复验证: 全部通过 ===' : '\n=== 存在失败项 ===');
