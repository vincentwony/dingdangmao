// core/shensha.js
'use strict';

var Lunar = require("./lunar.js").Lunar;
var JD = require("./lunar.js").JD;
var _lsrGetGods = require("./lunar.js")._lsrGetGods;
var Wuxing = require("./wuxing.js");

// Node.js shim: provide window._lsrGetGods for browser-compat code
if (typeof global !== 'undefined' && !global.window) {
  global.window = global;
}
if (!global._lsrGetGods) {
  global._lsrGetGods = _lsrGetGods;
}
function int2(v) { v = Math.floor(v); if (v < 0) return v + 1; return v; }
var STEMS2 = '甲乙丙丁戊己庚辛壬癸';
var BRANCHES2 = '子丑寅卯辰巳午未申酉戌亥';
var XIU = ['角', '亢', '氐', '房', '心', '尾', '箕', '斗', '牛', '女', '虚', '危', '室', '壁',
    '奎', '娄', '胃', '昴', '毕', '觜', '参', '井', '鬼', '柳', '星', '张', '翼', '轸'];
var XIU_ANIMAL = ['蛟', '龙', '貉', '兔', '狐', '虎', '豹', '獬', '牛', '蝠', '鼠', '燕', '猪', '猰',
    '狼', '狗', '雉', '鸡', '乌', '猴', '猿', '犴', '羊', '獐', '马', '鹿', '蛇', '蚓'];
// 二十八宿歌诀（据《玉匣记》《禽遁大全》）
var XIU_KOUJUE = {
  '角':'角星造作主荣昌，外进田财及女郎；嫁娶婚姻生贵子，文人及第见君王。惟有葬埋不可用，三年之后主瘟癀；起工修筑坟墓地，堂前立见主人王。',
  '亢':'亢星造作长房当，十日之中主有殃；田地消磨官失职，投军定是虎狼伤。嫁娶婚姻用此日，儿孙新妇守空房；埋葬若还逢此日，当时灾祸主重丧。',
  '氐':'氐星造作主灾凶，费尽田园仓库空；埋葬不可用此日，悬绳吊颈祸重重。若是婚姻离别散，夜招浪子入房中；行船必定遭沉没，更生聋哑子孙穷。',
  '房':'房星造作田园进，血财牛马遍山冈；更招外处田庄宅，荣华富贵福寿康。埋葬若然用此日，高官进职拜君王；嫁娶嫣娥归月殿，三年抱子至朝堂。',
  '心':'心星造作大为凶，更遭刑讼狱囚中；传逆官非田宅退，埋葬卒暴死相从。婚姻若是逢此日，子死儿亡泪满胸；三年之内连遭祸，事事教君设始终。',
  '尾':'尾星造作得天恩，富贵荣华福寿宁；招财进宝置田地，和合婚姻贵子孙。埋葬若能依此日，男清女正子孙兴；开门放水招田地，代代公侯远播名。',
  '箕':'箕星造作主高强，岁岁年年大吉昌；埋葬修坟大吉利，田蚕牛马遍山冈。开门放水招财谷，箧满金银谷满仓；福荫高官加禄位，六亲丰禄足安康。',
  '斗':'斗星造作主招财，文武官员位鼎台；田宅钱财千万进，坟茔修筑富贵来。开门放水招牛马，旺财男女主和谐；遇此吉星来照护，时受福庆永无灾。',
  '牛':'牛星造作主灾危，九横三灾不可推；家宅不安人口退，田蚕不利主人衰。嫁娶婚姻皆自损，金银财谷渐无之；若是开门并放水，牛猪羊马亦伤悲。',
  '女':'女星造作损婆娘，兄弟相嫌似虎狼；埋葬生灾逢鬼怪，颠邪疾病更瘟癀。为事遭官财失散，泻痢留连不可当；开门放水逢此日，全家散败主离乡。',
  '虚':'虚星造作生灾殃，男女孤眠不一双；内乱风声无礼节，儿孙媳妇伴人床。开门放水招灾祸，虎咬蛇伤及卒亡；三三五五连年病，家破人亡不可当。',
  '危':'危星不可造高堂，自吊遭刑见血光；三岁孩儿遭水厄，后生出外不还乡。埋葬若还逢此日，周年百日卧高床；开门放水遭刑杖，三年五载亦悲伤。',
  '室':'室星造作进田牛，儿孙代代近王侯；富贵荣华天上至，寿如彭祖八千秋。开门放水招财帛，和合婚姻生贵儿；埋葬若能依此日，门庭兴旺福无休。',
  '壁':'壁星造作进庄园，丝蚕大熟福滔天；奴婢自来人口进，开门放水出英贤。埋葬招财官品进，家中诸事乐滔然；婚姻吉利生贵子，早播名声着祖鞭。',
  '奎':'奎星造作得祯祥，家下荣合大吉昌；若是埋葬阴卒死，当年定主两三丧。看看军令刑伤到，重重官事主瘟癀；开门放水招灾祸，三年五载亦悲伤。',
  '娄':'娄星竖柱起门庭，财旺家和事事兴；外进钱财百日进，一家兄弟播声名。婚姻进益生贵子，玉帛金银箱满盈；放水开门皆吉利，男荣女贵寿安宁。',
  '胃':'胃星造作事如何，富贵荣华喜气多；埋葬进官禄爵位，三灾九祸不相侵。夫妇齐眉永保寿， mating 遇此家富贵；开门放水皆如意，财帛金银任意收。',
  '昴':'昴星造作进田牛，买卖官事不自由；开门放水招灾祸，埋葬官灾不得休。婚姻嫁娶行相克，死别生离实可愁；三岁孩儿成旱鬼，又是生离隔江游。',
  '毕':'毕星造作主光前，买得田园有粟钱；埋葬此日添官职，田蚕大熟永丰年。开门放水多吉庆，合家人口得安然；婚姻若还逢此日，生得儿女福寿全。',
  '觜':'觜星造作有徒刑，三年必定主伶仃；埋葬卒死多因此，家门田产退败零。婚姻若还逢此日，定是无儿丧后人；横祸临门官事起，是非日日不安宁。',
  '参':'参星造作旺人家，文星照耀大光华；只因造作田财进，埋葬招丧疾黄沙。婚姻若还逢此日，男女相刑克破家；生离死别无心恋，朝开暮落水中花。',
  '井':'井星造作旺蚕田，金榜题名第一先；埋葬须防官事起，开门放水有灾愆。若是婚姻并会合，儿孙兴旺有余钱；此星不须问嫁娶，贵子双双入墓田。',
  '鬼':'鬼星起造卒人亡，堂前不见主人郎；埋葬此日官事起，三年五载亦悲伤。嫁娶夫妻不久长，月下孤眠守空房；开门放水须伤死，合家大小受灾殃。',
  '柳':'柳星造作主遭官，昼夜偷闲不得安；埋葬瘟皇多病死，田园退尽守孤寒。妇人随客走天涯，开门放水遭奸盗；嫁娶婚姻三年克，儿孙流落在他乡。',
  '星':'星宿只好造新房，进职加官近帝王；不可埋葬并放水，凶星临位女人亡。生离死别无心恋，自要妇休外家郎；若是婚姻逢此日，一时不久守空房。',
  '张':'张星只好守家园，造作興工福自添；开门放水招财帛，婚姻和合福绵绵。埋葬不久升官职，代代儿孙出贵贤；此星照临家道旺，后代儿孙福禄全。',
  '翼':'翼星造作主灾殃，瘟疫流行满郡伤；埋葬婚姻俱有失，开门放水惹灾殃。年年蚕丝皆不收，田蚕五谷尽遭伤；妇人定是多孤寡，男女伶仃不一双。',
  '轸':'轸星造作主昌荣，开门放水招田畜；婚姻和合进高升，埋葬此日添官职。儿孙代代近帝王，金银财宝满箱盈；加官进职人钦敬，富贵荣华万代兴。'
};
var WUXING_STEM2 = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
var WUXING_BRANCH2 = { '寅': '木', '卯': '木', '巳': '火', '午': '火', '申': '金', '酉': '金', '亥': '水', '子': '水',
    '辰': '土', '戌': '土', '丑': '土', '未': '土' };
var BRANCH_WX2 = { '寅': '木', '卯': '木', '巳': '火', '午': '火', '辰': '土', '戌': '土', '丑': '土', '未': '土', '申': '金', '酉': '金', '亥': '水', '子': '水' };
var PZ_GAN = [
    ['甲', '不开仓，财物耗亡'], ['乙', '不栽植，千株不长'], ['丙', '不修灶，必见灾殃'],
    ['丁', '不剃头，头主生疮'], ['戊', '不受田，田主不祥'], ['己', '不破券，二比并亡'],
    ['庚', '不经络，织机虚张'], ['辛', '不合酱，主人不尝'], ['壬', '不决水，更难提防'],
    ['癸', '不词讼，理弱敌强']];
var PZ_ZHI = [
    ['子', '不问卜，自惹祸殃'], ['丑', '不冠带，主不还乡'], ['寅', '不祭祀，神鬼不尝'],
    ['卯', '不穿井，水泉不香'], ['辰', '不哭泣，必主重丧'], ['巳', '不远行，财物伏藏'],
    ['午', '不苫盖，屋主更张'], ['未', '不服药，毒气入肠'], ['申', '不安床，鬼祟入房'],
    ['酉', '不宴客，醉坐颠狂'], ['戌', '不吃犬，作怪上床'], ['亥', '不嫁娶，不利新郎']];
