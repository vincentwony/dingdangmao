'use strict';
const fs = require('fs');
const f = 'node_modules/@lunisolar/plugin-thegods/dist/index.js';
const s = fs.readFileSync(f, 'utf8');
for (const name of ['聖心','益後','續世','圣心','益后','续世']) {
  const re = new RegExp('"' + name + '":\\[C\\(\\[([^\\]]*)\\]');
  const m = s.match(re);
  if (m) console.log(name, '=> [' + m[1] + ']');
  else console.log(name, '=> (not found as C-array)');
}
