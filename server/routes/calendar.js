// server/routes/calendar.js — 日历 API
'use strict';

var { Router } = require('express');
var core = require('gongxin-core');
var Lunar = core.Lunar, JD = core.JD;
var computeDayFromLunar = core.computeDayFromLunar;

// lunisolar 神煞引擎
var lunisolar = require('lunisolar');
var theGodsPlugin = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGodsPlugin.theGods);

// 协纪辨方书·卷六 正确「月支→日支」数组，用于覆盖 lunisolar theGods 插件对
// 圣心/益后/续世 的 3 处数值 bug：
//   安装版 dist 中三者存在月支索引错位（圣心 卯酉互换、益后 辰戌互换、
//   续世 子丑/未申 两组互换），且续世违背考原「续世常在益后后一辰」的规则。
// 以下为协纪权威正确值（数组下标 = 月支序号 0-11 子→亥，值 = 日支序号）：
var ZHI_ARR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var SHENGXIN_REF = [4,10,11,5,0,6,1,7,2,8,3,9]; // 圣心
var YIHOU_REF    = [5,11,0,6,1,7,2,8,3,9,4,10]; // 益后
var XUSHI_REF    = [6,0,1,7,2,8,3,9,4,10,5,11]; // 续世（= 益后 + 1，考原）

// ════════════════════════════════════════════════════════════════════════
// Phase 2.2 — 20 个「与《协纪辨方书》存在流派/立成差异」的神煞：协纪出处 + 差异说明
// 数据全部来自本程序 Phase 2.1（server/verify_noref2.js + Phase2.1_锚定报告.md）的逐条原文锚定，
// 仅作「今日神煞」卡片的 tooltip / 流派差异标记展示，**不参与吉凶判定、不改 goodGods/badGods**。
// 键名必须与 lunisolar theGods 实际输出字符串逐字一致（繁体），已用 probe_godnames.js 校准。
// ════════════════════════════════════════════════════════════════════════
var GODS_SOURCE = {
  '九坎': {
    xiejì: '《协纪辨方书·卷五·义例三》',
    def: '火月(寅午戌)逆行辰夘寅、木月(亥卯未)逆行丑子亥、水月(申子辰)逆行戌酉申、金月(巳酉丑)逆行未午巳（每月一支）',
    diff: 'lunisolar 每月按四季逆推多列支（多报），协纪为单支；核心支为协纪正确子集',
    isDiff: true
  },
  '了戾': {
    xiejì: '《协纪辨方书·卷四·义例二》',
    def: '三月(辰)丙申、四月(巳)丁未、九月(戌)壬寅、十月(亥)癸丑',
    diff: '阴阳建家族月支偏移：lunisolar 触发日支与协纪不同',
    isDiff: true
  },
  '地囊': {
    xiejì: '《协纪辨方书·卷五·立成》',
    def: '按月支序列：正庚子庚午、二癸未癸丑、三甲子甲寅、四己卯己丑、五戊辰戊午、六癸未癸巳、七丙寅丙申、八丁卯丁巳、九戊辰戊子、十庚戌庚子、十一辛未辛酉、十二乙酉乙未',
    diff: 'lunisolar 三合卦纳甲实作与协纪立成不同',
    isDiff: true
  },
  '地火': {
    xiejì: '《协纪辨方书·卷四·义例二》',
    def: '月厌所临之辰（月厌=阴建，子建→戌厌、丑→酉…）；即月厌别名',
    diff: 'lunisolar 地火整套定义与协纪（=月厌）不同，差分近对半',
    isDiff: true
  },
  '大會': {
    xiejì: '《协纪辨方书·卷四·立成》',
    def: '阴阳大会单会日：寅甲戌、卯乙酉、午丙午、未丁巳、申庚辰、酉辛卯、子壬子、丑癸亥（每月一位）',
    diff: 'lunisolar 所领会日区间与协纪单会日不同',
    isDiff: true
  },
  '孤辰': {
    xiejì: '《协纪辨方书·卷四·义例二》',
    def: '三月(辰)戊申庚申壬申、四月(巳)己未辛未癸未、九月(戌)甲寅丙寅戊寅、十月(亥)乙丑丁丑己丑',
    diff: '阴阳建家族月支偏移：lunisolar 触发日支与协纪不同',
    isDiff: true
  },
  '孤陽': {
    xiejì: '《协纪辨方书·卷四·义例二》',
    def: '九月(戌)戊戌',
    diff: 'lunisolar 多报（实际为 4/0，协纪仅戊戌一日）',
    isDiff: true
  },
  '專日': {
    xiejì: '《协纪辨方书·卷四/卷九·立成》',
    def: '宝义制专伐异派固定表：戊辰己丑戊戌丙午壬子甲寅乙卯丁巳己未庚申辛酉癸亥',
    diff: '宝义制/专伐/异派固定表各版本有异；lunisolar 采用版本与协纪立成不同',
    isDiff: true
  },
  '小會': {
    xiejì: '《协纪辨方书·卷四·立成》',
    def: '阴阳小会单会日：卯己酉、辰戊辰、巳己巳、午戊午、酉己卯、戌戊戌、亥己亥、子戊子（每月一位）',
    diff: 'lunisolar 所领会日区间与协纪单会日不同',
    isDiff: true
  },
  '氣往亡': {
    xiejì: '《协纪辨方书·卷五·义例三》',
    def: '特定节气后 N 日（如立春后7、惊蛰后14、清明后21、立夏后8…依节气表）',
    diff: 'lunisolar 以农历日序为基准推算，与协纪「节气后 N 日」基准不同',
    isDiff: true
  },
  '短星': {
    xiejì: '《协纪辨方书·卷三/卷四》',
    def: '按月序日数：正21、二19、三16、四25、五25、六20、七22、八18/19、九16/17、十14、十一22、十二25',
    diff: 'lunisolar 十月取 d15，协纪取 d14（off-by-one）',
    isDiff: true
  },
  '義日': {
    xiejì: '《协纪辨方书·卷九·立成》',
    def: '义日固定表：甲子丙寅丁卯己巳辛未壬申癸酉乙亥庚辰辛丑庚戌戊午',
    diff: '宝义制流派固定表各版本有异；lunisolar 采用版本与协纪立成不同',
    isDiff: true
  },
  '行狠': {
    xiejì: '《协纪辨方书·卷四·义例二》',
    def: '三月(辰)甲申、四月(巳)乙未、九月(戌)庚寅、十月(亥)辛丑',
    diff: '阴阳建家族月支偏移：lunisolar 触发日支与协纪不同',
    isDiff: true
  },
  '陰道沖陽': {
    xiejì: '《协纪辨方书·卷四·义例二》',
    def: '二月(卯)己卯、八月(酉)己酉',
    diff: 'lunisolar 作「卯月己酉/酉月己卯」，与协纪二月己卯/八月己酉相反',
    isDiff: true
  },
  '陰錯': {
    xiejì: '《协纪辨方书·卷四·义例二》',
    def: '阴建之支配当方之干（五、十一月无）：辰庚戌、巳辛酉、午庚申、未丁未己未、申丁巳己巳、酉甲辰、戌乙卯、亥甲寅、子癸丑、丑癸亥、寅庚戌…（依阴建）',
    diff: 'lunisolar 多报（实际为 4/0，超出协纪阴错日）',
    isDiff: true
  },
  '陰陽俱錯': {
    xiejì: '《协纪辨方书·卷四·义例二》',
    def: '五月(午)丙午、十一月(子)壬子',
    diff: 'lunisolar 偏移（协纪 2 日，lunisolar 取 3 日）',
    isDiff: true
  },
  '兵吉': {
    xiejì: '《协纪辨方书·卷六·立成》',
    def: '正月子丑寅卯，逐月渐退一辰（农历月→日支集）',
    diff: 'lunisolar 兵吉日支集整体偏移协纪：如正月实得{辰巳午未}，恰为协纪九月兵吉，属运行版与协纪的立成差异',
    isDiff: true
  },
  '臨日': {
    xiejì: '《协纪辨方书·卷六·义例四》',
    def: '正月午、二月亥、三月申、四月丑、五月戌、六月夘、七月子、八月巳、九月寅、十月未、十一月辰、十二月酉（月建→单日支）',
    diff: '协纪核心支为正确子集；lunisolar 在部分月多报相关支（如寅月多「亥」）',
    isDiff: true
  },
  '天后': {
    xiejì: '《协纪辨方书·卷六·义例四》',
    def: '三合局绝处逢生（=驿马）：寅午戌→申、申子辰→寅、亥卯未→巳、巳酉丑→亥',
    diff: '协纪驿马单支为正确子集；lunisolar 同月多报其余三合驿马支',
    isDiff: true
  },
  '天吏': {
    xiejì: '《协纪辨方书·卷六/卷十》',
    def: '三合死气：寅午戌→酉、申子辰→卯、亥卯未→子、巳酉丑→午',
    diff: '协纪死气单支为正确子集；lunisolar 同月多报其余死气支',
    isDiff: true
  }
};

