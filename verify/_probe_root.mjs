import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
const cases=[
  {y:2010,m:10,d:10,h:12,min:0,sex:'男',tag:'戊午时(应正官,项目偏财?)'},
  {y:1990,m:5,d:15,h:14,min:30,sex:'男',tag:'癸未时(应伤官)'},
  {y:2005,m:3,d:3,h:12,min:0,sex:'男',tag:'甲午时(应偏印,项目正印?)'},
  {y:1960,m:12,d:12,h:12,min:0,sex:'男',tag:'甲戌时(应比肩,项目正印?)'},
  {y:1997,m:2,d:2,h:12,min:0,sex:'男',tag:'己卯时(应偏财,项目正官?)'},
];
for (const c of cases){
  const o=await call(c); const d=o.data||o;
  console.log('== '+c.tag);
  console.log('  b1,b2,b3,b4 =', d.b1, d.b2, d.b3, d.b4, '| b4%10=', (d.b4||0)%10, ' b3%10=', (d.b3||0)%10);
  // find 时主星 in cards
  const cards = d.cards||[];
  for (const card of cards){
    const title = (card.title||'');
    if(/专业细盘|细盘/.test(title)){
      const body = card.body||'';
      // extract 时柱 line
      const m = body.match(/时[柱干][^<]*?(正官|七杀|正财|偏财|正印|偏印|食神|伤官|比肩|劫财)[^<]*/);
      console.log('  专业细盘时主星匹配:', m?m[0].slice(0,60):'(not found in card.body)');
    }
  }
  // also dump ssList if present
  if (d.ssList) console.log('  ssList:', JSON.stringify(d.ssList));
  if (d.bzInfo && d.bzInfo.ssList) console.log('  bzInfo.ssList:', JSON.stringify(d.bzInfo.ssList));
}