var NAYIN2 = [
    '海中金', '炉中火', '大林木', '路旁土', '剑锋金',
    '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
    '泉中水', '屋上土', '霹雳火', '松柏木', '长流水',
    '沙中金', '山下火', '平地木', '壁上土', '金箔金',
    '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木',
    '大溪水', '沙中土', '天上火', '石榴木', '大海水'
];
var ZODIAC_ANIMALS2 = ['猴','鸡','狗','猪','鼠','牛','虎','兔','龙','蛇','马','羊'];
var BRANCH_ANIMALS2 = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
var ZODIAC_ICONS2 = ['','','','','','','','','','','',''];
var SHICHEN2 = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
var SHICHEN_FULL2 = ['子时：23:00-00:59', '丑时：01:00-02:59', '寅时：03:00-04:59', '卯时：05:00-06:59', '辰时：07:00-08:59', '巳时：09:00-10:59', '午时：11:00-12:59', '未时：13:00-14:59', '申时：15:00-16:59', '酉时：17:00-18:59', '戌时：19:00-20:59', '亥时：21:00-22:59'];
var DUTY12_ORDER2 = ['建','除','滿','平','定','執','破','危','成','收','開','閉'];
var DUTY12_GOOD2 = { '建':false,'除':true,'滿':false,'平':false,'定':true,'執':true,'破':false,'危':true,'成':true,'收':false,'開':true,'閉':false };
var DUTY12_MEANING2 = {
    '建':'万物建始·宜求嗣出行', '除':'除旧布新·宜沐浴扫舍',
    '滿':'充盈饱满·宜祭祀祈福', '平':'平稳中和·宜修造动土',
    '定':'安定不移·宜嫁娶开市', '執':'执守不破·宜捕猎伐木',
    '破':'破败冲散·宜求医破屋', '危':'高危临险·宜祭祀安神',
    '成':'成就功业·宜嫁娶开市', '收':'收敛归藏·宜纳财入宅',
    '開':'开张通达·宜嫁娶出行', '閉':'闭塞不通·宜安葬修坟'
};
var NINE_STAR_ORDER2 = ['妖星','惑星','禾刀','煞贡','直星','卜木','角己','人专','立早'];
var NINE_STARS2 = {
    0: { name: '妖星', good: false, meaning: '上官嫁娶起造开店移徙入宅不利，主退败灾凶' },
    1: { name: '惑星', good: false, meaning: '主灾祸，不宜大事' },
    2: { name: '禾刀', good: false, meaning: '有灾迫，慎防口舌是非' },
    3: { name: '煞贡', good: true, meaning: '大吉，万事皆宜' },
    4: { name: '直星', good: true, meaning: '顺利，行事可心' },
    5: { name: '卜木', good: false, meaning: '凶恶，避讳重大决策' },
    6: { name: '角己', good: false, meaning: '凶恶，诸事不宜' },
    7: { name: '人专', good: true, meaning: '诸事清宁，万事和顺' },
    8: { name: '立早', good: false, meaning: '主凶，不宜行事' }
};
var GZ_60_ORDER2 = ['甲子','乙丑','丙寅','丁卯','戊辰','己巳','庚午','辛未','壬申','癸酉',
    '甲戌','乙亥','丙子','丁丑','戊寅','己卯','庚辰','辛巳','壬午','癸未',
    '甲申','乙酉','丙戌','丁亥','戊子','己丑','庚寅','辛卯','壬辰','癸巳',
    '甲午','乙未','丙申','丁酉','戊戌','己亥','庚子','辛丑','壬寅','癸卯',
    '甲辰','乙巳','丙午','丁未','戊申','己酉','庚戌','辛亥','壬子','癸丑',
    '甲寅','乙卯','丙辰','丁巳','戊午','己未','庚申','辛酉','壬戌','癸亥'];
var XIU_YUAN_START2 = [10, 14, 18, 22, 26, 2, 6];
var STEM_YANG2 = [true,false,true,false,true,false,true,false,true,false];
var LU_POS2 = { '甲':'寅','乙':'卯','丙':'巳','丁':'午','戊':'巳','己':'午','庚':'申','辛':'酉','壬':'亥','癸':'子' };
var HUANGDAO_SHEN2 = ['青龙','明堂','天刑','朱雀','金匮','天德','白虎','玉堂','天牢','玄武','司命','勾陈'];
var HUANGDAO_YELLOW2 = [true,true,false,false,true,true,false,true,false,false,true,false];
var HUANGDAO_KJ2 = { '青龙':'道','明堂':'远','天刑':'几','朱雀':'时','金匮':'通','天德':'达','白虎':'路','玉堂':'遥','天牢':'何','玄武':'日','司命':'还','勾陈':'乡' };
var QINGLONG_START2 = { '寅':'子','申':'子','卯':'寅','酉':'寅','辰':'辰','戌':'辰','巳':'午','亥':'午','子':'申','午':'申','丑':'戌','未':'戌' };
var CANG_GAN_OBJ2 = {
    '子': ['癸'], '丑': ['己','癸','辛'], '寅': ['甲','丙','戊'],
    '卯': ['乙'], '辰': ['戊','乙','癸'], '巳': ['丙','庚','戊'],
    '午': ['丁','己'], '未': ['己','丁','乙'], '申': ['庚','壬','戊'],
    '酉': ['辛'], '戌': ['戊','辛','丁'], '亥': ['壬','甲']
};
// 金神七煞：二十八宿值日法 — 七宿索引（角0/亢1/牛8/奎14/娄15/鬼22/星24）
var JINSHENQISHA_XIU = {0:1,1:1,8:1,14:1,15:1,22:1,24:1};
var MIEMEN_MAP2 = {
    1: ['巳','亥'], 2: ['辰','戌'], 3: ['卯','酉'], 4: ['寅','申'],
    5: ['丑','未'], 6: ['子','午'], 7: ['巳','亥'], 8: ['辰','戌'],
    9: ['卯','酉'], 10: ['寅','申'], 11: ['丑','未'], 12: ['子','午']
};
var SHOUSI_MAP2 = { 1:'戌', 2:'辰', 3:'亥', 4:'巳', 5:'子', 6:'午', 7:'丑', 8:'未', 9:'寅', 10:'申', 11:'卯', 12:'酉' };
var CHONGSANG_MAP2 = { 1:'甲', 2:'乙', 3:'戊', 4:'丙', 5:'丁', 6:'己', 7:'庚', 8:'辛', 9:'戊', 10:'壬', 11:'癸', 12:'己' };
var HENGTIAN_DAYS2 = {1:true, 9:true, 17:true, 25:true};
var DASHA_XUN2 = { 0: 4, 1: 3, 2: 2, 3: 1, 4: [0, 9], 5: 8 };
var LEITING_MAP2 = {
    '甲': {'丁卯':true,'丙子':true,'甲午':true,'癸卯':true,'壬子':true,'辛酉':true,'乙酉':true},
    '己': {'丁卯':true,'丙子':true,'甲午':true,'癸卯':true,'壬子':true,'辛酉':true,'乙酉':true},
    '乙': {'戊辰':true,'丁丑':true,'丙子':true,'乙未':true,'甲辰':true,'癸丑':true,'壬戌':true},
    '庚': {'戊辰':true,'丁丑':true,'丙子':true,'乙未':true,'甲辰':true,'癸丑':true,'壬戌':true},
    '丙': {'辛未':true,'庚辰':true,'己丑':true,'戊戌':true,'丁未':true,'丙辰':true},
    '辛': {'辛未':true,'庚辰':true,'己丑':true,'戊戌':true,'丁未':true,'丙辰':true},
    '丁': {'乙丑':true,'甲戌':true,'癸未':true,'壬辰':true,'辛丑':true,'庚戌':true,'己未':true},
    '壬': {'乙丑':true,'甲戌':true,'癸未':true,'壬辰':true,'辛丑':true,'庚戌':true,'己未':true}
};
var GONG_DZ2 = [
    ['子'],           // 0 坎
    ['丑','寅'],      // 1 艮
    ['卯'],           // 2 震
    ['辰','巳'],      // 3 巽
    ['午'],           // 4 离
    ['未','申'],      // 5 坤
    ['酉'],           // 6 兑
    ['戌','亥']       // 7 乾
];

// ═══════════════════════════════════
//  纯辅助函数
// ═══════════════════════════════════
function getYearZodiac2(y) {
    var i = ((y % 12) + 12) % 12;
    return { name: ZODIAC_ANIMALS2[i], icon: ZODIAC_ICONS2[i], full: ZODIAC_ANIMALS2[i] };
}

function normLunarMonth2(monthNum) {
    var m = monthNum;
    if (m < 0) m = -m;
    if (m > 12) m = ((m - 1) % 12) + 1;
    return m;
}

function getGZIdx2(gz) {
    var s = Lunar.Gan.indexOf(gz[0]);
    var b = Lunar.Zhi.indexOf(gz[1]);
    var i = s;
    while (i % 12 !== b) i += 10;
    return i;
}

function getSeasonType2(month) {
    var m = Math.abs(month);
    if (m === 1 || m === 4 || m === 7 || m === 10) return 'MENG';
    if (m === 2 || m === 5 || m === 8 || m === 11) return 'ZHONG';
    return 'JI';
}