// ── Phase 2.2.1：14 个覆盖层神煞（程序已按《协纪辨方书》修正/对齐，isDiff=false） ──
// 这些神煞本程序的输出由 _getLsrGods 覆盖层（或 dist 9 副本 patch）强制对齐协纪，
// 故不标「流派差异」，改标「已按协纪修正」(corrected:true)。def 为协纪标准起法，note 说明修正点。
GODS_SOURCE['天德'] = {
  xiejì: '《协纪辨方书》',
  def: '月德之阳。正丁、二坤中(申)、三壬、四辛、五乾亥、六甲、七癸、八艮寅、九丙、十乙、十一巽巳、十二庚',
  corrected: true,
  note: '覆盖 lunisolar 运行版「天德 isStem 逻辑反转」bug，已对齐协纪干支神煞·天德'
};
GODS_SOURCE['天德合'] = {
  xiejì: '《协纪辨方书》',
  def: '天德之干所合（天干五合：甲己、乙庚、丙辛、丁壬、戊癸），与天德阴阳互合',
  corrected: true,
  note: '与协纪天德合一致（运行版本就正确，覆盖层确认）'
};
GODS_SOURCE['月德'] = {
  xiejì: '《协纪辨方书》',
  def: '三合局旺干之阳：寅午戌月丙、申子辰月壬、亥卯未月甲、巳酉丑月庚',
  corrected: true,
  note: '运行版已与协纪一致，覆盖层幂等确认'
};
GODS_SOURCE['月德合'] = {
  xiejì: '《协纪辨方书》',
  def: '月德所合之干（天干五合）：寅午戌月辛、申子辰月丁、亥卯未月己、巳酉丑月乙',
  corrected: true,
  note: '覆盖 lunisolar 运行版「月德合数组索引越界（午月错）」bug，已对齐协纪'
};
GODS_SOURCE['天赦'] = {
  xiejì: '《协纪辨方书》',
  def: '四时专气生万物之辰：春戊寅、夏甲午、秋戊申、冬甲子',
  corrected: true,
  note: '与协纪天赦一致（覆盖层确认）'
};
GODS_SOURCE['天恩'] = {
  xiejì: '《协纪辨方书》',
  def: '阳干支相合之日（逐月依月建干支），为施恩布德、宜覃恩肆赦之辰',
  corrected: true,
  note: '覆盖 lunisolar 运行版「天恩多报 5 日」差异，已对齐协纪'
};
GODS_SOURCE['天願'] = {
  xiejì: '《协纪辨方书》',
  def: '月建三合局之生支（生我之辰）：寅午戌月亥、申子辰月巳、亥卯未月寅、巳酉丑月申',
  corrected: true,
  note: '覆盖 lunisolar 运行版「天願采用曹震圭传写谬误版」差异，已对齐协纪'
};
GODS_SOURCE['月刑'] = {
  xiejì: '《协纪辨方书》',
  def: '月建所刑之辰（无恩/恃势/无礼之刑）：寅刑巳、巳刑申、申刑寅、丑刑戌、戌刑未、未刑丑、子刑卯、卯刑子、辰午酉亥自刑',
  corrected: true,
  note: '运行版已与协纪一致，覆盖层幂等确认'
};
GODS_SOURCE['月害'] = {
  xiejì: '《协纪辨方书》',
  def: '月建所冲之辰（六冲）：子月未、丑月午、寅月巳、卯月辰、辰月卯、巳月寅、午月丑、未月子、申月亥、酉月戌、戌月酉、亥月申',
  corrected: true,
  note: '覆盖 lunisolar 运行版「月害」差异，已对齐协纪'
};
GODS_SOURCE['重日'] = {
  xiejì: '《协纪辨方书》',
  def: '月建与日支同（建日重见）：寅月寅日、卯月卯日……阳支重见为重阳、阴支重见为重阴',
  corrected: true,
  note: '覆盖 lunisolar 运行版「重日」差异，已对齐协纪'
};
GODS_SOURCE['復日'] = {
  xiejì: '《协纪辨方书》',
  def: '月建之干与日干同（建日之干再临）：寅月甲日、卯月乙日……',
  corrected: true,
  note: '覆盖 lunisolar 运行版「復日」差异，已对齐协纪'
};
GODS_SOURCE['聖心'] = {
  xiejì: '《协纪辨方书》',
  def: '月支顺行倒序所值日支（正月子、二月亥、三月戌……十二月丑）',
  corrected: true,
  note: '覆盖 lunisolar 安装版「圣心月支索引错位（亥/子月卯↔酉互换）」bug，已对齐协纪'
};
GODS_SOURCE['益後'] = {
  xiejì: '《协纪辨方书》',
  def: '比圣心退一位（正月丑、二月子、三月亥……十二月寅）',
  corrected: true,
  note: '覆盖 lunisolar 安装版「益后月支索引错位（酉/戌月寅↔申互换）」bug，已对齐协纪'
};
GODS_SOURCE['續世'] = {
  xiejì: '《协纪辨方书》',
  def: '比益后再退（正月午、二月巳、三月辰……十二月未）',
  corrected: true,
  note: '覆盖 lunisolar 安装版「续世月支索引错位（子丑/午未两组互换+违益后+1）」bug，已对齐协纪'
};

