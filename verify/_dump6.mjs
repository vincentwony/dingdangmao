import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
const o=await call({y:1990,m:5,d:15,h:14,min:30,sex:'男'}); const d=o.data||o;
console.log('ALL KEYS:', Object.keys(d).join(', '));
console.log('\nbzInfo type:', typeof d.bzInfo, Array.isArray(d.bzInfo)?'arr['+d.bzInfo.length+']':'');
if(d.bzInfo && typeof d.bzInfo==='object'){ console.log('bzInfo keys:', Object.keys(d.bzInfo).join(', ')); }
console.log('\nbzinfo type:', typeof d.bzinfo);
if(d.bzinfo && typeof d.bzinfo==='object'){ console.log('bzinfo keys:', Object.keys(d.bzinfo).join(', ')); }
console.log('\nriBiao type:', typeof d.riBiao);
if(d.riBiao && typeof d.riBiao==='object'){ console.log('riBiao keys:', Object.keys(d.riBiao).slice(0,40).join(', ')); }
// look for taiyuan/minggong/shensha/十神 anywhere
for (const k of Object.keys(d)){
  const s=JSON.stringify(d[k]); 
  if(/胎元|命宫|身宫|taiyuan|minggong|shengong/i.test(s)) console.log('FIELD',k,'contains 胎元/命宫/身宫');
}
