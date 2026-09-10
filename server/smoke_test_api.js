'use strict';
var http = require('http');
var hmac = require('./lib/hmac');
function call(y,m,d, cb){
  var body = JSON.stringify({y:y,m:m,d:d});
  var url = '/api/v1/calendar/day';
  var mid = 'smoke-test';
  var ts = Date.now();
  var nonce = hmac.genNonce(); // 修复：密码学安全 nonce，替代 Math.random()
  var sig = hmac.sign(mid, ts, nonce, url);
  var H = hmac.HEADER_NAMES;
  var opts = {
    host:'127.0.0.1', port:3000, path:url, method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Content-Length': Buffer.byteLength(body),
      [H.MID]: mid, [H.TS]: ts, [H.NONCE]: nonce, [H.SIG]: sig
    }
  };
  var req = http.request(opts, function(res){
    var buf=''; res.on('data',function(c){buf+=c;});
    res.on('end',function(){
      var j=null; try{j=JSON.parse(buf);}catch(e){}
      cb(j);
    });
  });
  req.on('error',function(e){cb({error:e.message});});
  req.write(body); req.end();
}
var tests = [
  {y:2024,m:10,d:12, god:'聖心', expect:false, raw:true},
  {y:2024,m:10,d:18, god:'聖心', expect:true,  raw:false},
  {y:2024,m:8,d:7,  god:'益後', expect:true,  raw:false},
  {y:2024,m:8,d:13, god:'益後', expect:false, raw:true},
  {y:2024,m:1,d:1,  god:'續世', expect:false, raw:true},
  {y:2024,m:1,d:13, god:'續世', expect:true,  raw:false},
];
var i=0;
function next(){
  if (i>=tests.length){ return; }
  var t = tests[i++];
  call(t.y,t.m,t.d, function(j){
    if (!j || !j.ok || !j.data){ console.log(t.y+'-'+t.m+'-'+t.d+' '+t.god+' => API_ERR '+JSON.stringify(j)); next(); return; }
    var gd = (j.data.goodGods||[]).concat(j.data.badGods||[]);
    var present = gd.indexOf(t.god)>=0;
    var ok = present === t.expect;
    console.log((ok?'PASS':'FAIL')+' '+t.y+'-'+t.m+'-'+t.d+' '+t.god+' present='+present+' expect='+t.expect+' (raw_was='+t.raw+')');
    next();
  });
}
next();