/**
 * 构建「今日神煞」卡片所用的来源映射：仅返回当日命中的、且有协纪出处记录的神煞元数据。
 * 不参与吉凶判定，仅作 tooltip / 流派差异标记展示。
 * @param {string[]} good 吉神名数组
 * @param {string[]} bad  凶煞名数组
 * @returns {Object} { 神煞名: { xiejì, def, diff, isDiff } }
 */
function buildGodsMeta(good, bad) {
  var meta = {};
  (good || []).concat(bad || []).forEach(function(name) {
    if (GODS_SOURCE[name]) meta[name] = GODS_SOURCE[name];
  });
  return meta;
}

// ════════════════════════════════════════════════════════════════════════
// Phase 3.1 — 择日助手（选日报告）
// 给定「事项」与「月份」，基于当月每日「真实黄历宜忌(yiActs/jiActs) + 吉神/凶煞(goodGods/badGods)
// + 建除 + 小红砂/杨公忌」评分排序，给出候选吉日与理由。
// 事项→宜忌/神煞的映射为《协纪辨方书·义例》《选择宗镜》《玉匣记》通用择日通则（非本程序独创），
// 仅用于「筛选/排序/解释」，不改变 goodGods/badGods 的吉凶判定。
// 所有当日数据均为 lunisolar / 本程序真实计算值，无任何捏造。
// ════════════════════════════════════════════════════════════════════════

// 通用「诸事不宜」硬排除神煞（任何事项均忌）——黄历公认大煞（繁体，与 lunisolar 输出一致）
var CHOOSE_UNIVERSAL_BAD = ['月破', '歲破', '四離', '四絕'];

