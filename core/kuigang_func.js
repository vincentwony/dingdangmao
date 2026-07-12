/**
 * 魁罡命格检测
 * 依据：《三命通会》《渊海子平》
 */
function computeKuiGang(ob) {
  var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var KG = {16:{n:'庚辰',t:'罡'},28:{n:'壬辰',t:'罡'},34:{n:'庚戌',t:'魁'},46:{n:'戊戌',t:'魁'}};
  var b1=ob.b1,b2=ob.b2,b3=ob.b3,b4=ob.b4;
  var dIdx=((b3%60)+60)%60, yIdx=((b1%60)+60)%60, mIdx=((b2%60)+60)%60, hIdx=((b4%60)+60)%60;
  var riGanIdx=b3%10;
  var kg = KG[dIdx];
  var no = {traits:[],career:'',relationship:'',health:''};
  if (!kg) return { hasShensha:false,type:'',dayPillar:'',
    overlap:{count:0,positions:[],isStacked:false},
    evaluation:{level:0,grade:'无',description:'日柱非魁罡四日'},
    taboo:{hasWealth:false,hasOfficer:false,hasPunishment:false,hasSha:false,details:[]},
    shenWang:{isWang:false,score:0,explanation:''}, personality:no, interpretation:{}, dayun:[] };

  // 1. 四柱重叠
  var pn=['年柱','月柱','日柱','时柱'], all=[yIdx,mIdx,dIdx,hIdx], pos=[];
  for(var i=0;i<4;i++){if(KG[all[i]])pos.push(pn[i]);}
  var stacked=pos.length>=2;

  // 2. 身旺
  var sw={isWang:false,score:0,explanation:''};
  try{
    var wxData=Wuxing._computeAllWuxing(ob);
    var wk=['mu','huo','tu','jin','shui'];
    var riWxIdx=Wuxing._cgGanWx(GAN[riGanIdx]);
    if(typeof riWxIdx==='string')riWxIdx={mu:0,huo:1,tu:2,jin:3,shui:4}[riWxIdx]||2;
    var riLv=wxData.levels[wk[riWxIdx]]||'中和', riPct=wxData.pct[wk[riWxIdx]]||0;
    sw.score=riPct; sw.isWang=(riLv==='极旺'||riLv==='偏旺');
    sw.explanation='日主'+GAN[riGanIdx]+'五行占比'+riPct.toFixed(1)+'%('+riLv+')';
  }catch(e){sw.explanation='身旺计算异常';}

  // 3. 财官刑煞
  var tb={hasWealth:false,hasOfficer:false,hasPunishment:false,hasSha:false,details:[]};
  var oi=[b1%10,b2%10,b4%10], on=['年干','月干','时干'];
  for(var j=0;j<3;j++){
    var sk=Wuxing._cgSSKind(riGanIdx,oi[j]), sn=Wuxing._localSShen(riGanIdx,oi[j]);
    if(sk==='财'&&!tb.hasWealth){tb.hasWealth=true;tb.details.push(on[j]+'透'+sn+'(财)');}
    if(sk==='官'&&!tb.hasOfficer){tb.hasOfficer=true;tb.details.push(on[j]+'透'+sn+'(官)');}
  }
  var zs=[b1%12,b2%12,b3%12,b4%12],hc=false,hx=false;
  for(var k=0;k<4;k++){if(zs[k]===4)hc=true;if(zs[k]===10)hx=true;}
  if(hc&&hx){tb.hasPunishment=true;tb.details.push('辰戌相冲');}

  // 4. 评级
  var lv=3,gd='魁罡入命·平',ds='魁罡入命，需结合大运流年综合论断';
  if(stacked&&sw.isWang&&!tb.hasWealth&&!tb.hasOfficer&&!tb.hasPunishment){lv=5;gd='魁罡叠逢·大贵';ds='叠叠相逢掌大权，身行旺地贵无伦';}
  else if(sw.isWang&&!tb.hasWealth&&!tb.hasOfficer&&!tb.hasPunishment){lv=4;gd='魁罡成格·贵';ds='不见财官刑煞并，身行旺地贵无伦';}
  else if(!sw.isWang&&tb.hasPunishment&&(tb.hasWealth||tb.hasOfficer)){lv=1;gd='魁罡破格·凶';ds='倘有刑冲兼破坏，一生彻骨受笞鞭';}
  else if(!sw.isWang){lv=2;gd='魁罡受制·弱';ds='身弱逢魁罡，难驾驭刚猛之性';}
  else if(sw.isWang&&(tb.hasWealth||tb.hasOfficer)){lv=2;gd='魁罡受制·弱';ds='身旺但见财官透干，魁罡贵气受损';}

  // 5. 类型文案
  var TXT={gc:{nm:'庚辰日·天罡',sm:'庚辰日生人，命带天罡魁罡，刚毅果断，权威过人。',tr:['刚毅果断','权威过人','疾恶如仇','善于决策','领导才能'],ca:'管理、司法、军警、监察',rl:'性格刚强，感情中易显强势',he:'心脑血管、情绪管理'},rc:{nm:'壬辰日·天罡',sm:'壬辰日生人，命带天罡魁罡，深藏不露，内有乾坤。',tr:['深藏不露','沉稳内敛','蓄势待发','志向远大','善于隐忍'],ca:'战略规划、研究、金融',rl:'外表沉稳但内心强势',he:'肾脏、泌尿系统'},gx:{nm:'庚戌日·河魁',sm:'庚戌日生人，命带河魁魁罡，火库爆发，果敢魄力。',tr:['果敢魄力','敢作敢当','开拓进取','雷厉风行','不畏艰难'],ca:'创业、军事、执法',rl:'性格强势，易与伴侣摩擦',he:'肺部、呼吸系统'},wx:{nm:'戊戌日·河魁',sm:'戊戌日生人，命带河魁魁罡，火库决断，土性厚重。',tr:['沉稳厚重','决断果敢','杀伐果断','意志坚定','权威感强'],ca:'高层管理、政治、法律',rl:'过于强势，需学会退让',he:'脾胃消化系统'}};
  var tk=kg.n==='庚辰'?'gc':kg.n==='壬辰'?'rc':kg.n==='庚戌'?'gx':'wx';
  var tp=TXT[tk];
  var sx=ob.sex===1?'male':'female';
  var gn=sx==='male'?'男命魁罡主刚毅果断，有领导才能，事业有成。需注意避免强势引发人际冲突。':'女命魁罡心性刚强，在婚姻中易显强势。古书有"女带魁罡家败人散"之说，实质是提醒以柔克刚。';
  var det=kg.n+'日入魁罡格。'+(stacked?pos.length+'柱叠逢，贵气叠加。':'')+sw.explanation+'。'+(tb.details.length>0?'忌讳：'+tb.details.join('；')+'。':'无财官刑煞忌讳。');
  var tw=(tb.hasWealth?'⚠魁罡忌财，慎防破财 ':'')+(tb.hasOfficer?'⚠魁罡忌官，慎防官非':'');
  if(!tw.trim())tw='';

  // 6. 大运魁罡
  var dyk=[];
  if(ob._sz&&ob._sz.dyn&&ob._sz.dyn.length>0){
    var qn=ob._sz.qnian||1, yG=ob.b1%10, iy=(yG%2===0), im=(ob.sex===1);
    var fwd=(iy&&im)||(!iy&&!im);
    for(var di=0;di<ob._sz.dyn.length;di++){
      var sY=parseInt(ob._sz.dyn[di],10);if(isNaN(sY))continue;
      var dyIdx=fwd?((mIdx+di+1)%60+60)%60:((mIdx-di-1)%60+60)%60;
      var dgz=GAN[dyIdx%10]+ZHI[dyIdx%12], as=qn+di*10, ae=as+9;
      if(KG[dyIdx]){dyk.push({gz:dgz,branch:ZHI[dyIdx%12],age:as+'-'+ae+'岁',isExact:true,desc:'大运正逢魁罡，此十年主权势变动'});}
      else{var dz=dyIdx%12;if(dz===4||dz===10){dyk.push({gz:dgz,branch:ZHI[dz],age:as+'-'+ae+'岁',isExact:false,desc:'运逢辰/戌魁罡之位，有权力变动之象'});}}
    }
  }

  return {hasShensha:true,type:kg.t,dayPillar:kg.n,
    overlap:{count:pos.length,positions:pos,isStacked:stacked},
    evaluation:{level:lv,grade:gd,description:ds}, taboo:tb, shenWang:sw,
    personality:{traits:tp.tr,career:tp.ca,relationship:tp.rl,health:tp.he},
    interpretation:{summary:tp.sm,detail:det,suggestion:sx==='male'?'修身养性，刚柔并济，方能长久':'学会以柔克刚，婚姻中多一份包容与理解',genderNote:gn,tabooWarning:tw},
    dayun:dyk};
}
