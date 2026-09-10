import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
function stripTags(s){return (s||'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function extractMainStars(cardBody){
  // 主星行 = <tr class="bt-row-0"> ... 4个 <td class="bt-td"> 或 <td class="bt-td bt-col-day">
  const rowRe = /<tr class="bt-row-0">([\s\S]*?)<\/tr>/;
  const m = cardBody.match(rowRe);
  if(!m) return null;
  const tds = m[1].match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
  return tds.map(t=>stripTags(t.replace(/<td[^>]*>/,'').replace(/<\/td>$/,'')));
}
const cases=[
  {y:2010,m:10,d:10,h:12,min:0,sex:'男',tag:'癸日戊午时(应正官)'},
  {y:1990,m:5,d:15,h:14,min:30,sex:'男',tag:'庚日癸未时(应伤官)'},
  {y:2005,m:3,d:3,h:12,min:0,sex:'男',tag:'乙日甲午时'},
  {y:1960,m:12,d:12,h:12,min:0,sex:'男',tag:'甲日甲戌时'},
  {y:1997,m:2,d:2,h:12,min:0,sex:'男',tag:'乙日己卯时'},
  {y:1984,m:8,d:20,h:0,min:15,sex:'男',tag:'丙日戊子时(子时)'},
  {y:2000,m:1,d:1,h:0,min:30,sex:'男',tag:'戊日壬子时(子时)'},
];
for (const c of cases){
  const o=await call(c); const d=o.data||o;
  const cards=d.cards||[];
  let found=null;
  for(const card of cards){ if(/专业细盘|细盘/.test(card.title||'')){ found=card; break; } }
  if(!found){ console.log('== '+c.tag+' : (无专业细盘卡片)'); continue; }
  const stars=extractMainStars(found.body);
  console.log('== '+c.tag);
  console.log('   主星[年,月,日,时] =', JSON.stringify(stars));
}