// 事项规则表。键名 = 前端 select value；label = 展示；core = 该事项核心「宜」词；
// yi = 命中即视为「黄历宜此事」的相关词（繁体）；prefer = 利此事的吉神；avoid = 利此事忌现的凶煞；
// avoidJianchu = 不利此事的建除日；ref = 出处说明。
var CHOOSE_EVENTS = {
  jiahun: {
    label: '嫁娶（结婚）',
    core: '嫁娶',
    yi: ['嫁娶', '納采', '訂盟', '結婚', '娶婦', '冠笄', '裁衣'],
    prefer: ['天德', '月德', '天喜', '三合', '六合', '不將', '天恩', '天願', '月恩'],
    avoid: ['四廢', '四窮', '四忌', '四擊', '無祿', '八專', '觸水龍', '往亡'],
    avoidJianchu: ['破', '收', '閉'],
    ref: '《协纪辨方书·义例》嫁娶宜天德、月德、天喜、三合、六合、不将；忌四废、四穷、四忌、四击、无禄、八专、触水龙、往亡，及破/收/闭日。'
  },
  ruZhai: {
    label: '移徙入宅（搬家）',
    core: '入宅',
    yi: ['入宅', '移徙', '安床', '安香'],
    prefer: ['天德', '月德', '三合', '六合', '天喜', '月恩', '天醫'],
    avoid: ['月破', '歲破', '四廢', '四窮', '往亡'],
    avoidJianchu: ['破'],
    ref: '《协纪辨方书·义例》移徙入宅宜天德、月德、三合、六合；忌月破、岁破、四废、四穷、往亡。'
  },
  kaiShi: {
    label: '开市开业',
    core: '開市',
    yi: ['開市', '開業', '交易', '立券', '納財', '求財'],
    prefer: ['天德', '月德', '天願', '六合', '三合', '五富', '月恩'],
    avoid: ['月破', '歲破', '四絕', '四離', '往亡', '大會'],
    avoidJianchu: ['破', '閉'],
    ref: '《玉匣记》《选择宗镜》开市宜天德、月德、天愿、六合、三合、五富；忌月破、岁破、四绝、四离、往亡。'
  },
  dongTu: {
    label: '动土修造',
    core: '動土',
    yi: ['動土', '修造', '破土', '豎柱', '上梁', '興造'],
    prefer: ['天德', '月德', '月恩', '四相', '三合', '六合'],
    avoid: ['月破', '歲破', '土府', '四廢', '四窮', '四忌'],
    avoidJianchu: ['破', '建'],
    ref: '《协纪辨方书·义例》修造动土宜天德、月德、月恩、四相；忌月破、岁破、土府、四废、四穷、四忌，及破/建日。'
  },
  chuXing: {
    label: '出行',
    core: '出行',
    yi: ['出行', '移徙', '遊覽', '旅行'],
    prefer: ['天德', '月德', '三合', '六合', '聖心', '天醫'],
    avoid: ['往亡', '四離', '四絕', '月破'],
    avoidJianchu: ['破'],
    ref: '《协纪辨方书·义例》出行宜天德、月德、三合、六合、圣心；忌往亡、四离、四绝、月破。'
  },
  anZang: {
    label: '安葬',
    core: '安葬',
    yi: ['安葬', '破土', '啟攢', '修墳', '立碑'],
    prefer: ['天德', '月德', '天赦', '鳴吠', '鳴吠對', '六合'],
    avoid: ['月破', '歲破', '四絕', '四離', '重喪', '復日', '八專'],
    avoidJianchu: ['破', '收'],
    ref: '《协纪辨方书·义例》安葬宜天德、月德、天赦、鸣吠、鸣吠对、六合；忌月破、岁破、四绝、四离、重丧、复日、八专。'
  },
  qiFu: {
    label: '祈福祭祀',
    core: '祈福',
    yi: ['祈福', '祭祀', '求嗣', '斋醮', '酬神'],
    prefer: ['天德', '月德', '天恩', '天願', '六合', '三合'],
    avoid: ['月破', '四絕', '四離'],
    avoidJianchu: [],
    ref: '《协纪辨方书·义例》祈福祭祀宜天德、月德、天恩、天愿、六合、三合；忌月破、四绝、四离。'
  },
  dingMeng: {
    label: '订盟纳采（订婚）',
    core: '訂盟',
    yi: ['訂盟', '納采', '文定', '問名'],
    prefer: ['三合', '六合', '天喜', '不將', '月德', '天德'],
    avoid: ['月破', '歲破'],
    avoidJianchu: ['破', '收'],
    ref: '《协纪辨方书·义例》订盟纳采宜三合、六合、天喜、不将、月德、天德；忌月破、岁破。'
  },
  qiuYi: {
    label: '求医治病',
    core: '求醫',
    yi: ['求醫', '治病', '解除', '療病', '針灸'],
    prefer: ['天德', '月德', '天醫', '聖心', '六合'],
    avoid: ['月破', '四絕'],
    avoidJianchu: [],
    ref: '《协纪辨方书·义例》求医治病宜天德、月德、天医、圣心、六合；忌月破、四绝。'
  },
  qianYue: {
    label: '签约交易',
    core: '立券',
    yi: ['立券', '交易', '納財', '開市', '會友'],
    prefer: ['三合', '六合', '五富', '天願', '月德'],
    avoid: ['月破', '歲破', '四絕'],
    avoidJianchu: ['破', '閉'],
    ref: '《玉匣记》签约交易宜三合、六合、五富、天愿、月德；忌月破、岁破、四绝。'
  }
};

var CHOOSE_SOURCES = [
  '《协纪辨方书·义例》（乾隆御定，择日通则权威）',
  '《选择宗镜》（通用择日通则）',
  '《玉匣记》（民俗择日吉凶歌括）',
  '当日宜忌(yiActs/jiActs) 与 吉神/凶煞(goodGods/badGods) 均来自 lunisolar theGods 真实计算'
];

/** 取单日「全量真实数据」包（供择日评分；不裁剪，区别于 _buildDayItem 的 slice(0,6)） */
function _dayBundle(y, m, d) {
  var computed = computeDayFromLunar(y, m, d);
  var lsrGods = _getLsrGods(y, m, d, computed);
  var lsrActs = _getLsrActs(y, m, d);
  Lunar.calc2(y, m, 1);
  var ob = Lunar.lun[d - 1] || {};
  return {
    lunarD: ob.Ldc || '',
    lunarM: (ob.Lmc || '').replace('闰', ''),
    gz: { year: computed.yearGZ, month: computed.monthGZ, day: computed.dayGZ },
    jianChu: computed.jianchu || '',
    yiActs: (lsrActs && lsrActs.good) ? lsrActs.good : [],
    jiActs: (lsrActs && lsrActs.bad) ? lsrActs.bad : [],
    goodGods: (lsrGods && lsrGods.good) ? lsrGods.good : [],
    badGods: (lsrGods && lsrGods.bad) ? lsrGods.bad : [],
    isHongSha: !!computed.hongsha,
    isYanggongJi: !!computed.yanggongJi
  };
}