function getNineStar2(gzDay, jqMonth) {
    if (!gzDay || gzDay.length < 2) return null;
    var st = getSeasonType2(jqMonth);
    var startIdx = st === 'MENG' ? 0 : st === 'ZHONG' ? 1 : 2;
    var idx = getGZIdx2(gzDay);
    if (idx === -1) return null;
    var starIdx = (startIdx + idx) % 9;
    var ns = NINE_STARS2[starIdx];
    return { name: NINE_STAR_ORDER2[starIdx], good: ns.good, meaning: ns.meaning, idx: starIdx };
}

function getShichen2(hour) {
    var idx = Math.floor(((hour + 1) % 24) / 2);
    return { index: idx, name: SHICHEN_FULL2[idx], branch: BRANCHES2[idx] };
}

function getHourGZ2(dayStem, hour) {
    var dayStemIdx = STEMS2.indexOf(dayStem);
    var sc = getShichen2(hour);
    var startStem = (dayStemIdx % 5) * 2;
    var hourStemIdx = (startStem + sc.index) % 10;
    var hourStem = STEMS2[hourStemIdx];
    return { stem: hourStem, branch: sc.branch, gz: hourStem + sc.branch, shichen: sc.name };
}

function getNaYinForGZ2(gz) {
    if (!gz || gz.length < 2) return '';
    var idx = getGZIdx2(gz);
    if (idx < 0) return '';
	return NAYIN2[Math.floor(idx / 2)];
}

// ══════ 大运共用辅助 ══════
/** 大运顺逆行方向 */
function _dayunDirection(ob) {
  var yGan = ob.b1 % 10, isYang = (yGan % 2 === 0), isMale = (ob.sex === 1);
  return (isYang && isMale) || (!isYang && !isMale);
}
/** 大运干支索引 */
function _dayunGzIdx(monthGZIdx, step, goForward) {
  return goForward ? ((monthGZIdx + step + 1) % 60 + 60) % 60 : ((monthGZIdx - step - 1) % 60 + 60) % 60;
}

/**
 * 天罗地网运 — 双算法检测（古法纳音 + 现代地支）
 * @param {object} ob — 排盘对象
 * @returns {{ classic: object, modern: object }}
 */
function computeTianLuoDiWang(ob) {
  var stems = [ob.b1%10, ob.b2%10, ob.b3%10, ob.b4%10];
  var branches = [ob.b1%12, ob.b2%12, ob.b3%12, ob.b4%12];
  var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var pillars = ['年柱','月柱','日柱','时柱'];

  // 纳音五行
  var nayinWx = null;
  try { if (ob._sz && ob._sz.ny && ob._sz.ny.length >= 1) nayinWx = ob._sz.ny[0].charAt(2) || null; }
  catch(e) { nayinWx = null; }

  // 大运基础数据
  var goForward = _dayunDirection(ob);
  var monthGZIdx = ob.b2 % 60;

  /**
   * 按给定纳音约束计算一套结果
   * @param {string|null} restrictWx — 纳音约束：null=不限(现代), '火'=天罗, '水土'=地网
   */
  function _computeOne(restrictWx) {
    var tl = { hit: false, pillars: [], method: [] };
    var dw = { hit: false, pillars: [], method: [] };

    // ── 地支组合法 ──
    var wx2 = restrictWx; // null means modern (no restriction)
    var shouldCheck = (wx2 === null) || (wx2 === '火') || (wx2 === '水') || (wx2 === '土');
    if (shouldCheck) {
      var checkPairs;
      if (wx2 === null) {
        checkPairs = [{ a:'戌', b:'亥', type:'tianluo' }, { a:'辰', b:'巳', type:'diwang' }];
      } else if (wx2 === '火') {
        checkPairs = [{ a:'戌', b:'亥', type:'tianluo' }];
      } else {
        checkPairs = [{ a:'辰', b:'巳', type:'diwang' }];
      }
      var bases = [0, 2];
      for (var bj = 0; bj < bases.length; bj++) {
        var bIdx = bases[bj], baseBranch = ZHI[branches[bIdx]];
        for (var pi = 0; pi < 4; pi++) {
          if (pi === bIdx) continue;
          var otherBranch = ZHI[branches[pi]];
          for (var cj = 0; cj < checkPairs.length; cj++) {
            var cp = checkPairs[cj];
            if (baseBranch === cp.a && otherBranch === cp.b) {
              var entry = { position: pillars[pi], branch: otherBranch, basePosition: pillars[bIdx], baseBranch: baseBranch, pair: cp.a + '→' + cp.b };
              if (cp.type === 'tianluo') { tl.hit = true; tl.pillars.push(entry); tl.method.push('dizhi'); }
              else { dw.hit = true; dw.pillars.push(entry); dw.method.push('dizhi'); }
            }
          }
        }
      }
    }

    // ── 纳音对偶法 ──
    if (wx2) {
      var nayinCheck = function(tldwObj, targetBranches, methodName) {
        var found = {};
        for (var pi = 0; pi < 4; pi++) {
          var br = ZHI[branches[pi]];
          if (targetBranches.indexOf(br) >= 0 && !found[br]) {
            found[br] = { position: pillars[pi], branch: br, method: 'nayin', note: '纳音' + nayinWx + '命见' + br };
          }
        }
        var allHit = true;
        for (var bj = 0; bj < targetBranches.length; bj++) {
          if (!found[targetBranches[bj]]) { allHit = false; break; }
        }
        if (allHit) {
          tldwObj.hit = true;
          tldwObj.method.push(methodName);
          for (var k in found) { if (found.hasOwnProperty(k)) tldwObj.pillars.push(found[k]); }
        }
      };
      if (wx2 === '火') {
        nayinCheck(tl, ['戌','亥'], 'nayin');
      } else if (wx2 === '水' || wx2 === '土') {
        nayinCheck(dw, ['辰','巳'], 'nayin');
      }
    }

    tl.method = tl.method.filter(function(v,i,a){return a.indexOf(v)===i;});
    dw.method = dw.method.filter(function(v,i,a){return a.indexOf(v)===i;});

    // ── 大运 ──
    var tlDY = [], dwDY = [];
    if (ob._sz && ob._sz.dyn && ob._sz.dyn.length > 0) {
      var qn = ob._sz.qnian || 1, dyns = ob._sz.dyn;
      for (var di = 0; di < dyns.length; di++) {
        var sY = parseInt(dyns[di], 10); if (isNaN(sY)) continue;
        var dyIdx = _dayunGzIdx(monthGZIdx, di, goForward);
        var dyZhi = BRANCHES2[dyIdx%12], dgz = STEMS2[dyIdx%10]+dyZhi;
        var as = qn+di*10, ae = as+9, ar = as+'-'+ae+'岁';
        var tlMatch = (dyZhi==='戌'||dyZhi==='亥'), dwMatch = (dyZhi==='辰'||dyZhi==='巳');
        // 大运约束与算法一致
        if (wx2 === null) {
          if (tlMatch) tlDY.push({gz:dgz,branch:dyZhi,age:ar,index:di,startYear:sY});
          if (dwMatch) dwDY.push({gz:dgz,branch:dyZhi,age:ar,index:di,startYear:sY});
        } else if (wx2 === '火' && tlMatch) {
          tlDY.push({gz:dgz,branch:dyZhi,age:ar,index:di,startYear:sY});
        } else if ((wx2 === '水' || wx2 === '土') && dwMatch) {
          dwDY.push({gz:dgz,branch:dyZhi,age:ar,index:di,startYear:sY});
        }
      }
    }

    // ── 重犯 ──
    var cf = (tl.hit && dw.hit);
    var tlDYBr = {}, dwDYBr = {};
    tlDY.forEach(function(d){tlDYBr[d.branch]=true;});
    dwDY.forEach(function(d){dwDYBr[d.branch]=true;});
    var tlU = Object.keys(tlDYBr).length, dwU = Object.keys(dwDYBr).length;
    if (tlU >= 2 || dwU >= 2 || (tlU > 0 && dwU > 0)) cf = true;

    // ── 严重程度 ──
    var sv = 0;
    if (tl.hit) sv += 2;
    if (dw.hit) sv += 2;
    sv += tlU + dwU;
    sv = Math.round(sv / 2);
    if (cf) sv = Math.max(sv, 4);
    sv = Math.min(Math.max(sv, 0), 5);

    // 大运对偶（辰+巳或戌+亥大运中齐全）
    var tlDYBr = {}, dwDYBr = {};
    tlDY.forEach(function(d){tlDYBr[d.branch]=true;});
    dwDY.forEach(function(d){dwDYBr[d.branch]=true;});
    var tlDYfull = Object.keys(tlDYBr).length >= 2, dwDYfull = Object.keys(dwDYBr).length >= 2;

    return { hasShensha: tl.hit || dw.hit || tlDYfull || dwDYfull, tianluo: tl, diwang: dw,
      tianluoDayun: tlDY, diwangDayun: dwDY, isChongFan: cf, severity: sv, nayinWx: nayinWx,
      tlDYfull: tlDYfull, dwDYfull: dwDYfull };
  }

  // —— 古法纳音约束：金木命不入格 ——
  var classicWx = (nayinWx === '火' || nayinWx === '水' || nayinWx === '土') ? nayinWx : 'none';

  return {
    classic: classicWx === 'none' ? {
      hasShensha: false, tianluo: { hit: false, pillars: [], method: [] },
      diwang: { hit: false, pillars: [], method: [] },
      tianluoDayun: [], diwangDayun: [], isChongFan: false, severity: 0, nayinWx: nayinWx
    } : _computeOne(classicWx),
    modern: _computeOne(null)
  };
}

