import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
function call({y,m,d,h,min,sex}){const body=JSON.stringify({y,m,d,h,min,sex});const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
for (const c of [{y:1990,m:5,d:15,h:14,min:30,sex:'男'},{y:2000,m:1,d:1,h:0,min:30,sex:'男'}]){
  const o=await call(c); const data=o.data||o; const du=data.dayun||{};
  console.log('--- ' + c.y + '-' + c.m + '-' + c.d + ' ' + String(c.h).padStart(2,'0') + ':' + c.min + ' ' + c.sex + ' ---');
  console.log('dayun keys:', Object.keys(du).join(', '));
  console.log('dayun.start:', JSON.stringify(du.start), '| dayun.qi:', JSON.stringify(du.qi), '| dayun.age:', JSON.stringify(du.age));
  if(Array.isArray(du.list)) console.log('dayun.list[0..2]:', JSON.stringify(du.list.slice(0,3)));
}