/** 依事项规则对单日评分，产出 吉/平/忌 等级 + 真实理由 */
function _scoreDay(b, ev) {
  var matchedYi = (ev.yi || []).filter(function(k) { return b.yiActs.indexOf(k) >= 0; });
  var conflictJi = (ev.yi || []).filter(function(k) { return b.jiActs.indexOf(k) >= 0; }); // 黄历明示忌此事
  var preferHit = (ev.prefer || []).filter(function(g) { return b.goodGods.indexOf(g) >= 0; });
  var avoidHit = (ev.avoid || []).filter(function(g) { return b.badGods.indexOf(g) >= 0; });

  var universalBad = CHOOSE_UNIVERSAL_BAD.filter(function(g) { return b.badGods.indexOf(g) >= 0; });
  var universal = b.isHongSha || b.isYanggongJi || universalBad.length > 0;
  var universalReason = '';
  if (b.isHongSha) universalReason = '小红砂（百事忌）';
  else if (b.isYanggongJi) universalReason = '杨公忌日';
  else if (universalBad.length) universalReason = universalBad.join('、');

  var jcAvoid = !!(ev.avoidJianchu && ev.avoidJianchu.indexOf(b.jianChu) >= 0);
  var conflict = conflictJi.length > 0;

  var score = 0;
  score += 12 * Math.min(matchedYi.length, 3);
  score -= 9 * avoidHit.length;
  score += 5 * preferHit.length;
  if (jcAvoid) score -= 10;
  if (conflict) score -= 40;

  var grade;
  if (universal || conflict) grade = '忌';
  else if (score >= 24) grade = '吉';
  else if (score >= 8) grade = '平';
  else grade = '忌';

  var reasons = [];
  if (matchedYi.length) reasons.push('宜：' + matchedYi.join('、'));
  if (preferHit.length) reasons.push('吉神：' + preferHit.join('、'));
  if (avoidHit.length) reasons.push('凶煞：' + avoidHit.join('、'));
  if (jcAvoid) reasons.push('建除：' + b.jianChu + '日（不利）');
  if (universal) reasons.push('诸事不宜：' + universalReason);
  if (conflict) reasons.push('黄历明示忌' + ev.core);

  return {
    score: score, grade: grade,
    matchedYi: matchedYi, preferHit: preferHit, avoidHit: avoidHit,
    jcAvoid: jcAvoid, conflict: conflict,
    universal: universal, universalReason: universalReason,
    reasons: reasons
  };
}

/** 择日主函数：返回当月排序后的候选日 + 诸事不宜日 */
function _chooseDays(eventKey, y, m) {
  var ev = CHOOSE_EVENTS[eventKey];
  if (!ev) return null;
  Lunar.calc2(y, m, 1);
  var dn = Lunar.lun.dn;
  var days = [];
  var avoidDays = [];
  var gradeRank = { '吉': 0, '平': 1, '忌': 2 };
  for (var d = 1; d <= dn; d++) {
    var b = _dayBundle(y, m, d);
    var r = _scoreDay(b, ev);
    var item = {
      y: y, m: m, d: d,
      lunarD: b.lunarD, lunarM: b.lunarM,
      gz: b.gz, jianChu: b.jianChu,
      score: r.score, grade: r.grade,
      matchedYi: r.matchedYi, preferHit: r.preferHit, avoidHit: r.avoidHit,
      isHongSha: b.isHongSha, isYanggongJi: b.isYanggongJi,
      universal: r.universal, universalReason: r.universalReason, conflict: r.conflict,
      reasons: r.reasons
    };
    days.push(item);
    if (r.universal || r.conflict) {
      avoidDays.push({
        y: y, m: m, d: d, lunarD: b.lunarD, gz: b.gz, jianChu: b.jianChu,
        reason: r.universal ? ('诸事不宜：' + r.universalReason) : ('黄历忌' + ev.core)
      });
    }
  }
  days.sort(function(a, c) {
    if (gradeRank[a.grade] !== gradeRank[c.grade]) return gradeRank[a.grade] - gradeRank[c.grade];
    return c.score - a.score;
  });
  return {
    event: eventKey, label: ev.label, ref: ev.ref,
    y: y, m: m, total: dn,
    days: days, avoidDays: avoidDays,
    sources: CHOOSE_SOURCES
  };
}

/** 从 lunisolar 获取指定日期的神煞数据 */
function _getLsrGods(y, m, d, computed) {
  try {
    var lsr = lunisolar(new Date(y, m - 1, d));
    var good = lsr.theGods.getGoodGods().map(function(g) { return String(g); });
    var bad = lsr.theGods.getBadGods().map(function(g) { return String(g); });
    // 自定义覆盖：lunisolar theGods 插件对天德(isStem逻辑反转)、月德合(数组索引越界)
    // 存在判定错误；另天恩(多报5日)、天願(采用曹震圭“传写谬误”版)、月刑/月害/重日/復日
    // (与协纪主流释义不同)；以及圣心/益后/续世(安装版 dist 月支索引错位，详见文件顶部
    // ZHI_ARR/SHENGXIN_REF/YIHOU_REF/XUSHI_REF 注释)均与协纪辨方书不符。
    // 此处以本地正确实现(computeDayFromLunar，依协纪辨方书)为准强制覆盖这些神煞。
    // 注意：lunisolar 的 getGoodGods() 中“天德”是【黄道十二神·天德】(按日支循环)，
    // 与【干支神煞·天德】(按年月日干支)同名。两者是不同神煞，不可混为一谈。
    // 因此“天德”在吉神名单中【只增不删】——当干支神煞天德成立时补入(去重)；
    // 当不成立时保留黄道天德(若有)。
    // 天恩/天願/月刑/月害/重日/復日/圣心/益后/续世 均无同名黄道神煞，按协纪全量强制覆盖。
    if (computed) {
      // 月支/日支序号（0-11 子→亥），用于圣心/益后/续世的协纪覆盖
      var _mb = ZHI_ARR.indexOf(computed.monthGZ[1]);
      var _db = ZHI_ARR.indexOf(computed.dayGZ[1]);
      var _truth = {
        '天德': !!computed.tiande,
        '天德合': !!computed.tiandeHe,
        '月德': !!computed.yuede,
        '月德合': !!computed.yuedeHe,
        '天赦': !!computed.tianshe,
        '天恩': !!computed.tianen,
        '天願': !!computed.tianyuan,
        '月刑': !!computed.yuexing,
        '月害': !!computed.yuehai,
        '重日': !!computed.chongri,
        '復日': !!computed.furi,
        // —— 协纪覆盖：修正 lunisolar 安装版 dist 的月支索引错位 bug ——
        // 防御：若月支/日支意外无效(_mb/_db<0)，三项协纪覆盖安全降级为 false，
        // 避免 SHENGXIN_REF[-1] 越界读取导致静默数据错误（不抛异常，但值错）。
        '聖心': _mb >= 0 && _db >= 0 && _db === SHENGXIN_REF[_mb],
        '益後': _mb >= 0 && _db >= 0 && _db === YIHOU_REF[_mb],
        '續世': _mb >= 0 && _db >= 0 && _db === XUSHI_REF[_mb],
        '大红砂': !!computed.dahongsha
      };
      // 明确区分这些覆盖神煞本身的吉凶属性：
      // 吉神：成立后补入 good，并从 bad 移除；不成立时从 bad 移除，且（天德除外）从 good 移除。
      // 凶煞：成立后补入 bad，并从 good 移除；不成立时从 good、bad 都移除。
      var GOOD_GODS = ['天德','天德合','月德','月德合','天赦','天恩','天願','聖心','益後','續世','大红砂'];
      var BAD_GODS  = ['月刑','月害','重日','復日'];

      Object.keys(_truth).forEach(function(name) {
        var gi = good.indexOf(name);
        var bi = bad.indexOf(name);
        var isGood = GOOD_GODS.indexOf(name) >= 0;
        var isBad = BAD_GODS.indexOf(name) >= 0;
        if (isGood) {
          if (_truth[name]) {
            if (gi < 0) good.push(name);
            if (bi >= 0) bad.splice(bi, 1);
          } else {
            if (bi >= 0) bad.splice(bi, 1);
            if (name !== '天德' && gi >= 0) good.splice(gi, 1);
          }
        } else if (isBad) {
          if (_truth[name]) {
            if (bi < 0) bad.push(name);
            if (gi >= 0) good.splice(gi, 1);
          } else {
            if (gi >= 0) good.splice(gi, 1);
            if (bi >= 0) bad.splice(bi, 1);
          }
        }
      });
    }
    return { good: good, bad: bad };
  } catch(e) {
    console.error('[lunisolar] getGods error:', e.message);
    return null;
  }
}