/**
 * 魁罡命格检测
 * 依据：《三命通会》《渊海子平》
 */
function computeKuiGang(ob) {
  var GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  var ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  var KG = {16:{n:"庚辰",t:"罡"},28:{n:"壬辰",t:"罡"},34:{n:"戊戌",t:"魁"},46:{n:"庚戌",t:"魁"}};
  var b1=ob.b1,b2=ob.b2,b3=ob.b3,b4=ob.b4;
  var dIdx=((b3%60)+60)%60, yIdx=((b1%60)+60)%60, mIdx=((b2%60)+60)%60, hIdx=((b4%60)+60)%60;
  var riGanIdx=b3%10;
  var kg = KG[dIdx];
  var no = {traits:[],career:"",relationship:"",health:""};
  if (!kg) return { hasShensha:false,type:"",dayPillar:"",
    overlap:{count:0,positions:[],isStacked:false},
    evaluation:{level:0,grade:"无",description:"日柱非魁罡四日"},
    taboo:{hasWealth:false,hasOfficer:false,hasPunishment:false,hasSha:false,details:[]},
    shenWang:{isWang:false,score:0,explanation:""}, personality:no, interpretation:{}, dayun:[] };
  var pn=["年柱","月柱","日柱","时柱"], all=[yIdx,mIdx,dIdx,hIdx], pos=[];
  for(var i=0;i<4;i++){if(KG[all[i]])pos.push(pn[i]);}
  var stacked=pos.length>=2;
  var sw={isWang:false,score:0,explanation:""};
  try{
    var wxData=Wuxing._computeAllWuxing(ob);
    var wk=["mu","huo","tu","jin","shui"];
    var riWxIdx=Wuxing._cgGanWx(GAN[riGanIdx]);
    if(typeof riWxIdx==="string")riWxIdx={mu:0,huo:1,tu:2,jin:3,shui:4}[riWxIdx]||2;
    var riLv=wxData.levels[wk[riWxIdx]]||"中和", riPct=wxData.pct[wk[riWxIdx]]||0;
    sw.score=riPct; sw.isWang=(riLv==="极旺"||riLv==="偏旺");
    sw.explanation="日主"+GAN[riGanIdx]+"五行占比"+riPct.toFixed(1)+"%("+riLv+")";
  }catch(e){sw.explanation="身旺计算异常";}
  var tb={hasWealth:false,hasOfficer:false,hasPunishment:false,hasSha:false,details:[]};
  var oi=[b1%10,b2%10,b4%10], on=["年干","月干","时干"];
  for(var j=0;j<3;j++){
    var sk=Wuxing._cgSSKind(riGanIdx,oi[j]), sn=Wuxing._localSShen(riGanIdx,oi[j]);
    if(sk==="财"&&!tb.hasWealth){tb.hasWealth=true;tb.details.push(on[j]+"透"+sn+"(财)");}
    if(sk==="官"&&!tb.hasOfficer){tb.hasOfficer=true;tb.details.push(on[j]+"透"+sn+"(官)");}
  }
  var zs=[b1%12,b2%12,b3%12,b4%12],hc=false,hx=false;
  for(var k=0;k<4;k++){if(zs[k]===4)hc=true;if(zs[k]===10)hx=true;}
  if(hc&&hx){tb.hasPunishment=true;tb.details.push("辰戌相冲");}
  var lv=3,gd="魁罡入命·平",ds="魁罡入命，需结合大运流年综合论断";
  if(stacked&&sw.isWang&&!tb.hasWealth&&!tb.hasOfficer&&!tb.hasPunishment){lv=5;gd="魁罡叠逢·大贵";ds="叠叠相逢掌大权，身行旺地贵无伦";}
  else if(sw.isWang&&!tb.hasWealth&&!tb.hasOfficer&&!tb.hasPunishment){lv=4;gd="魁罡成格·贵";ds="不见财官刑煞并，身行旺地贵无伦";}
  else if(!sw.isWang&&tb.hasPunishment&&(tb.hasWealth||tb.hasOfficer)){lv=1;gd="魁罡破格·凶";ds="倘有刑冲兼破坏，一生彻骨受笞鞭";}
  else if(!sw.isWang){lv=2;gd="魁罡受制·弱";ds="身弱逢魁罡，难驾驭刚猛之性";}
  else if(sw.isWang&&(tb.hasWealth||tb.hasOfficer)){lv=2;gd="魁罡受制·弱";ds="身旺但见财官透干，魁罡贵气受损";}
  var TXT={gc:{nm:"庚辰日·天罡",sm:"庚辰日生人，命带天罡魁罡，刚毅果断，权威过人。",tr:["刚毅果断","权威过人","疾恶如仇","善于决策","领导才能"],ca:"管理、司法、军警、监察",rl:"性格刚强，感情中易显强势",he:"心脑血管、情绪管理"},rc:{nm:"壬辰日·天罡",sm:"壬辰日生人，命带天罡魁罡，深藏不露，内有乾坤。",tr:["深藏不露","沉稳内敛","蓄势待发","志向远大","善于隐忍"],ca:"战略规划、研究、金融",rl:"外表沉稳但内心强势",he:"肾脏、泌尿系统"},gx:{nm:"庚戌日·河魁",sm:"庚戌日生人，命带河魁魁罡，火库爆发，果敢魄力。",tr:["果敢魄力","敢作敢当","开拓进取","雷厉风行","不畏艰难"],ca:"创业、军事、执法",rl:"性格强势，易与伴侣摩擦",he:"肺部、呼吸系统"},wx:{nm:"戊戌日·河魁",sm:"戊戌日生人，命带河魁魁罡，火库决断，土性厚重。",tr:["沉稳厚重","决断果敢","杀伐果断","意志坚定","权威感强"],ca:"高层管理、政治、法律",rl:"过于强势，需学会退让",he:"脾胃消化系统"}};
  var tk=kg.n==="庚辰"?"gc":kg.n==="壬辰"?"rc":kg.n==="庚戌"?"gx":"wx";
  var tp=TXT[tk];
  var sx=ob.sex===1?"male":"female";
  var gn=sx==="male"?"男命魁罡主刚毅果断，有领导才能，事业有成。需注意避免强势引发人际冲突。":"女命魁罡心性刚强，在婚姻中易显强势。古书有「女带魁罡家败人散」之说，实质是提醒以柔克刚。";
  var det=kg.n+"日入魁罡格。"+(stacked?pos.length+"柱叠逢，贵气叠加。":"")+sw.explanation+"。"+(tb.details.length>0?"忌讳："+tb.details.join("；")+"。":"无财官刑煞忌讳。");
  var tw=(tb.hasWealth?"魁罡忌财，慎防破财 ":"")+(tb.hasOfficer?"魁罡忌官，慎防官非":"");
  if(!tw.trim())tw="";
  var dyk=[];
  if(ob._sz&&ob._sz.dyn&&ob._sz.dyn.length>0){
    var qn=ob._sz.qnian||1, fwd=_dayunDirection(ob);
    for(var di2=0;di2<ob._sz.dyn.length;di2++){
      var sY=parseInt(ob._sz.dyn[di2],10);if(isNaN(sY))continue;
      var dyIdx=_dayunGzIdx(mIdx, di2, fwd);
      var dgz=STEMS2[dyIdx%10]+BRANCHES2[dyIdx%12], as=qn+di2*10, ae=as+9;
      if(KG[dyIdx]){dyk.push({gz:dgz,branch:ZHI[dyIdx%12],age:as+"-"+ae+"岁",isExact:true,desc:"大运正逢魁罡，此十年主权势变动"});}
      else{var dz=dyIdx%12;if(dz===4||dz===10){dyk.push({gz:dgz,branch:ZHI[dz],age:as+"-"+ae+"岁",isExact:false,desc:"运逢辰/戌魁罡之位，有权力变动之象"});}}
    }
  }
  return {hasShensha:true,type:kg.t,dayPillar:kg.n,
    overlap:{count:pos.length,positions:pos,isStacked:stacked},
    evaluation:{level:lv,grade:gd,description:ds}, taboo:tb, shenWang:sw,
    personality:{traits:tp.tr,career:tp.ca,relationship:tp.rl,health:tp.he},
    interpretation:{summary:tp.sm,detail:det,suggestion:sx==="male"?"修身养性，刚柔并济，方能长久":"学会以柔克刚，婚姻中多一份包容与理解",genderNote:gn,tabooWarning:tw},
    dayun:dyk};
}

function getNayinForGZ2(stem, branch) {
	return getNaYinForGZ2(stem + branch);
}

function getStemWuxing2(stem) { return WUXING_STEM2[STEMS2.indexOf(stem)] || ''; }
function getBranchWuxing2(branch) { return WUXING_BRANCH2[branch] || ''; }

function getXunKongBranches2(stem, branch) {
    var si = STEMS2.indexOf(stem);
    var bi = BRANCHES2.indexOf(branch);
    var jiaBranch = (bi - si + 12) % 12;
    return [BRANCHES2[(jiaBranch + 10) % 12], BRANCHES2[(jiaBranch + 11) % 12]];
}

function shaDir2(branchVal) {
    if (branchVal === 2 || branchVal === 6 || branchVal === 10) return '北';
    if (branchVal === 8 || branchVal === 0 || branchVal === 4) return '南';
    if (branchVal === 11 || branchVal === 3 || branchVal === 7) return '西';
    if (branchVal === 5 || branchVal === 9 || branchVal === 1) return '东';
    return '';
}

