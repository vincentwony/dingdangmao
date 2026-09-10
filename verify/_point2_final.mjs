import http from 'http'; import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
const {Solar}=require('lunar-javascript');
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
const ZH='子丑寅卯辰巳午未申酉戌亥';
const idx=z=>ZH.indexOf(z);
// 标准子平命宫（以卯为中介：寅起正月逆数至生月，生时支顺数至落点）
function mingGong(mz,hz){ const m=((idx(mz)-2+12)%12)+1, h=((idx(hz)-2+12)%12)+1; const t=m+h; const r=t<=14?14-t:26-t; return '寅卯辰巳午未申酉戌亥子丑'.charAt((r-1+12)%12); }
// 胎元：月干进一、月支进三
function taiYuan(mgz,mzz){ const g='甲乙丙丁戊己庚辛壬癸'.indexOf(mgz); const z=idx(mzz); return '甲乙丙丁戊己庚辛壬癸'.charAt((g+1)%10)+ZH.charAt((z+3)%12); }
const cases=[
  {y:1990,m:5,d:15,h:14,min:30,sex:'男'},
  {y:1988,m:2,d:17,h:12,min:0,sex:'女'},
  {y:1984,m:8,d:20,h:0,min:15,sex:'男'},
  {y:2000,m:1,d:1,h:0,min:30,sex:'男'},
  {y:1995,m:12,d:31,h:23,min:30,sex:'男'},
  {y:2024,m:6,d:15,h:23,min:50,sex:'男'},
  {y:1976,m:3,d:10,h:10,min:0,sex:'男'},
  {y:1969,m:7,d:20,h:8,min:0,sex:'男'},
  {y:2010,m:10,d:10,h:12,min:0,sex:'男'},
  {y:1992,m:4,d:4,h:16,min:0,sex:'男'},
  {y:1955,m:11,d:11,h:11,min:0,sex:'女'},
  {y:1949,m:10,d:1,h:9,min:0,sex:'男'},
];
let mgOK=0,tyOK=0;
for(const c of cases){
  const o=await call(c); const d=o.data||o; const p=d.pillars||{};
  const mz=p.month?p.month[1]:'', hz=p.hour?p.hour[1]:'', mgz=p.month?p.month[0]:'', mzz=mz;
  const projMG=d.riBiao&&d.riBiao.mingGong, projTY=d.riBiao&&d.riBiao.taiYuan;
  // lj
  const lu=Solar.fromYmdHms(c.y,c.m,c.d,c.h,c.min,0).getLunar().getEightChar();
  const ljMG=lu.getMingGong(), ljTY=lu.getTaiYuan();
  const algMG=mingGong(mz,hz), algTY=taiYuan(mgz,mzz);
  const mgSame=(projMG===algMG && projMG===ljMG) || (projMG===algMG) || (projMG===ljMG);
  const tySame=(projTY===algTY && projTY===ljTY) || (projTY===algTY) || (projTY===ljTY);
  if(projMG===algMG)mgOK++; if(projTY===algTY)tyOK++;
  console.log(`${c.y}-${c.m}-${c.d} 月支=${mz} 时支=${hz} | 命宫 项目=${projMG} 算法=${algMG} lj=${ljMG} ${projMG===algMG?'✓算':(projMG===ljMG?'≈lj':'✗')} | 胎元 项目=${projTY} 算法=${algTY} lj=${ljTY} ${projTY===algTY?'✓算':'✗'}`);
}
console.log(`\n命宫 项目==标准算法: ${mgOK}/12 | 胎元 项目==标准算法: ${tyOK}/12`);