/** 从 lunisolar 获取宜忌 */
function _getLsrActs(y, m, d) {
  try {
    var lsr = lunisolar(new Date(y, m - 1, d));
    var acts = lsr.theGods.getActs(1);
    var good = (acts && Array.isArray(acts.good)) ? acts.good.slice() : [];
    var bad = (acts && Array.isArray(acts.bad)) ? acts.bad.slice() : [];
    // —— 后置修正（最小侵入、可回退）——
    // getActs 由第三方 lunisolar theGods 产出，不参与 _getLsrGods 协纪覆盖层，
    // 故将本程序已验证的神煞结论注入宜忌主输出，使每日「宜/忌」含本程序修正/新增神煞：
    //   · 大红砂（玉匣记吉神）→ 补「百事吉（大红砂·吉）」
    //   · 小红砂（协纪辨方书凶煞）→ 补「小红砂（凶·忌百事）」
    try {
      var cd = computeDayFromLunar(y, m, d);
      if (cd && cd.dahongsha) good.push('百事吉（大红砂·吉）');
      if (cd && cd.hongsha) bad.push('小红砂（凶·忌百事）');
    } catch (e) { /* 不影响主宜忌输出 */ }
    return { good: good, bad: bad };
  } catch(e) {
    return { good: [], bad: [] };
  }
}

const router = Router();

/** 为指定月份中的某天构建日数据 */
function _buildDayItem(ob, y, m, d) {
  var computed = computeDayFromLunar(y, m, d);
  var lsrGods = _getLsrGods(y, m, d, computed);
  var lsrActs = _getLsrActs(y, m, d);
  return {
    d: d,
    lunarD: ob.Ldc || '',
    lunarM: (ob.Lmc || '').replace('闰', ''),
    lunarMonthName: ob.Lmc || '',  // 原始月名（含闰标记，前端展示用）
    isLeap: !!(ob.Lmc && ob.Lmc.indexOf('闰') >= 0),
    jieQi: ob.jqmc || '',     // 节气名（如"立春"）
    gz: { year: computed.yearGZ, month: computed.monthGZ, day: computed.dayGZ },
    jianChu: computed.jianchu || '',
    jianChuGood: computed.duty12Good || false,
    xiu: computed.xiu || '',
    nineStar: computed.nineStar || null,
    lunarDaysInMonth: ob.Ldn || 30,  // { name, good, meaning }
    shenSha: (lsrGods ? lsrGods.good.concat(lsrGods.bad) : (computed.goodGods || []).concat(computed.badGods || [])).slice(0, 6),
    yi: lsrActs ? (lsrActs.good || []).slice(0, 6) : [],
    ji: lsrActs ? (lsrActs.bad || []).slice(0, 6) : [],
    isChongsang: !!computed.chongsang,
    isWulu: !!computed.wulu,
    isJinshenqisha: !!computed.jinshenqisha,
    isHongSha: !!computed.hongsha,
    isDaHongSha: !!computed.dahongsha,
    isDaojiaMonth: !!computed.daojiaMonth,
    isDaojiaYear: !!computed.daojiaYear,
    isWufu: !!computed.wufu,
    isYanggongJi: !!computed.yanggongJi,
    yanggongJi: computed.yanggongJi || null,
    isSiLiSiJue: !!computed.silisiJue,
    silisiJue: computed.silisiJue || null,
    isTiande: !!computed.tiande,
    isYuede: !!computed.yuede,
    isTianshe: !!computed.tianshe,
    yueXiang: ob.yxmc || '',
    yueXiangTime: ob.yxsj || '',
    solarFestival: (ob.A || '').trim(),
    lunarFestival: (ob.B || '').trim()
  };
}

