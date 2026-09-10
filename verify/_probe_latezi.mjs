import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}

const {Solar} = await import('lunar-javascript');
function lj(y,m,d,h,min){ const lu=Solar.fromYmdHms(y,m,d,h,min,0).getLunar(); const ec=lu.getEightChar(); return {day:ec.getDay(), hour:ec.getTime()}; }

const cases = [
  {y:1990,m:5,d:15,h:23,min:45,sex:'男', label:'晚子时A'},
  {y:1995,m:12,d:31,h:23,min:30,sex:'男', label:'晚子时B(跨年)'},
  {y:2000,m:1,d:1,h:0,min:30,sex:'男', label:'早子时'},
  {y:1984,m:8,d:20,h:0,min:15,sex:'男', label:'早子时'},
  {y:2024,m:6,d:15,h:23,min:50,sex:'女', label:'晚子时C'},
  {y:2024,m:6,d:16,h:0,min:10,sex:'女', label:'早子时C(同日邻)'},
];

console.log('日期                项目日柱 项目时柱 | lunar日柱 lunar时柱 | 备注');
for (const c of cases){
  const o = await call(c); const p = (o.data||o).pillars||{};
  const L = lj(c.y,c.m,c.d,c.h,c.min);
  const sameDayRoll = (L.day !== p.day);
  console.log(
    c.label.padEnd(10) + ' ' + c.y+'-'+c.m+'-'+c.d+' '+String(c.h).padStart(2,'0')+':'+String(c.min).padStart(2,'0') +
    ' | ' + (p.day||'?').padEnd(6) + ' ' + (p.hour||'?').padEnd(6) +
    ' | ' + L.day.padEnd(6) + ' ' + L.hour.padEnd(6) +
    ' | ' + (sameDayRoll ? '项目≠lunar' : '项目=lunar')
  );
}
