import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
function stripTags(s){return (s||'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
const TYB={'甲':['丑','未'],'戊':['丑','未'],'庚':['丑','未'],'乙':['子','申'],'己':['子','申'],'丙':['亥','酉'],'丁':['亥','酉'],'壬':['卯','巳'],'癸':['卯','巳'],'辛':['午','寅']};
const YM={'寅':'申','午':'申','戌':'申','申':'寅','子':'寅','辰':'寅','巳':'亥','酉':'亥','丑':'亥','亥':'巳','卯':'巳','未':'巳'};
const WC={'甲':'巳','乙':'午','丙':'申','戊':'申','丁':'酉','己':'酉','庚':'亥','辛':'子','壬':'寅','癸':'卯'};
const TH={'寅':'卯','午':'卯','戌':'卯','申':'酉','子':'酉','辰':'酉','巳':'午','酉':'午','丑':'午','亥':'子','卯':'子','未':'子'};
const HG={'寅':'戌','午':'戌','戌':'戌','申':'辰','子':'辰','辰':'辰','巳':'丑','酉':'丑','丑':'丑','亥':'未','卯':'未','未':'未'};
const JX={'寅':'午','午':'午','戌':'午','申':'子','子':'子','辰':'子','巳':'酉','酉':'酉','丑':'酉','亥':'卯','卯':'卯','未':'卯'};
const YR={'甲':'卯','乙':'辰','丙':'午','戊':'午','丁':'未','己':'未','庚':'酉','辛':'戌','壬':'子','癸':'丑'};
function core(dG,dZ,yZ){
  const r={};
  r['天乙贵人']=(TYB[dG]||[]).join('');
  r['驿马']=YM[dZ]||'';
  r['文昌']=WC[dG]||'';
  r['桃花']=TH[dZ]||'';
  r['华盖']=HG[dZ]||'';
  r['将星']=JX[dZ]||'';
  r['羊刃']=YR[dG]||'';
  return r;
}
const cases=[{y:1990,m:5,d:15,h:14,min:30,sex:'男'},{y:1984,m:8,d:20,h:0,min:15,sex:'男'},{y:2010,m:10,d:10,h:12,min:0,sex:'男'}];
for(const c of cases){
  const o=await call(c); const d=o.data||o; const p=d.pillars||{};
  const dG=p.day?p.day[0]:'', dZ=p.day?p.day[1]:'', yZ=p.year?p.year[1]:'';
  const card=(d.cards||[]).find(x=>/吉神凶煞|神煞/.test(x.title||''));
  const txt=card?stripTags(card.body):'(无卡片)';
  const self=core(dG,dZ,yZ);
  console.log(`\n=== ${c.y}-${c.m}-${c.d} 日干=${dG} 日支=${dZ} 年支=${yZ} ===`);
  console.log('自算核心神煞:', JSON.stringify(self));
  // 检查项目文本是否含各神煞名
  const names=['天乙贵人','驿马','文昌','桃花','华盖','将星','羊刃','空亡'];
  const hit=names.filter(n=>txt.includes(n));
  console.log('项目卡片含神煞名:', hit.join(','));
  console.log('项目神煞文本(前360):', txt.slice(0,360));
}
