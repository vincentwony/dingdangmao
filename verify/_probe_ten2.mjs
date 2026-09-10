import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
const GZ=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const WX=[0,0,1,1,2,2,3,3,4,4]; const sheng=a=>(a+1)%5, ke=a=>(a+2)%5;
function ss(i,j){const ri=WX[i],rj=WX[j];if(ri===rj)return (i===j)?'比肩':'劫财';if(sheng(rj)===ri)return(i%2===j%2)?'偏印':'正印';if(sheng(ri)===rj)return(i%2===j%2)?'食神':'伤官';if(ke(rj)===ri)return(i%2===j%2)?'七杀':'正官';if(ke(ri)===rj)return(i%2===j%2)?'偏财':'正财';return '?';}
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
const {Solar}=await import('lunar-javascript');
function parseMain(html){const rows=html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g)||[];for(const tr of rows){if(/主星/.test(tr)){return [...tr.matchAll(/bt-main-star">([^<]+)</g)].map(m=>m[1].trim());}}return [];}

for(const c of [{y:2010,m:10,d:10,h:11,min:11,sex:'女'},{y:1969,m:7,d:1,h:3,min:10,sex:'男'},{y:1992,m:4,d:4,h:21,min:5,sex:'男'}]){
  const o=await call(c); const d=o.data||o; const P=d.pillars;
  const dG=GZ.indexOf(P.day[0]), hG=GZ.indexOf(P.hour[0]);
  const ec=Solar.fromYmdHms(c.y,c.m,c.d,c.h,c.min,0).getLunar().getEightChar();
  console.log(`\n${c.y}-${c.m}-${c.d} ${c.sex}  四柱=${P.year} ${P.month} ${P.day} ${P.hour}`);
  console.log('  项目主星 :', JSON.stringify(parseMain(d.cards[0].body)));
  console.log('  我算(干十神):', JSON.stringify([ss(dG,GZ.indexOf(P.year[0])),ss(dG,GZ.indexOf(P.month[0])),'日',ss(dG,hG)]));
  console.log('  lunar 干十神:', JSON.stringify([ec.getYearShiShenGan(),ec.getMonthShiShenGan(),'日',ec.getTimeShiShenGan()]));
  console.log('  lunar 支十神(本气):', JSON.stringify([ec.getYearShiShenZhi(),ec.getMonthShiShenZhi(),'日',ec.getTimeShiShenZhi()]));
  console.log('  lunar 胎/命/身:', ec.getTaiYuan(), ec.getMingGong(), ec.getShenGong());
  console.log('  项目 胎/命/身:', (d.riBiao.taiYuan||'').replace(/\s*\(.*\)/,''), (d.riBiao.mingGong||'').replace(/\s*\(.*\)/,''), (d.riBiao.shenGong||'').replace(/\s*\(.*\)/,''));
}