function getCangGan2(branch) { return CANG_GAN_OBJ2[branch] || []; }

function getWangXiang2(monthBranch) {
    var season = BRANCH_WX2[monthBranch] || '土';
    var result = { '木':'', '火':'', '土':'', '金':'', '水':'' };
    var order = ['木','火','土','金','水'];
    var si = -1;
    for (var i = 0; i < 5; i++) { if (order[i] === season) { si = i; break; } }
    if (si < 0) return result;
    result[order[si]] = '旺';
    result[order[(si + 1) % 5]] = '相';
    result[order[(si + 4) % 5]] = '休';
    result[order[(si + 3) % 5]] = '囚';
    result[order[(si + 2) % 5]] = '死';
    return result;
}

function getWuxingCounts2(yearGZ, monthGZ, dayGZ, hourGZ) {
    var counts = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
    var gzs = [yearGZ, monthGZ, dayGZ, hourGZ];
    for (var i = 0; i < 4; i++) {
        var gz = gzs[i];
        if (!gz || gz.length < 2) continue;
        var sw = getStemWuxing2(gz[0]);
        var bw = getBranchWuxing2(gz[1]);
        if (sw) counts[sw] = (counts[sw] || 0) + 1;
        if (bw) counts[bw] = (counts[bw] || 0) + 1;
    }
    return counts;
}

function renderWuxingDist2(counts, wangXiangMap) {
    var order = ['木', '火', '土', '金', '水'];
    var values = [counts['木']||0, counts['火']||0, counts['土']||0, counts['金']||0, counts['水']||0];
    var total = 0;
    for (var i = 0; i < 5; i++) total += values[i];
    if (total === 0) total = 1;
    var colors = ['#2e7d32','#c62828','#e65100','#f9a825','#1565c0'];
    var wxLabels = { '旺':'旺','相':'相','休':'休','囚':'囚','死':'死' };
    var wxClass = { '旺':'wx-status-wang','相':'wx-status-xiang','休':'wx-status-xiu','囚':'wx-status-qiu','死':'wx-status-si' };
    var h = '<div class="wx-bar-wrap">';
    for (var i = 0; i < 5; i++) {
        var pct = Math.round(values[i] / total * 100);
        var status = wangXiangMap ? wangXiangMap[order[i]] : '';
        var sc = status ? wxClass[status] : '';
        h += '<div class="wx-bar-item"><span class="wx-bar-label" style="color:' + colors[i] + '">' + order[i] + '</span><div class="wx-bar-bg"><div class="wx-bar-fill" style="width:' + pct + '%;background:' + colors[i] + '"></div></div><span class="wx-bar-pct">' + values[i] + '</span>' + (status ? '<span class="wx-row-status ' + sc + '">' + wxLabels[status] + '</span>' : '') + '</div>';
    }
    h += '</div>';
    return h;
}

// ═══════════════════════════════════
//  二十八宿值日 — 《协纪辨方书》七元甲子法
//  锚点: 1996-01-28 = 一元甲子·虚宿(索引10)
// ═══════════════════════════════════
function xiuIndex2(y, m, d) {
    var anchor = Date.UTC(1996, 0, 28);
    var target = Date.UTC(y, m - 1, d);
    var daysDiff = Math.round((target - anchor) / 86400000);
    var cyclePos = ((daysDiff % 420) + 420) % 420;
    var yuanIdx = Math.floor(cyclePos / 60);
    var dayOff = cyclePos % 60;
    return (XIU_YUAN_START2[yuanIdx] + dayOff) % 28;
}

// ═══════════════════════════════════
//  时辰黄道黑道
// ═══════════════════════════════════
function getShichenHuangHei2(dayBranch) {
    var ql = QINGLONG_START2[dayBranch];
    if (!ql) return [];
    var qlIdx = BRANCHES2.indexOf(ql);
    var rows = [];
    for (var i = 0; i < 12; i++) {
        var offset = (i - qlIdx + 12) % 12;
        var god = HUANGDAO_SHEN2[offset];
        rows.push({ branch: BRANCHES2[i], god: god, koujue: HUANGDAO_KJ2[god], yellow: HUANGDAO_YELLOW2[offset], full: SHICHEN_FULL2[i] });
    }
    return rows;
}

// ═══════════════════════════════════
//  日黄道十二神 (BY12) 计算
//  青龍在月建对应的日支起，十二神顺排
// ═══════════════════════════════════
var BY12_QL_START = { '寅':'子','卯':'寅','辰':'辰','巳':'午','午':'申','未':'戌',
    '申':'子','酉':'寅','戌':'辰','亥':'午','子':'申','丑':'戌' };
var BY12_GOOD = { '青龙':true,'明堂':true,'金匮':true,'天德':true,'玉堂':true,'司命':true,
    '天刑':false,'朱雀':false,'白虎':false,'天牢':false,'玄武':false,'勾陈':false };

function getBy12God2(monthBranch, dayBranch) {
    var qlBranch = BY12_QL_START[monthBranch];
    if (!qlBranch) return null;
    var qlIdx = BRANCHES2.indexOf(qlBranch);
    var dbIdx = BRANCHES2.indexOf(dayBranch);
    if (qlIdx < 0 || dbIdx < 0) return null;
    var godIdx = (dbIdx - qlIdx + 12) % 12;
    return { name: HUANGDAO_SHEN2[godIdx], luck: BY12_GOOD[HUANGDAO_SHEN2[godIdx]] ? 1 : -1 };
}

// ═══════════════════════════════════
//  基础神煞计算 (基于 Lunar 对象内置数组)
// ═══════════════════════════════════
function getShenshaForDay2(monthBranch, dayBranch, dayStem) {
    var mbIdx = BRANCHES2.indexOf(monthBranch);
    var dbIdx = BRANCHES2.indexOf(dayBranch);
    var good = [], bad = [];
    if (mbIdx < 0 || dbIdx < 0) return { good: good, bad: bad };

    // 红鸾：HongLuan[dayBranchIdx] === monthBranchIdx + 1
    if (Lunar.HongLuan[dbIdx] === mbIdx + 1) good.push('红鸾');
    // 天喜：TianXi[dayBranchIdx] === monthBranchIdx + 1
    if (Lunar.TianXi[dbIdx] === mbIdx + 1) good.push('天喜');
    // 天乙贵人
    var tyMap = { '甲':'丑未','乙':'子申','丙':'亥酉','丁':'亥酉','戊':'丑未',
        '己':'子申','庚':'丑未','辛':'寅午','壬':'巳卯','癸':'巳卯' };
    var tyBr = tyMap[dayStem] || '';
    if (tyBr.indexOf(monthBranch) >= 0) good.push('天乙贵人');
    // 月德
    var ydMap = { '寅':'丙','卯':'甲','辰':'壬','巳':'庚','午':'丙','未':'甲',
        '申':'壬','酉':'庚','戌':'丙','亥':'甲','子':'壬','丑':'庚' };
    if (ydMap[monthBranch] === dayStem) good.push('月德');
    // 劫煞
    var seasonIdx = Math.floor((mbIdx + 10) % 12 / 3);
    if (Lunar.JieSha[seasonIdx] === dbIdx + 1) bad.push('劫煞');
    // 灾煞
    if (Lunar.ZaiSha[seasonIdx] === dbIdx + 1) bad.push('灾煞');
    // 孤辰
    if (Lunar.GuChen[mbIdx] === dbIdx + 1) bad.push('孤辰');
    // 寡宿
    if (Lunar.GuaXiu[mbIdx] === dbIdx + 1) bad.push('寡宿');

    return { good: good, bad: bad };
}

// ═══════════════════════════════════
//  特殊日判定函数
// ═══════════════════════════════════
function isWuluDay2(dayStem, dayBranch) {
    var luBranch = LU_POS2[dayStem];
    if (!luBranch || !dayBranch) return false;
    var xunKong = getXunKongBranches2(dayStem, dayBranch);
    return xunKong[0] === luBranch || xunKong[1] === luBranch;
}

/**
 * 五富日判定
 * 口诀：正五九月亥，二六十月寅，三七十一巳，四八腊月申
 * 依据：《钦定协纪辨方书》"五富者，月三合长生之位也"
 * @param {number} lunarMonth - 农历月份 (1-12)
 * @param {string} dayBranch - 日支
 * @returns {boolean}
 */
function isWufuDay2(lunarMonth, dayBranch) {
    // (lunarMonth-1) % 4 → 0=正五九(亥), 1=二六十(寅), 2=三七十一(巳), 3=四八腊(申)
    var wufuBranches = ['亥', '寅', '巳', '申'];
    return wufuBranches[(lunarMonth - 1) % 4] === dayBranch;
}

/**
 * 杨公忌日 — 查表法
 * 依据：《协纪辨方书》卷三十六·辩伪·杨公忌
 * "正月十三、二月十一以至七月初一、二十九，而终于十二月十九，凡十三日"
 * @param {number} lunarMonth - 农历月份 (1-12)
 * @param {number} lunarDay   - 农历日 (1-30)
 * @returns {object|null}
 */
