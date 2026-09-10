import http from 'http'; import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
const o=await call({y:1990,m:5,d:15,h:14,min:30,sex:'男'}); const d=o.data||o;
console.log('card titles:', (d.cards||[]).map(c=>c.title||'(untitled)'));
console.log('\n含神煞关键词的顶层字段:');
for(const k of Object.keys(d)){ const s=JSON.stringify(d[k]||''); if(/贵人|驿马|文昌|桃花|华盖|将星|羊刃|空亡|神煞|魁罡|禄神/.test(s)) console.log('  FIELD',k,'(len',s.length+')'); }
console.log('\n含神煞词的结构化(riBiao/gg):');
const {Solar}=require('lunar-javascript');
const lu=Solar.fromYmdHms(1990,5,15,14,30,0).getLunar().getEightChar();
const names=Object.getOwnPropertyNames(Object.getPrototypeOf(lu)).filter(n=>/shen|gui|sha|star|god|gui/i.test(n));
console.log('lj 神煞类方法:', names.join(', '));
// 试 getShenSha
try{ const ss=lu.getShenSha(); console.log('getShenSha():', Array.isArray(ss)?ss.slice(0,15).join(','):JSON.stringify(ss).slice(0,200)); }catch(e){ console.log('getShenSha err', e.message.slice(0,50)); }
try{ const ss=lu.getShensha(); console.log('getShensha():', typeof ss, JSON.stringify(ss).slice(0,200)); }catch(e){ console.log('getShensha err', e.message.slice(0,50)); }
