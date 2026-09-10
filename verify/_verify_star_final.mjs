import http from 'http'; import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
function stripTags(s){return (s||'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function extractMainStars(cardBody){
  const m = cardBody.match(/<tr class="bt-row-0">([\s\S]*?)<\/tr>/);
  if(!m) return null;
  const tds = m[1].match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
  return tds.map(t=>stripTags(t.replace(/<td[^>]*>/,'').replace(/<\/td>$/,'')));
}
// 正确十神（core/bazi.js _dmGetRelFull 逻辑）
const GANC=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
function dmRel(dayIdx, otherIdx){
  const riWx=dayIdx>>1, oWx=otherIdx>>1, rel=(oWx-riWx+5)%5, same=(dayIdx%2)===(otherIdx%2);
  if(rel===0) return same?'比肩':'劫财';
  if(rel===1) return same?'食神':'伤官';
  if(rel===2) return same?'偏财':'正财';
  if(rel===3) return same?'七杀':'正官';
  return same?'偏印':'正印';
}
const {Solar}=require('lunar-javascript');
function projStars(y,m,d,h,min,sex){
  const lu=Solar.fromYmdHms(y,m,d,h,min,0).getLunar().getEightChar();
  const yG=GANC.indexOf(lu.getYear()[0]), mG=GANC.indexOf(lu.getMonth()[0]), dG=GANC.indexOf(lu.getDay()[0]), tG=GANC.indexOf(lu.getTime()[0]);
  return {yG,mG,dG,tG, yGz:lu.getYear(),mGz:lu.getMonth(),dGz:lu.getDay(),tGz:lu.getTime()};
}
const cases=[
  {y:2010,m:10,d:10,h:12,min:0,sex:'男'},
  {y:1990,m:5,d:15,h:14,min:30,sex:'男'},
  {y:2005,m:3,d:3,h:12,min:0,sex:'男'},
  {y:1960,m:12,d:12,h:12,min:0,sex:'男'},
  {y:1997,m:2,d:2,h:12,min:0,sex:'男'},
  {y:1984,m:8,d:20,h:0,min:15,sex:'男'},
  {y:2000,m:1,d:1,h:0,min:30,sex:'男'},
];
let pass=0, fail=0;
for (const c of cases){
  const o=await call(c); const d=o.data||o; const cards=d.cards||[];
  let found=null; for(const card of cards){ if(/专业细盘|细盘/.test(card.title||'')){ found=card; break; } }
  const proj=found?extractMainStars(found.body):null; // [主星,年,月,日,时]
  const lj=projStars(c.y,c.m,c.d,c.h,c.min,c.sex);
  const expY=dmRel(lj.dG, lj.yG), expM=dmRel(lj.dG, lj.mG), expT=dmRel(lj.dG, lj.tG);
  const gotY=proj?proj[1]:'?', gotM=proj?proj[2]:'?', gotT=proj?proj[4]:'?';
  const okY=gotY===expY, okM=gotM===expM, okT=gotT===expT;
  if(okY&&okM&&okT)pass++; else fail++;
  console.log(`${(okY&&okM&&okT)?'OK ':'FAIL'} ${c.y}-${c.m}-${c.d} ${String(c.h).padStart(2,'0')}:${c.min} | 四柱 ${lj.yGz} ${lj.mGz} ${lj.dGz} ${lj.tGz} | 年主星 项目=${gotY}/基准=${expY}${okY?'':' ✗'} | 月 项目=${gotM}/基准=${expM}${okM?'':' ✗'} | 时 项目=${gotT}/基准=${expT}${okT?'':' ✗'}`);
}
console.log(`\n结果: ${pass} 通过 / ${fail} 失败`);
