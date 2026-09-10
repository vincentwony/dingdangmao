'use strict';
const https = require('https');
const fs = require('fs');
function get(u){
  return new Promise((res,rej)=>{
    const req = https.get(u, {headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0)'}, timeout: 20000}, r=>{
      if(r.statusCode>=300 && r.statusCode<400 && r.headers.location){ req.destroy(); return res(get(r.headers.location)); }
      let d=''; r.setEncoding('utf8'); r.on('data',c=>d+=c); r.on('end',()=>res(d));
    });
    req.on('error', rej); req.on('timeout', ()=>{ req.destroy(new Error('timeout')); });
  });
}
const base='https://zh.wikisource.org/w/index.php?title=%E6%AC%BD%E5%AE%9A%E5%8D%94%E7%B4%80%E8%BE%A8%E6%96%B9%E6%9B%B8_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B7';
(async()=>{
  for(const v of [5,6]){
    const u = base+v+'&action=raw';
    let ok=false;
    for(let i=0;i<5 && !ok;i++){
      try{ const t = await get(u); fs.writeFileSync('xiejì_v'+v+'.txt', t); console.log('卷'+v+' OK bytes='+t.length); ok=true; }
      catch(e){ console.log('卷'+v+' try'+i+' ERR '+e.message); await new Promise(r=>setTimeout(r,1500)); }
    }
    if(!ok) console.log('卷'+v+' FAILED after retries');
  }
})();