function isYanggongJiDay2(lunarMonth, lunarDay) {
  var DAYS = [
    { month: 1, day: 13, label: '正月十三' },
    { month: 2, day: 11, label: '二月十一' },
    { month: 3, day: 9,  label: '三月初九' },
    { month: 4, day: 7,  label: '四月初七' },
    { month: 5, day: 5,  label: '五月初五' },
    { month: 6, day: 3,  label: '六月初三' },
    { month: 7, day: 1,  label: '七月初一' },
    { month: 7, day: 29, label: '七月二十九' },
    { month: 8, day: 27, label: '八月二十七' },
    { month: 9, day: 25, label: '九月二十五' },
    { month: 10, day: 23, label: '十月二十三' },
    { month: 11, day: 21, label: '十一月二十一' },
    { month: 12, day: 19, label: '十二月十九' }
  ];
  for (var i = 0; i < DAYS.length; i++) {
    if (DAYS[i].month === lunarMonth && DAYS[i].day === lunarDay) {
      return {
        sequence: i + 1,
        label: DAYS[i].label,
        lunarDate: DAYS[i].label,
        warning: '杨公忌日，大事勿用',
        meaning: '世传唐代杨筠松所定，忌出行举事',
        source: '《协纪辨方书》卷三十六·辩伪·杨公忌'
      };
    }
  }
  return null;
}

/**
 * 四离四绝日 — 年缓存
 * 四离：春分/夏至/秋分/冬至前一天（阴阳分离）
 * 四绝：立春/立夏/立秋/立冬前一天（五行断档）
 * 依据：《钦定协纪辨方书》引《玉门经》（唐）
 */
var _siLiSiJueCache = {};
var _SI_LI_SI_JUE_TERMS = [
  { term: '立春', name: '水绝', type: '绝', wuxing: '水', reason: '立春木旺水绝' },
  { term: '春分', name: '木离', type: '离', wuxing: '木' },
  { term: '立夏', name: '木绝', type: '绝', wuxing: '木', reason: '立夏火旺木绝' },
  { term: '夏至', name: '火离', type: '离', wuxing: '火' },
  { term: '立秋', name: '土绝', type: '绝', wuxing: '土', reason: '立秋金旺土绝' },
  { term: '秋分', name: '金离', type: '离', wuxing: '金' },
  { term: '立冬', name: '金绝', type: '绝', wuxing: '金', reason: '立冬水旺金绝' },
  { term: '冬至', name: '水离', type: '离', wuxing: '水' }
];
// 各节气对应的公历月份范围（主查月, 备用月）
var _TERM_APPROX_MONTHS = {
  '立春': [2, 1], '春分': [3, 2], '立夏': [5, 4], '夏至': [6, 5],
  '立秋': [8, 7], '秋分': [9, 8], '立冬': [11, 10], '冬至': [12, 11]
};

function _ensureSiLiSiJueCache(year) {
  if (_siLiSiJueCache[year]) return;
  var result = {}; // "M-D" → { name, type, wuxing, solarTerm, description, reason }
  for (var t = 0; t < _SI_LI_SI_JUE_TERMS.length; t++) {
    var kt = _SI_LI_SI_JUE_TERMS[t];
    var months = _TERM_APPROX_MONTHS[kt.term];
    var found = false;
    for (var mi = 0; mi < months.length && !found; mi++) {
      Lunar.calc2(year, months[mi], 1);
      var lun = Lunar.lun;
      for (var i = 0; i < lun.dn; i++) {
        var ob = lun[i];
        var jq = ob.jqmc || '';
        if (jq === kt.term) {
          // 节气所在日的前一天 = 四离/四绝日
          var prevDate = new Date(year, months[mi] - 1, ob.d - 1);
          var key = (prevDate.getMonth() + 1) + '-' + prevDate.getDate();
          result[key] = {
            name: kt.name,
            type: kt.type,
            wuxing: kt.wuxing,
            solarTerm: kt.term,
            description: kt.term + '前一日',
            reason: kt.reason || ''
          };
          found = true;
          break;
        }
      }
    }
  }
  _siLiSiJueCache[year] = result;
}

function isSiLiSiJue2(y, m, d) {
  _ensureSiLiSiJueCache(y);
  var key = m + '-' + d;
  return _siLiSiJueCache[y] ? (_siLiSiJueCache[y][key] || null) : null;
}

// ═══════════════════════════════════
//  倒家杀判定 (年倒家杀 + 月倒家杀)
// ═══════════════════════════════════
var DAOJIA_YEAR2 = { '甲':'庚午','己':'庚午', '乙':'甲申','庚':'甲申', '丙':'戊戌','辛':'戊戌', '丁':'壬子','壬':'壬子', '戊':'甲寅','癸':'甲寅' };
var DAOJIA_MONTH2 = {
    1: ['壬寅'], 2: ['壬午'], 3: ['庚寅','庚申'], 4: ['辛未'], 5: ['乙亥'], 6: ['辛卯'],
    7: ['壬寅'], 8: ['壬午'], 9: ['庚寅','庚申'], 10: ['辛未'], 11: ['乙亥'], 12: ['辛卯']
};

function isDaojiaYearDay2(yearStem, dayGZ) {
    if (!yearStem || !dayGZ) return false;
    var yDj = DAOJIA_YEAR2[yearStem];
    return !!(yDj && dayGZ[1] === yDj[1]);
}

function isDaojiaMonthDay2(lunarMonth, dayGZ) {
    if (!lunarMonth || !dayGZ) return false;
    var lm = lunarMonth;
    if (lm < 0) lm = -lm;
    if (lm > 12) lm = ((lm - 1) % 12) + 1;
    var mDj = DAOJIA_MONTH2[lm];
    if (!mDj) return false;
    for (var i = 0; i < mDj.length; i++) {
        if (mDj[i] === dayGZ) return true;
    }
    return false;
}

function isHongSha2(monthBranch, dayBranch) {
    var meng = { '寅':true, '巳':true, '申':true, '亥':true };
    var zhong = { '卯':true, '午':true, '酉':true, '子':true };
    var ji = { '辰':true, '未':true, '戌':true, '丑':true };
    if (meng[monthBranch] && dayBranch === '酉') return true;
    if (zhong[monthBranch] && dayBranch === '巳') return true;
    if (ji[monthBranch] && dayBranch === '丑') return true;
    return false;
}

function isJinShenQiSha2(xiuIdx) {
  return JINSHENQISHA_XIU[xiuIdx] === 1;
}

function isMiemenDay2(lunarMonth, dayBranch) {
    var branches = MIEMEN_MAP2[normLunarMonth2(lunarMonth)];
    if (!branches) return false;
    return branches[0] === dayBranch || branches[1] === dayBranch;
}

function isShousiDay2(lunarMonth, dayBranch) {
    return SHOUSI_MAP2[normLunarMonth2(lunarMonth)] === dayBranch;
}

function isSansangDay2(lunarMonth, dayBranch) {
    var lm = normLunarMonth2(lunarMonth);
    if (lm >= 1 && lm <= 3) return dayBranch === '辰';
    if (lm >= 4 && lm <= 6) return dayBranch === '未';
    if (lm >= 7 && lm <= 9) return dayBranch === '戌';
    if (lm >= 10 && lm <= 12) return dayBranch === '丑';
    return false;
}

// ══════ 天德/月德/天赦 ══════
var _TIANDE_MAP  = { '寅':'丁','卯':'申','辰':'壬','巳':'辛','午':'亥','未':'甲','申':'癸','酉':'寅','戌':'丙','亥':'乙','子':'巳','丑':'庚' };
var _YUEDE_MAP   = { '寅':'丙','卯':'甲','辰':'壬','巳':'庚','午':'丙','未':'甲','申':'壬','酉':'庚','戌':'丙','亥':'甲','子':'壬','丑':'庚' };
var _TIANSHE_MAP = { '寅':'戊寅','卯':'戊寅','辰':'戊寅','巳':'甲午','午':'甲午','未':'甲午','申':'戊申','酉':'戊申','戌':'戊申','亥':'甲子','子':'甲子','丑':'甲子' };

function isTiandeDay2(monthBranch, dayStem, dayBranch) {
  var td = _TIANDE_MAP[monthBranch];
  if (!td) return false;
  return (td.length === 1) ? (td === dayStem) : (td === dayBranch);
}
function isYuedeDay2(monthBranch, dayStem) {
  return _YUEDE_MAP[monthBranch] === dayStem;
}
function isTiansheDay2(monthBranch, dayGZ) {
  return _TIANSHE_MAP[monthBranch] === dayGZ;
}

function isChongsangDay2(lunarMonth, dayStem) {
    return CHONGSANG_MAP2[normLunarMonth2(lunarMonth)] === dayStem;
}

function isHengtianDay2(lunarDay) { return HENGTIAN_DAYS2[lunarDay] || false; }

function isDashaDay2(dayGZ) {
    var idx = getGZIdx2(dayGZ);
    if (idx === -1) return false;
    var xun = Math.floor(idx / 10);
    var k = idx % 10;
    var target = DASHA_XUN2[xun];
    if (target === undefined) return false;
    if (typeof target === 'number') return k === target;
    return target[0] === k || target[1] === k;
}

function isLeitingDay2(monthStem, dayGZ) {
    var s = LEITING_MAP2[monthStem];
    return s ? (s[dayGZ] || false) : false;
}

function getKongwangResult2(yearBranch, lunarMonth, lunarDay) {
    function _getGongIdx(branch) {
        for (var i = 0; i < 8; i++) {
            for (var j = 0; j < GONG_DZ2[i].length; j++) {
                if (GONG_DZ2[i][j] === branch) return i;
            }
        }
        return -1;
    }
    var gi = _getGongIdx(yearBranch);
    if (gi === -1) return '';
    var dayGi = (gi + normLunarMonth2(lunarMonth) + lunarDay - 2) % 8;
    if (dayGi === 4) return '天空';
    if (dayGi === 0) return '地空';
    return '';
}

