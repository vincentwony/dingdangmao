import crypto from 'crypto';
import { writeFileSync } from 'fs';

const SECRET = '381cb51f0923fc771bf7e81547c485f7';
const path = '/api/v1/ziwei/astrolabe';
const mid = 'fetch-tool';
const ts = Date.now();
const nonce = crypto.randomBytes(4).toString('hex');
const msg = mid + ts + nonce + path;
const sig = crypto.createHmac('sha256', SECRET).update(msg, 'utf8').digest('hex').substring(0, 8);

const body = { y: 1982, m: 5, d: 10, hour: 12, min: 20, sex: '男', calType: 'solar' };

const res = await fetch('http://localhost:3000' + path, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-machine-id': mid, 'x-timestamp': String(ts), 'x-nonce': nonce, 'x-signature': sig },
  body: JSON.stringify(body)
});
const json = await res.json();
if (!json.ok) { console.error('ERR', JSON.stringify(json)); process.exit(1); }

// 精简输出：每个宫位的关键字段
const slim = {
  meta: {
    fourPillars: json.data.meta.fourPillars,
    fiveElementsClass: json.data.meta.fiveElementsClass,
    soul: json.data.meta.soul,
    body: json.data.meta.body,
    zodiac: json.data.meta.zodiac,
    yearMutagen: json.data.meta.yearMutagen
  },
  palaces: json.data.palaces.map(p => ({
    index: p.index,
    name: p.name,
    heavenlyStem: p.heavenlyStem,
    earthlyBranch: p.earthlyBranch,
    isBodyPalace: p.isBodyPalace,
    decadal: p.decadal,
    ages: p.ages,
    changsheng12: p.changsheng12,
    boshi12: p.boshi12,
    jiangqian12: p.jiangqian12,
    suiqian12: p.suiqian12,
    majorStars: p.majorStars.map(s => ({ name: s.name, brightness: s.brightness, mutagen: s.mutagen, type: s.type })),
    minorStars: p.minorStars.map(s => ({ name: s.name, brightness: s.brightness, mutagen: s.mutagen, type: s.type })),
    adjectiveStars: p.adjectiveStars.map(s => ({ name: s.name, brightness: s.brightness, mutagen: s.mutagen, type: s.type }))
  }))
};

writeFileSync('H:/Phone/server/ziwei_real_1982.json', JSON.stringify(slim, null, 1));
console.log('saved. palaces=' + slim.palaces.length);
// 打印迁移宫详情以核对中心数字
const dm = slim.palaces.find(p => p.name === '迁移');
console.log('迁移宫:', JSON.stringify(dm, null, 1));