// POST /api/v1/calendar/month — 单月日历数据（含前后月边缘日期）
router.post('/month', function(req, res, next) {
  try {
    var t0 = Date.now();
    var y = parseInt(req.body.y, 10);
    var m = parseInt(req.body.m, 10);

    if (!y || !m || y < 1900 || y > 2100 || m < 1 || m > 12) {
      return res.status(400).json({ ok: false, error: '参数无效：y/m 必填，范围1900-2100/1-12', code: 400 });
    }

    // 当月
    Lunar.calc2(y, m, 1);
    var lun = Lunar.lun;
    var days = [];
    for (var i = 0; i < lun.dn; i++) {
      days.push(_buildDayItem(lun[i], y, m, lun[i].d));
    }

    // 计算需要的前后月边缘天数
    var firstDayWeek = new Date(y, m - 1, 1).getDay(); // 0=日
    var daysInMonth = new Date(y, m, 0).getDate();
    var lastDayWeek = new Date(y, m - 1, daysInMonth).getDay();
    var prevCount = firstDayWeek;          // 需要填充的上月天数
    var nextCount = (7 - (lastDayWeek + 1)) % 7; // 需要填充的下月天数

    // 上月边缘（最后 prevCount 天）
    var prevEdge = [];
    if (prevCount > 0) {
      var prevM = m === 1 ? 12 : m - 1;
      var prevY = m === 1 ? y - 1 : y;
      var prevDaysInMonth = new Date(prevY, prevM, 0).getDate();
      Lunar.calc2(prevY, prevM, 1);
      var prevLun = Lunar.lun;
      for (var pd = prevDaysInMonth - prevCount; pd < prevDaysInMonth; pd++) {
        var idx = pd; // day-1
        if (idx >= 0 && idx < prevLun.dn) {
          prevEdge.push(_buildDayItem(prevLun[idx], prevY, prevM, prevLun[idx].d));
        }
      }
    }

    // 下月边缘（前 nextCount 天）
    var nextEdge = [];
    if (nextCount > 0) {
      var nextM = m === 12 ? 1 : m + 1;
      var nextY = m === 12 ? y + 1 : y;
      Lunar.calc2(nextY, nextM, 1);
      var nextLun = Lunar.lun;
      for (var nd = 0; nd < nextCount && nd < nextLun.dn; nd++) {
        nextEdge.push(_buildDayItem(nextLun[nd], nextY, nextM, nextLun[nd].d));
      }
    }

    res.json({ ok: true, data: {
      y: y, m: m, days: days,
      prevEdge: prevEdge,
      nextEdge: nextEdge
    }, took: Date.now() - t0 });
  } catch(e) { next(e); }
});

// POST /api/v1/calendar/day — 单日完整详情
router.post('/day', function(req, res, next) {
  try {
    var t0 = Date.now();
    var y = parseInt(req.body.y, 10);
    var m = parseInt(req.body.m, 10);
    var d = parseInt(req.body.d, 10);

    if (!y || !m || !d) {
      return res.status(400).json({ ok: false, error: '参数无效：y/m/d 必填', code: 400 });
    }

    Lunar.calc2(y, m, 1);
    var computed = computeDayFromLunar(y, m, d);
    var _rawOb = Lunar.lun[d - 1];
    if (computed && _rawOb) {
      computed.yueXiang = _rawOb.yxmc || '';
      computed.yueXiangTime = _rawOb.yxsj || '';
      computed.solarFestival = (_rawOb.A || '').trim();
      computed.lunarFestival = (_rawOb.B || '').trim();
    }

    // 补充计算：时辰黄黑道 + 五行力量分布 + lunisolar 神煞/宜忌
    if (computed) {
      computed.shichen = getShichenHuangHei2(computed.branch) || [];
      var noonGZ = getHourGZ2(computed.stem, 12);
      computed.wuxing = {
        counts: getWuxingCounts2(computed.yearGZ, computed.monthGZ, computed.dayGZ, noonGZ ? noonGZ.gz : ''),
        wangXiang: getWangXiang2((computed.monthGZ || '甲辰')[1] || '辰'),
        dist: ''
      };
      // lunisolar 神煞优先，本地回退（已用本地正确实现覆盖天德/天德合/月德/月德合/天赦）
      var lsrGods = _getLsrGods(y, m, d, computed);
      if (lsrGods) {
        computed.goodGods = lsrGods.good;
        computed.badGods = lsrGods.bad;
        // Phase 2.2：附「今日神煞」卡片所需的协纪出处/流派差异元数据（仅当日命中的），供前端 tooltip 展示
        computed.godsMeta = buildGodsMeta(lsrGods.good, lsrGods.bad);
      }
      var lsrActs = _getLsrActs(y, m, d);
      if (lsrActs) {
        computed.yiActs = lsrActs.good || [];
        computed.jiActs = lsrActs.bad || [];
      }
    }

    res.json({ ok: true, data: computed, took: Date.now() - t0 });
  } catch(e) { next(e); }
});

// POST /api/v1/calendar/choose — 择日助手：给定事项+月份，返回排序候选吉日
router.post('/choose', function(req, res, next) {
  try {
    var t0 = Date.now();
    var eventKey = req.body.event;
    var y = parseInt(req.body.y, 10);
    var m = parseInt(req.body.m, 10);
    if (!CHOOSE_EVENTS[eventKey]) {
      return res.status(400).json({ ok: false, error: '未知事项：' + eventKey, code: 400 });
    }
    if (!y || !m || y < 1900 || y > 2100 || m < 1 || m > 12) {
      return res.status(400).json({ ok: false, error: '参数无效：y/m 必填，范围1900-2100/1-12', code: 400 });
    }
    var data = _chooseDays(eventKey, y, m);
    if (!data) return res.status(400).json({ ok: false, error: '未知事项：' + eventKey, code: 400 });
    res.json({ ok: true, data: data, took: Date.now() - t0 });
  } catch(e) { next(e); }
});

