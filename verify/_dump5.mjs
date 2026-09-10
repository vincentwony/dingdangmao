import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
const o=await call({y:1990,m:5,d:15,h:14,min:30,sex:'男'});
const d=o.data||o;
for (const k of ['geName','congGe','geNameV2','congGeV2','wuxingScores','wuxingPct','wuxingLevels']){
  console.log(k+':', JSON.stringify(d[k]).slice(0,400));
}
console.log('--- cards (格局卡) keys ---');
try{ console.log('cards:', JSON.stringify(d.cards).slice(0,600)); }catch(e){ console.log('cards err',e.message); }
try{ console.log('cardsV2:', JSON.stringify(d.cardsV2).slice(0,600)); }catch(e){ console.log('cardsV2 err',e.message); }