function getBingXiaoWaJie2(yearBranch, lunarMonth, lunarDay) {
    var yi = BRANCHES2.indexOf(yearBranch);
    if (yi < 0) return null;
    var lm = normLunarMonth2(lunarMonth);
    var monthStartIdx = (yi + lm - 1) % 12;
    var dayIdx = (monthStartIdx + lunarDay - 1) % 12;
    var dayBr = BRANCHES2[dayIdx];
    if (dayBr === '子') return '冰消';
    if (dayBr === '午') return '瓦解';
    return null;
}

// ═══════════════════════════════════
//  三伏天 — 夏至三庚入伏，立秋一庚末伏
//  使用 d0 = int2(JD.toJD()) - J2000 + 标准化日数
// ═══════════════════════════════════
var _sanfuCache2 = {};
function getSanfuPeriods2(year) {
    if (_sanfuCache2[year]) return _sanfuCache2[year];
    // 扫描 6月15日 到 8月25日 之间所有庚日
    var gengDays = [];
    JD.Y = year; JD.M = 6; JD.D = 15; JD.h = 12; JD.m = 0; JD.s = 0;
    var startJD = int2(JD.toJD() + 0.5);
    JD.Y = year; JD.M = 8; JD.D = 25; JD.h = 12; JD.m = 0; JD.s = 0;
    var endJD = int2(JD.toJD() + 0.5);
    for (var jdN = startJD; jdN <= endJD; jdN++) {
        var d0 = jdN - 2451545;
        var D = (d0 - 6 + 9000000) % 60;
        if (D % 10 === 6) { // 庚
            var r = JD.DD(jdN - 0.5, {});
            gengDays.push({m: r.M, d: r.D});
        }
    }
    if (gengDays.length < 4) { _sanfuCache2[year] = null; return null; }
    // 夏至约6月21日，立秋约8月7日
    JD.Y = year; JD.M = 6; JD.D = 21; JD.h = 12; JD.m = 0; JD.s = 0;
    var xzN = int2(JD.toJD() + 0.5);
    JD.Y = year; JD.M = 8; JD.D = 7; JD.h = 12; JD.m = 0; JD.s = 0;
    var lqN = int2(JD.toJD() + 0.5);
    // 夏至后第一个庚日
    var firstIdx = -1;
    for (var i = 0; i < gengDays.length; i++) {
        JD.Y = year; JD.M = gengDays[i].m; JD.D = gengDays[i].d; JD.h = 12; JD.m = 0; JD.s = 0;
        if (int2(JD.toJD() + 0.5) >= xzN) { firstIdx = i; break; }
    }
    if (firstIdx < 0 || firstIdx + 3 >= gengDays.length) { _sanfuCache2[year] = null; return null; }
    // 末伏：立秋后第一个庚日
    var mofuIdx = -1;
    for (var i = 0; i < gengDays.length; i++) {
        JD.Y = year; JD.M = gengDays[i].m; JD.D = gengDays[i].d; JD.h = 12; JD.m = 0; JD.s = 0;
        if (int2(JD.toJD() + 0.5) >= lqN) { mofuIdx = i; break; }
    }
    if (mofuIdx < 0) mofuIdx = gengDays.length - 1;
    var result = {
        chufu: gengDays[firstIdx + 2],    // 夏至后第3个庚日
        zhongfu: gengDays[firstIdx + 3],  // 夏至后第4个庚日
        mofu: gengDays[mofuIdx]
    };
    _sanfuCache2[year] = result;
    return result;
}

function getSanfuInfo2(y, m, d) {
    var periods = getSanfuPeriods2(y);
    if (!periods) return null;
    // 使用儒略日计算精确天数
    JD.Y = y; JD.M = m; JD.D = d; JD.h = 12; JD.m = 0; JD.s = 0;
    var checkJD = int2(JD.toJD() + 0.5);
    JD.Y = y; JD.M = periods.chufu.m; JD.D = periods.chufu.d;
    var cfJD = int2(JD.toJD() + 0.5);
    JD.Y = y; JD.M = periods.zhongfu.m; JD.D = periods.zhongfu.d;
    var zfJD = int2(JD.toJD() + 0.5);
    JD.Y = y; JD.M = periods.mofu.m; JD.D = periods.mofu.d;
    var mfJD = int2(JD.toJD() + 0.5);
    if (checkJD >= cfJD && checkJD < zfJD) return { period: '初伏', day: checkJD - cfJD + 1 };
    if (checkJD >= zfJD && checkJD < mfJD) return { period: '中伏', day: checkJD - zfJD + 1 };
    if (checkJD >= mfJD && checkJD < mfJD + 10) return { period: '末伏', day: checkJD - mfJD + 1 };
    return null;
}

// ═══════════════════════════════════
//  详情全局状态变量
// ═══════════════════════════════════
var _barY = 2026, _barM = 5, _barD = 18, _barH = 12, _barMin = 0;
var _currentMonthDays = null;
var _shichenTimer = null;
var _nianliMode = 0;
  var y0 = typeof Cal_y !== 'undefined' ? get_year_screen(Cal_y.value) : new Date().getFullYear();
  var m0 = typeof Cal_m !== 'undefined' ? (Cal_m.value - 0) : (new Date().getMonth() + 1);
var _lastShichenIdx = -1;

// ═══════════════════════════════════
//  日期详情数据计算 (从 Lunar.lun 桥接)
// ═══════════════════════════════════
var _dayCache = {};
var _dayCacheKeys = [];
var _DAY_CACHE_MAX = 200;

function computeDayFromLunar(y, m, d) {
    var key = y + '-' + m + '-' + d;
    if (_dayCache[key]) return _dayCache[key];

    // 确保四离四绝日年缓存已构建（必须在 Lunar.calc2 之前，因为缓存函数会调用 calc2）
    _ensureSiLiSiJueCache(y);

    Lunar.calc2(y, m, 1);
    var lun = Lunar.lun;

    var idx = d - 1;
    if (idx < 0 || idx >= lun.dn) {
        console.error('[computeDayFromLunar] day ' + d + ' out of range [1,' + lun.dn + '], returning null');
        return null;
    }

    var ob = lun[idx];
    var dayGZ = ob.Lday2 || '';
    if (!dayGZ) { console.error('[computeDayFromLunar] empty dayGZ at index ' + idx + ', returning null'); return null; }

    var stem = dayGZ[0];
    var branch = dayGZ[1];
    var brIdx = BRANCHES2.indexOf(branch);

    // 月干支
    var monthGZ = ob.Lmonth2 || '';
    var monthBranch = monthGZ.length > 1 ? monthGZ[1] : '';
    var monthStem = monthGZ.length > 1 ? monthGZ[0] : '';

    // 年干支
    var yearGZ = ob.Lyear2 || lun.Ly || '';  // Lyear2以立春为界
    var yearBranch = yearGZ.length > 1 ? yearGZ[1] : '';

    // 农历月日 — ob.Lmc 来自 Lunar.ymc(短名), ob.Ldc 来自 Lunar.rmc
    var lunarMonth = ob.Lmc || '';
    var ymcIdx = Lunar.ymc.indexOf(ob.Lmc);
    var lunarMonthNum = ymcIdx >= 0 ? (ymcIdx + 10) % 12 + 1 : 1;
    var lunarDayNum = Lunar.rmc.indexOf(ob.Ldc);
    if (lunarDayNum < 0) lunarDayNum = 0;
    lunarDayNum += 1;

    // 建除
    var mbIdx = BRANCHES2.indexOf(monthBranch);
    var jianchuIdx = (brIdx - mbIdx + 12) % 12;
    var jianchuName = DUTY12_ORDER2[jianchuIdx];

    // 黄道十二神
    var by12 = getBy12God2(monthBranch, branch);

    // 神煞 — 优先使用 lunisolar theGods 插件, 回退到本地简化实现
    var shensha;
    if (window._lsrGetGods) {
        var lsrGods = window._lsrGetGods(y, m, d);
        if (lsrGods) { shensha = lsrGods; }
    }
    if (!shensha) { shensha = getShenshaForDay2(monthBranch, branch, stem); }

    // 九星
    var jqMonth = ((mbIdx - 2 + 12) % 12) + 1;
    var nineStar = getNineStar2(dayGZ, jqMonth);

    // 二十八宿
    var xi = xiuIndex2(y, m, d);

    // 纳音
    var dayNaYin = getNaYinForGZ2(dayGZ);
    var monthNaYin = getNaYinForGZ2(monthGZ);
    var yearNaYin = getNaYinForGZ2(yearGZ);

    // 时柱 (午时)
    var hgzNoon = getHourGZ2(stem, 12);
    var hourNaYin = getNaYinForGZ2(hgzNoon.gz);

    // 冲煞
    var conflictBr = (brIdx + 6) % 12;
    var chong = BRANCH_ANIMALS2[conflictBr];
    var sha = shaDir2(brIdx);

    // 彭祖百忌
    var pengzu = '';
    for (var i = 0; i < PZ_GAN.length; i++) {
        if (PZ_GAN[i][0] === stem) pengzu += PZ_GAN[i][0] + PZ_GAN[i][1];
    }
    for (var i = 0; i < PZ_ZHI.length; i++) {
        if (PZ_ZHI[i][0] === branch) pengzu += (pengzu ? ' ' : '') + PZ_ZHI[i][0] + PZ_ZHI[i][1];
    }

    var data = {
        gongliYear: y, // 公历年份（用于日课详情格式化）
        lunarYear: yearGZ,
        lunarMonth: lunarMonthNum,
        isLeap: !!ob.Lleap,
        lunarDay: lunarDayNum,
        lunarDaysInMonth: ob.Ldn || 30,
        lunarMonthName: lunarMonth,
        lunarDayName: ob.Ldc || '',
        dayGZ: dayGZ, stem: stem, branch: branch,
        stemWX: getStemWuxing2(stem),
        branchWX: getBranchWuxing2(branch),
        dayNaYin: dayNaYin,
        monthGZ: monthGZ,
        monthNaYin: monthNaYin,
        yearGZ: yearGZ,
        yearNaYin: yearNaYin,
        hourGZ: hgzNoon.gz,
        hourNaYin: hourNaYin,
        hourShichen: hgzNoon.shichen,
        jianchu: jianchuName,
        goodGods: shensha.good,
        badGods: shensha.bad,
        by12Name: by12 ? by12.name : '——',
        by12Luck: by12 ? by12.luck : 0,
        chong: chong,
        sha: sha,
        pengzu: pengzu,
        solarTerm: ob.Ljq || ob.jqmc || '',
        xiu: XIU[xi],
        xiuAnimal: XIU_ANIMAL[xi],
        xiuFull: XIU[xi] + '宿' + XIU_ANIMAL[xi],
        nineStar: nineStar,
        duty12Name: jianchuName,
        duty12Good: DUTY12_GOOD2[jianchuName] || false,
        wulu: isWuluDay2(stem, branch),
        daojia: isDaojiaYearDay2(yearGZ[0], dayGZ) || isDaojiaMonthDay2(lunarMonthNum, dayGZ),
        daojiaYear: isDaojiaYearDay2(yearGZ[0], dayGZ),
        daojiaMonth: isDaojiaMonthDay2(lunarMonthNum, dayGZ),
        hongsha: isHongSha2(monthBranch, branch),
        jinshenqisha: isJinShenQiSha2(xi),
        miemen: isMiemenDay2(lunarMonthNum, branch),
        shousi: isShousiDay2(lunarMonthNum, branch),
        bingxiao: getBingXiaoWaJie2(yearBranch, lunarMonthNum, lunarDayNum),
        sansang: isSansangDay2(lunarMonthNum, branch),
        chongsang: isChongsangDay2(lunarMonthNum, stem),
        hengtian: isHengtianDay2(lunarDayNum),
        dasha: isDashaDay2(dayGZ),
        leiting: isLeitingDay2(monthStem, dayGZ),
        kongwang: getKongwangResult2(yearBranch, lunarMonthNum, lunarDayNum),
        sanfu: getSanfuInfo2(y, m, d),
        wufu: isWufuDay2(lunarMonthNum, branch),
    yanggongJi: isYanggongJiDay2(lunarMonthNum, lunarDayNum),
        silisiJue: isSiLiSiJue2(y, m, d),
        tiande: isTiandeDay2(monthBranch, stem, branch),
        yuede: isYuedeDay2(monthBranch, stem),
        tianshe: isTiansheDay2(monthBranch, dayGZ)
    };

    // LRU 缓存
    _dayCache[key] = data;
    _dayCacheKeys.push(key);
    while (_dayCacheKeys.length > _DAY_CACHE_MAX) {
        var oldKey = _dayCacheKeys.shift();
        delete _dayCache[oldKey];
    }
    return data;
}

