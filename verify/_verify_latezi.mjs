import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
const {Solar} = await import('lunar-javascript');
// 取某公历日正午(12:00)的日柱 = 该日权威日柱
function dayPillar(y,m,d){ return Solar.fromYmdHms(y,m,d,12,0,0).getLunar().getEightChar().getDay(); }
function nextDay(y,m,d){ const dt=new Date(y, m-1, d+1); return [dt.getFullYear(), dt.getMonth()+1, dt.getDate()]; }

// 直接用 Date 跨月/跨年加一天，避免手算边界
const cases = [
  [1990,5,15,23,45],[1995,12,31,23,30],[2024,6,15,23,50],
  [2024,6,30,23,55],[2000,2,29,23,40],[1984,12,31,23,59],
  [2023,2,28,23,15],[1996,1,31,23,20],
];
let ok=0, bad=0;
console.log('晚子时(23:xx) 项目是否=真实次日日柱:');
for (const [y,m,d,h,min] of cases){
  const o=await call({y,m,d,h,min,sex:'男'}); const pday=(o.data||o).pillars.day;
  const [ny,nm,nd]=nextDay(y,m,d); const realNext=dayPillar(ny,nm,nd);
  const pass = pday===realNext;
  if(pass)ok++;else bad++;
  console.log(`${pass?'  OK ':'FAIL'}  ${y}-${m}-${d} 23:xx → 项目=${pday}  真实次日(${ny}-${nm}-${nd})=${realNext}`);
}
console.log(`\n晚子时换日验证: ${ok} 通过 / ${bad} 失败  (全部应通过=项目严格遵循"晚子时换日"且滚对次日)`);
