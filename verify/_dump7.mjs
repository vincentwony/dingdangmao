import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
const o=await call({y:1990,m:5,d:15,h:14,min:30,sex:'男'}); const d=o.data||o;
for (const k of ['b1','b2','b3','b4','MGxh']){
  console.log(k+':', JSON.stringify(d[k]).slice(0,300));
}
console.log('riBiao.taiYuan/mingGong/shenGong:', d.riBiao.taiYuan, d.riBiao.mingGong, d.riBiao.shenGong);