// GET /api/v1/calendar/leap-month?y=1982 — 查询闰月
// 据《闰月处理修正技术文档.md》§6.1 闰月表及 §5.2 中气判定
router.get('/leap-month', function(req, res, next) {
  try {
    var y = parseInt(req.query.y, 10);
    if (!y || y < 1900 || y > 2100) {
      return res.json({ ok: true, data: { y: y, leap: 0, leapName: '' } });
    }

    // 双重检查策略（73/73 闰月表验证通过）：
    //   闰月属于冬至-到-冬至的农历年周期。
    //   2033年闰十一月等年末闰月落在当年冬至后→下年冬至前的周期，
    //   年中JD（7月）落在上一年冬至→当年冬至的周期，会漏检。
    //   策略：先查12月25日（冬至后，捕获年末闰月），leap=0 时回退到2月1日。
    Lunar.calc(Math.floor(JD.JD(y, 12, 25) - J2000));
    var leap = Lunar.leap || 0;

    if (leap === 0) {
      Lunar.calc(Math.floor(JD.JD(y, 2, 1) - J2000));
      leap = Lunar.leap || 0;
    }

    // leap 是内部月序：1=冬月(11月), 2=腊月(12月), 3=正月(1月), …, 14=腊月(12月)
    var leapMonth = 0;
    var leapName = '';
    if (leap > 0) {
      if (leap >= 3) leapMonth = leap - 2;
      else if (leap === 1) leapMonth = 11;
      else if (leap === 2) leapMonth = 12;
      if (leapMonth >= 1 && leapMonth <= 12 && Lunar.ym[leap]) {
        leapName = '闰' + Lunar.ym[leap] + '月';
      }
    }
    res.json({ ok: true, data: { y: y, leap: leapMonth, leapName: leapName } });
  } catch(e) { next(e); }
});

// POST /api/v1/calendar/nianli — 年历视图（与 index.html 的 nianLiHTML/nianLi2HTML 完全一致）
router.post('/nianli', function(req, res, next) {
  try {
    var t0 = Date.now();
    var y = parseInt(req.body.y, 10);
    if (!y || y < 1900 || y > 2100) {
      return res.status(400).json({ ok: false, error: '参数无效：y 必填，范围1900-2100', code: 400 });
    }

    Lunar.calc(Math.floor((y - 2000) * 365.2422 + 180));

    // 年历一：十二月览（与 nianLiHTML 完全一致）
    var html1 = '<div class="nianli-container nianli-1"><div class="nianli-year">' + y + '年</div>';
    for (var i = 0; i < 14; i++) {
      if (Lunar.HS[i + 1] > Lunar.ZQ[24]) break;
      var s1 = Lunar.nu[i]; if (!s1) s1 = '·';
      s1 += Lunar.ym[i]; if (s1.length < 3) s1 += '月';
      s1 += Lunar.dx[i] > 29 ? '大' : '小';
      s1 += ' ' + JD.setFromJD_str(Lunar.HS[i] + J2000).substr(6, 5);

      var v = suo_accurate2(Lunar.HS[i]);
      var s2 = '(' + JD.setFromJD_str(v + J2000).substr(9, 11) + ')';
      if (Math.floor(v + 0.5) !== Lunar.HS[i]) s2 = '<span style="color:red">' + s2 + '</span>';
      s1 += s2;

      for (var j = 0; j < 24; j++) {
        if (Lunar.ZQ[j] < Lunar.HS[i] || Lunar.ZQ[j] >= Lunar.HS[i + 1]) continue;
        s1 += ' ' + Lunar.jqmc[j] + JD.setFromJD_str(Lunar.ZQ[j] + J2000).substr(6, 5);
        var v2 = qi_accurate2(Lunar.ZQ[j]);
        var s3 = '(' + JD.setFromJD_str(v2 + J2000).substr(9, 11) + ')';
        if (Math.floor(v2 + 0.5) !== Lunar.ZQ[j]) s3 = '<span style="color:red">' + s3 + '</span>';
        s1 += s3;
      }
      html1 += '<div class="nianli-line">' + s1 + '</div>';
    }
    html1 += '</div>';

    // 年历二：干支节气（与 nianLi2HTML 完全一致）
    var html2 = '<div class="nianli-container nianli-2"><div class="nianli-year">' + y + '年</div>';
    for (var i2 = 0; i2 < 14; i2++) {
      if (Lunar.HS[i2 + 1] > Lunar.ZQ[24]) break;
      var t1 = Lunar.nu[i2]; if (!t1) t1 = '·';
      t1 += Lunar.ym[i2]; if (t1.length < 3) t1 += '月';
      t1 += Lunar.dx[i2] > 29 ? '大' : '小';
      var vh = Lunar.HS[i2] + J2000;
      t1 += ' ' + Lunar.Gan[(vh + 9) % 10] + Lunar.Zhi[(vh + 1) % 12];
      t1 += ' ' + JD.setFromJD_str(vh).substr(6, 5);

      for (var j2 = 0; j2 < 24; j2++) {
        if (Lunar.ZQ[j2] < Lunar.HS[i2] || Lunar.ZQ[j2] >= Lunar.HS[i2 + 1]) continue;
        var vh2 = Lunar.ZQ[j2] + J2000;
        t1 += ' ' + Lunar.rmc[vh2 - vh] + Lunar.Gan[(vh2 + 9) % 10] + Lunar.Zhi[(vh2 + 1) % 12];
        t1 += Lunar.jqmc[j2] + JD.setFromJD_str(Lunar.ZQ[j2] + J2000).substr(6, 5);
      }
      html2 += '<div class="nianli-line">' + t1 + '</div>';
    }
    html2 += '</div>';

    res.json({ ok: true, data: { y: y, html1: html1, html2: html2 }, took: Date.now() - t0 });
  } catch(e) { next(e); }
});

module.exports = router;
// 导出内部覆盖函数，供 verify_override_noref.js 等 CI 直接调用真实代码（非副本）
module.exports._getLsrGods = _getLsrGods;
module.exports._getLsrActs = _getLsrActs;
module.exports._buildGodsMeta = buildGodsMeta;
module.exports._GODS_SOURCE = GODS_SOURCE;
// Phase 3.1 — 择日助手 内部函数导出，供 verify_choose.js 直接调用真实代码
module.exports._chooseDays = _chooseDays;
module.exports._CHOOSE_EVENTS = CHOOSE_EVENTS;
module.exports._dayBundle = _dayBundle;
module.exports._scoreDay = _scoreDay;
module.exports._CHOOSE_UNIVERSAL_BAD = CHOOSE_UNIVERSAL_BAD;