function precomputeMonthDays2(y, m) {
    Lunar.calc2(y, m, 1);
    var lun = Lunar.lun;
    var data = {};
    for (var i = 0; i < lun.dn; i++) {
        var ob = lun[i];
        var d = ob.d;
        var gz = ob.Lday2 || '';
        var lr = ob.Ldc || '';
        var isM = '';
        if (ob.Ljq) lr = ob.Ljq;
        else if (ob.A) lr = strTu(ob.A, 3);
        else if (ob.B) lr = strTu(ob.B, 3);
        else if (ob.Ldc === '初一') lr = (ob.Lleap || '') + ob.Lmc + '月' + (ob.Ldn === 30 ? '大' : '小');
        if (ob.yxmc === '朔' || ob.yxmc === '望') isM = ob.yxmc;

        var stem = gz[0];
        var branch = gz[1];
        var monthGZ = ob.Lmonth2 || '';
        var monthBranch = monthGZ.length > 1 ? monthGZ[1] : '';
        var monthStem = monthGZ.length > 1 ? monthGZ[0] : '';
        var yearGZ = ob.Lyear2 || lun.Ly || '';  // Lyear2以立春为界

        var mbIdx = BRANCHES2.indexOf(monthBranch);
        var brIdx = BRANCHES2.indexOf(branch);
        var jcIdx = (brIdx - mbIdx + 12) % 12;
        var jqMonth = ((mbIdx - 2 + 12) % 12) + 1;

        data[d] = {
            gz: gz, lr: lr, isM: isM,
            xiu: XIU[xiuIndex2(y, m, d)],
            solarTerm: ob.Ljq || ob.jqmc || '',
            lm: ob.Lmc || '',
            ld: d,
            isLeap: !!ob.Lleap,
            ldim: ob.Ldn || 30,
            nineStar: getNineStar2(gz, jqMonth),
            jianchu: DUTY12_ORDER2[jcIdx],
            wulu: isWuluDay2(stem, branch),
            hongsha: isHongSha2(monthBranch, branch),
            jinshenqisha: isJinShenQiSha2(xiuIndex2(y, m, d)),
            miemen: isMiemenDay2(ob.Lmc ? (CMON.indexOf(ob.Lmc.replace('闰','')) + 1 || 1) : 1, branch),
            shousi: isShousiDay2(ob.Lmc ? (CMON.indexOf(ob.Lmc.replace('闰','')) + 1 || 1) : 1, branch),
            bingxiao: getBingXiaoWaJie2(yearGZ[1], ob.Lmc ? (CMON.indexOf(ob.Lmc.replace('闰','')) + 1 || 1) : 1, d),
            sansang: isSansangDay2(ob.Lmc ? (CMON.indexOf(ob.Lmc.replace('闰','')) + 1 || 1) : 1, branch),
            chongsang: isChongsangDay2(ob.Lmc ? (CMON.indexOf(ob.Lmc.replace('闰','')) + 1 || 1) : 1, stem),
            hengtian: isHengtianDay2(d),
            dasha: isDashaDay2(gz),
            leiting: isLeitingDay2(monthStem, gz),
            kongwang: getKongwangResult2(yearGZ[1], ob.Lmc ? (CMON.indexOf(ob.Lmc.replace('闰','')) + 1 || 1) : 1, d),
            sanfu: getSanfuInfo2(y, m, d)
        };
    }
    return data;
}
module.exports = {
  STEMS2,
  BRANCHES2,
  XIU,
  XIU_ANIMAL,
  XIU_KOUJUE,
  WUXING_STEM2,
  WUXING_BRANCH2,
  BRANCH_WX2,
  PZ_GAN,
  PZ_ZHI,
  NAYIN2,
  ZODIAC_ANIMALS2,
  BRANCH_ANIMALS2,
  ZODIAC_ICONS2,
  SHICHEN2,
  SHICHEN_FULL2,
  DUTY12_ORDER2,
  DUTY12_GOOD2,
  DUTY12_MEANING2,
  NINE_STAR_ORDER2,
  NINE_STARS2,
  GZ_60_ORDER2,
  XIU_YUAN_START2,
  STEM_YANG2,
  LU_POS2,
  HUANGDAO_SHEN2,
  HUANGDAO_YELLOW2,
  HUANGDAO_KJ2,
  QINGLONG_START2,
  CANG_GAN_OBJ2,
  JINSHENQISHA_XIU,
  MIEMEN_MAP2,
  SHOUSI_MAP2,
  CHONGSANG_MAP2,
  HENGTIAN_DAYS2,
  DASHA_XUN2,
  LEITING_MAP2,
  GONG_DZ2,
  getYearZodiac2,
  normLunarMonth2,
  getGZIdx2,
  getSeasonType2,
  getNineStar2,
  getShichen2,
  getHourGZ2,
  getNaYinForGZ2,
  getNayinForGZ2,
  getStemWuxing2,
  getBranchWuxing2,
  getXunKongBranches2,
  shaDir2,
  getCangGan2,
  getWangXiang2,
  getWuxingCounts2,
  renderWuxingDist2,
  xiuIndex2,
  getShichenHuangHei2,
  BY12_QL_START,
  BY12_GOOD,
  getBy12God2,
  getShenshaForDay2,
  isWuluDay2,
  DAOJIA_YEAR2,
  DAOJIA_MONTH2,
  isDaojiaYearDay2,
  isDaojiaMonthDay2,
  isWufuDay2,
  isYanggongJiDay2,
  isSiLiSiJue2,
  isTiandeDay2,
  isYuedeDay2,
  isTiansheDay2,
  computeTianLuoDiWang,
  computeKuiGang,
  isHongSha2,
  isJinShenQiSha2,
  isMiemenDay2,
  isShousiDay2,
  isSansangDay2,
  isChongsangDay2,
  isHengtianDay2,
  isDashaDay2,
  isLeitingDay2,
  getKongwangResult2,
  getBingXiaoWaJie2,
  getSanfuPeriods2,
  getSanfuInfo2,
  computeDayFromLunar,
  precomputeMonthDays2
};
