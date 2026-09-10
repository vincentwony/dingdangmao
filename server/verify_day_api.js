'use strict';
var http=require('http'),crypto=require('crypto');
var SECRET=process.env.HMAC_SECRET||'381cb51f0923fc771bf7e81547c485f7';
function call(y,m,d,cb){
  var body=JSON.stringify({y:y,m:m,d:d}),url='/api/v1/calendar/day';
  var mid='verify',ts=Date.now(),nonce=String(Math.floor(Math.random()*1e5));
  var sig=crypto.createHmac('sha256',SECRET).update(mid+ts+nonce+url,'utf8').digest('hex').substr(0,8);
  var req=http.request({host:'127.0.0.1',port:3000,path:url,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'x-machine-id':mid,'x-timestamp':ts,'x-nonce':nonce,'x-signature':sig}},function(r){var b='';r.on('data',c=>b+=c);r.on('end',()=>{try{cb(JSON.parse(b));}catch(e){cb({error:b});}});});
  req.on('error',e=>cb({error:e.message}));req.write(body);req.end();
}
var tests=[[2024,1,13,'續世'],[2024,8,7,'益後'],[2024,10,18,'聖心'],[2024,10,12,'聖心(应无)']];
var i=0;function next(){if(i>=tests.length)return;var t=tests[i++];call(t[0],t[1],t[2],function(j){var g=(j.data&&j.data.goodGods)||[];var b=(j.data&&j.data.badGods)||[];console.log(t[0]+'-'+t[1]+'-'+t[2]+' 看'+t[3]+': goodGods含='+(g.indexOf(t[3].replace('(应无)',''))>=0)+' 吉数='+g.length+' 凶数='+b.length);next();});}
next();
