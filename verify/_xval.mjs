import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
const GZ=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZH=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
// 本气藏干
const BENQI={0:0,1:5,2:2,3:3,4:4,5:2,6:3,7:5,8:6,9:7,10:4,11:8}; // 地支index→本气天干index
const SHISHEN=['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印'];
// 关系法（阴阳日主通用）: 甲乙木0 丙丁火1 戊己土2 庚辛金3 壬癸水4
const WX=[0,0,1,1,2,2,3,3,4,4];
const sheng=a=>(a+1)%5, ke=a=>(a+2)%5;
function ss(i,j){
  const ri=WX[i], rj=WX[j];
  if(ri===rj) return (i===j)?'比肩':'劫财';
  if(sheng(rj)===ri) return (i%2===j%2)?'偏印':'正印';   // j生i → 印
  if(sheng(ri)===rj) return (i%2===j%2)?'食神':'伤官';   // i生j → 食伤
  if(ke(rj)===ri)    return (i%2===j%2)?'七杀':'正官';   // j克i → 官杀
  if(ke(ri)===rj)    return (i%2===j%2)?'偏财':'正财';   // i克j → 财
  return '?';
}
function gzIndex(arr,ch){ return arr.indexOf(ch); }
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
const {Solar}=await import('lunar-javascript');
function lj(y,m,d,h,min){ const lu=Solar.fromYmdHms(y,m,d,h,min,0).getLunar().getEightChar(); return lu; }

const charts=[
 {y:1990,m:5,d:15,h:14,min:30,sex:'男'},
 {y:1988,m:2,d:17,h:12,min:0,sex:'女'},
 {y:1984,m:8,d:20,h:10,min:15,sex:'男'},
 {y:2000,m:1,d:1,h:8,min:0,sex:'男'},
 {y:1995,m:12,d:31,h:23,min:30,sex:'男'},
 {y:2024,m:6,d:15,h:23,min:50,sex:'女'},
 {y:1976,m:3,d:8,h:6,min:20,sex:'男'},
 {y:1985,m:9,d:22,h:18,min:40,sex:'女'},
 {y:1969,m:7,d:1,h:3,min:10,sex:'男'},
 {y:2001,m:11,d:11,h:15,min:45,sex:'女'},
 {y:1992,m:4,d:4,h:21,min:5,sex:'男'},
 {y:2010,m:10,d:10,h:11,min:11,sex:'女'},
];

let rTen=0,rTenF=0,rTY=0,rTYF=0,rWX=0,rWXF=0,rGe=0,rGeF=0;
function parseMainStars(html){ // 主星行 bt-main-star
  const rows=html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g)||[];
  for(const tr of rows){
    if(/主星/.test(tr)){
      const spans=[...tr.matchAll(/bt-main-star">([^<]+)</g)].map(m=>m[1].trim());
      return spans; // [年,月,日,时]
    }
  }
  return [];
}

for(const c of charts){
  const o=await call(c); const d=o.data||o;
  const P=d.pillars; const yG=GZ.indexOf(P.year[0]), mG=GZ.indexOf(P.month[0]), dG=GZ.indexOf(P.day[0]), hG=GZ.indexOf(P.hour[0]);
  const yZ=ZH.indexOf(P.year[1]), mZ=ZH.indexOf(P.month[1]), dZ=ZH.indexOf(P.day[1]), hZ=ZH.indexOf(P.hour[1]);
  const dayIdx=dG;
  // 自算主星(天干十神)
  const mainStars=[ss(dayIdx,yG),ss(dayIdx,mG),'日',ss(dayIdx,hG)];
  // 项目主星(解析cards html)
  const projMain=parseMainStars(d.cards&&d.cards[0]?d.cards[0].body:'');
  const tenOk = JSON.stringify(mainStars)===JSON.stringify(projMain);
  if(tenOk)rTen++;else rTenF++;
  // lunar 十神(天干)
  const ec=lj(c.y,c.m,c.d,c.h,c.min);
  const ljGan=[ec.getYearShiShenGan(),ec.getMonthShiShenGan(),'日',ec.getTimeShiShenGan()];
  // lunar 天干十神命名可能不同(如 枭神 vs 偏印)，仅作参考不计入硬性fail
  // 胎元/命宫/身宫
  const ty=(d.riBiao.taiYuan||'').replace(/\s*\(.*\)/,'');
  const mg=(d.riBiao.mingGong||'').replace(/\s*\(.*\)/,'');
  const sg=(d.riBiao.shenGong||'').replace(/\s*\(.*\)/,'');
  const tyOk=ty===ec.getTaiYuan(); const mgOk=mg===ec.getMingGong(); const sgOk=sg===ec.getShenGong();
  if(tyOk&&mgOk&&sgOk)rTY++;else rTYF++;
  // 五行pct求和
  const pct=d.wuxingPct||{}; const sum=Object.values(pct).reduce((a,b)=>a+b,0);
  const pctOk = Math.abs(sum-100)<=1;
  if(pctOk)rWX++;else rWXF++;
  // 定格一致性：月支本气十神
  const benqiGan=BENQI[mZ]; const benqiSS=ss(dayIdx,benqiGan);
  const ge=d.geName||''; const geOk = ge.indexOf(benqiSS.replace('偏官','七杀').replace('枭神','偏印'))>=0 || benqiSS.includes(ge.replace('格',''));
  if(geOk)rGe++;else rGeF++;
  console.log(
    `${c.y}-${c.m}-${c.d} ${String(c.h).padStart(2,'0')}:${String(c.min).padStart(2,'0')} ${c.sex}`+
    ` | 十神 ${tenOk?'OK':'FAIL '+JSON.stringify(mainStars)+'≠'+JSON.stringify(projMain)}`+
    ` | 胎命身 ${tyOk&&mgOk&&sgOk?'OK':'FAIL ['+ty+'/'+ec.getTaiYuan()+']['+mg+'/'+ec.getMingGong()+']['+sg+'/'+ec.getShenGong()+']'}`+
    ` | 五行pctΣ=${sum}${pctOk?'OK':'FAIL'} | 定格 ${geOk?'OK':'?'}`+
    ` (月令本气=${benqiSS}→${ge})`
  );
}
console.log(`\n=== 交叉验证汇总 ===`);
console.log(`十神主星: ${rTen} OK / ${rTenF} FAIL`);
console.log(`胎元命宫身宫: ${rTY} OK / ${rTYF} FAIL`);
console.log(`五行pctΣ=100: ${rWX} OK / ${rWXF} FAIL`);
console.log(`定格-月令本气一致性: ${rGe} OK / ${rGeF} 需复核(含透干定格差异)`);
