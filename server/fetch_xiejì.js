'use strict';
const https = require('https');
const fs = require('fs');
const url = 'https://zh.wikisource.org/w/index.php?title=%E6%AC%BD%E5%AE%9A%E5%8D%94%E7%B4%80%E8%BE%A8%E6%96%B9%E6%9B%B8_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B709&action=raw';
function get(u, depth){
  return new Promise((res,rej)=>{
    https.get(u, {headers:{'User-Agent':'Mozilla/5.0'}}, r=>{
      if(r.statusCode>=300 && r.statusCode<400 && r.headers.location){ return res(get(r.headers.location, depth+1)); }
      let d=''; r.setEncoding('utf8'); r.on('data',c=>d+=c); r.on('end',()=>res(d));
    }).on('error', rej);
  });
}
get(url,0).then(t=>{ fs.writeFileSync('noref_xiejì_raw.txt', t); console.log('bytes='+t.length); 
  const names=['不將','九坎','孤辰','歸忌','地火','天狗','河魁','大會','小會','兵吉','兵福','天罡','天后','天吏','三陰','五墓','五虛','八風','了戾','行狠','逐陣','解神','臨日','地囊','歲薄','單陰','純陰','純陽','陰位','陰道沖陽','陰錯','陰陽交破','陰陽俱錯','陰陽擊沖','陽破陰沖','陽錯','四廢','四忌','四擊','四窮','四耗'];
  for(const n of names){ console.log(n, t.includes(n)?'FOUND':'MISS'); }
}).catch(e=>{ console.log('ERR', e.message); });
