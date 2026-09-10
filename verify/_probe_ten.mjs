import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
const GZ=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const SHISHEN=['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印'];
function ss(i,j){return SHISHEN[((j-i)%10+10)%10];}
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
const {Solar}=await import('lunar-javascript');
function parseMain(html){const rows=html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g)||[];for(const tr of rows){if(/主星/.test(tr)){return [...tr.matchAll(/bt-main-star">([^<]+)</g)].map(m=>m[1].trim());}}return [];}
function ljSS(ec){return [ec.getYearShiShenGan(),ec.getMonthShiShenGan(),'日',ec.getTimeShiShenGan()];}

for(const c of [{y:1976,m:3,d:8,h:6,min:20,sex:'男'},{y:1969,m:7,d:1,h:3,min:10,sex:'男'},{y:2010,m:10,d:10,h:11,min:11,sex:'女'}]){
  const o=await call(c); const d=o.data||o; const P=d.pillars;
  const yG=GZ.indexOf(P.year[0]),mG=GZ.indexOf(P.month[0]),dG=GZ.indexOf(P.day[0]),hG=GZ.indexOf(P.hour[0]);
  const mine=[ss(dG,yG),ss(dG,mG),'日',ss(dG,hG)];
  const proj=parseMain(d.cards[0].body);
  const ec=Solar.fromYmdHms(c.y,c.m,c.d,c.h,c.min,0).getLunar().getEightChar();
  const ljS=ljSS(ec);
  console.log(`\n${c.y}-${c.m}-${c.d} ${c.sex}  四柱=${P.year} ${P.month} ${P.day} ${P.hour}`);
  console.log('  我的自算 :', JSON.stringify(mine));
  console.log('  项目主星 :', JSON.stringify(proj));
  console.log('  lunar-js :', JSON.stringify(ljS), '(其命名: 偏印=枭神? 七杀=偏官?)');
}
