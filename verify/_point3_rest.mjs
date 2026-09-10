import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
function stripTags(s){return (s||'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
const ZH='子丑寅卯辰巳午未申酉戌亥';
const HE=['子丑','寅亥','卯戌','辰酉','巳申','午未'];
const CHONG=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
const HAI=['子未','丑午','寅巳','卯辰','申亥','酉戌'];
const SANXING_SELF=['辰','午','酉','亥'];
function relations(zhis){
  const z=new Set(zhis); const out=[];
  // 六合
  for(const [a,b] of HE){ if(z.has(a)&&z.has(b)) out.push(a+b+'六合'); }
  // 六冲
  for(const [a,b] of CHONG){ if(z.has(a)&&z.has(b)) out.push(a+b+'六冲'); }
  // 六害
  for(const [a,b] of HAI){ if(z.has(a)&&z.has(b)) out.push(a+b+'六害'); }
  // 自刑
  for(const s of SANXING_SELF){ if(z.has(s)) out.push(s+'自刑'); }
  // 三合(三全)
  const groups=[['申','子','辰'],['亥','卯','未'],['寅','午','戌'],['巳','酉','丑']];
  for(const g of groups){ if(g.every(x=>z.has(x))) out.push(g.join('')+'三合'); }
  return out;
}
const cases=[{y:1990,m:5,d:15,h:14,min:30,sex:'男'},{y:1984,m:8,d:20,h:0,min:15,sex:'男'},{y:2010,m:10,d:10,h:12,min:0,sex:'男'}];
for(const c of cases){
  const o=await call(c); const d=o.data||o; const p=d.pillars||{};
  const zhis=[p.year,p.month,p.day,p.hour].map(x=>x?x[1]:'');
  const self=relations(zhis);
  const relCard=(d.cards||[]).find(x=>/干支关系/.test(x.title||''));
  const relTxt=relCard?stripTags(relCard.body):'(无)';
  const boneCard=(d.cards||[]).find(x=>/称骨/.test(x.title||''));
  const boneTxt=boneCard?stripTags(boneCard.body):'(无)';
  console.log(`\n=== ${c.y}-${c.m}-${c.d} 四柱地支=${zhis.join('')} ===`);
  console.log('自算地支关系:', self.join(' | ') || '(无)');
  console.log('项目干支关系卡片含关键词:', ['六合','三合','六冲','六害','三刑','自刑'].filter(k=>relTxt.includes(k)).join(','));
  console.log('项目干支关系(前200):', relTxt.slice(0,200));
  console.log('项目称骨(前160):', boneTxt.slice(0,160));
}
