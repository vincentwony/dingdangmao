import http from 'http'; import crypto from 'crypto';
const SECRET='381cb51f0923fc771bf7e81547c485f7', URL='/api/v1/bazi';
const GZ=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const WX=[0,0,1,1,2,2,3,3,4,4]; const sheng=a=>(a+1)%5, ke=a=>(a+2)%5;
function ss(i,j){const ri=WX[i],rj=WX[j];if(ri===rj)return (i===j)?'比肩':'劫财';if(sheng(rj)===ri)return(i%2===j%2)?'偏印':'正印';if(sheng(ri)===rj)return(i%2===j%2)?'食神':'伤官';if(ke(rj)===ri)return(i%2===j%2)?'七杀':'正官';if(ke(ri)===rj)return(i%2===j%2)?'偏财':'正财';return '?';}
function call(b){const body=JSON.stringify(b);const mid='audit',ts=Date.now().toString(),nonce=crypto.randomBytes(6).toString('hex');const sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+URL,'utf8').digest('hex').substring(0,8);return new Promise((res,rej)=>{const req=http.request({host:'127.0.0.1',port:3000,path:URL,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));});req.on('error',rej);req.write(body);req.end();});}
function parseMain(html){const rows=html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g)||[];for(const tr of rows){if(/主星/.test(tr)){return [...tr.matchAll(/bt-main-star">([^<]+)</g)].map(m=>m[1].trim());}}return [];}

// 20 张覆盖不同时辰/性别的命盘
const charts=[
 {y:2010,m:10,d:10,h:11,min:11,sex:'女'},
 {y:1990,m:5,d:15,h:14,min:30,sex:'男'},
 {y:1984,m:8,d:20,h:10,min:15,sex:'男'},
 {y:2000,m:1,d:1,h:8,min:0,sex:'男'},
 {y:1976,m:3,d:8,h:6,min:20,sex:'男'},
 {y:1985,m:9,d:22,h:18,min:40,sex:'女'},
 {y:1969,m:7,d:1,h:3,min:10,sex:'男'},
 {y:2001,m:11,d:11,h:15,min:45,sex:'女'},
 {y:1992,m:4,d:4,h:21,min:5,sex:'男'},
 {y:1972,m:7,d:7,h:1,min:5,sex:'男'},
 {y:1983,m:1,d:20,h:22,min:30,sex:'女'},
 {y:1994,m:6,d:6,h:9,min:9,sex:'男'},
 {y:2005,m:3,d:3,h:13,min:13,sex:'女'},
 {y:1960,m:12,d:12,h:19,min:19,sex:'男'},
 {y:1979,m:4,d:4,h:4,min:4,sex:'女'},
 {y:1988,m:11,d:11,h:16,min:16,sex:'男'},
 {y:2003,m:8,d:8,h:23,min:8,sex:'女'},
 {y:1997,m:2,d:2,h:7,min:7,sex:'男'},
 {y:1955,m:5,d:5,h:12,min:12,sex:'女'},
 {y:2015,m:9,d:9,h:2,min:2,sex:'男'},
];
let ok=0,fail=0; const fails=[];
for(const c of charts){
  const o=await call(c); const d=o.data||o; const P=d.pillars;
  const dG=GZ.indexOf(P.day[0]), hG=GZ.indexOf(P.hour[0]);
  const mine=ss(dG,hG);
  const proj=parseMain(d.cards[0].body)[3];
  if(mine===proj)ok++;else{fail++;fails.push(`${c.y}-${c.m}-${c.d} ${String(c.h).padStart(2,'0')}:${c.min} ${P.day} ${P.hour} 项目=${proj} 应=${mine}`);}
}
console.log(`时主星(干十神) 20例: ${ok} OK / ${fail} FAIL`);
fails.forEach(f=>console.log('  FAIL:',f));
