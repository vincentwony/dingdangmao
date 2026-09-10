import { readFileSync, writeFileSync } from 'fs';

const tpl = readFileSync('H:/Phone/web/chart_template.html', 'utf8');
const data = readFileSync('H:/Phone/server/ziwei_real_1982.json', 'utf8');

const out = tpl.replace('__DATA__', data.trim());
writeFileSync('H:/Phone/web/ziwei-chart.html', out);
console.log('written web/ziwei-chart.html');
