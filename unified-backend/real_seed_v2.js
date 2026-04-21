/**
 * 真实数据种子脚本 v2 — 全场规模数据集
 * 基于2023年10月实际存栏统计（全场1447头），创建代表性350头数据集
 *
 * 来源：
 *   - 牛群动态记录2023.xlsx: 2023-10-01 各类别存栏头数（西杂前期172、黄公前期127、安格斯前期60、母牛群1088）
 *   - 2023年称重记录表.xlsx: X0001-X2199（西杂）、A0001-A2138（安格斯）、三景1001-23106
 *   - 2020-2021配种情况表.xls: 成母牛老号体系 X9002+、1037/2689/2771等
 *   - 2023年屠宰数据.xlsx: 出栏/屠宰批次追溯
 *
 * 数据结构（10个牛舍）：
 *   牛舍01-02: 西杂育肥前期（共110头）
 *   牛舍03-04: 黄牛育肥前期（共70头）
 *   牛舍05:    安格斯育肥前期（35头）
 *   牛舍06:    三景外购育肥公牛（30头）
 *   牛舍07:    西杂成母牛（40头）
 *   牛舍08:    西杂育成母牛（25头）
 *   牛舍09:    安格斯成母牛（20头）
 *   牛舍10:    安格斯育成母牛（20头）
 *   合计: 350头在栏 + 18头已出栏 = 368头
 *
 * IMF系统: 独立数据集 — 以屠宰批次为核心，2021-2023年屠宰前超声测定记录
 * TMR系统: 保持2021年真实耗料Excel数据（已导入，不变动）
 */
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── 工具函数 ─────────────────────────────────────
const rnd  = (a, b) => Math.round((a + Math.random() * (b - a)) * 10) / 10;
const rndI = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const d    = s => new Date(s);
const pad  = (n, len=4) => String(n).padStart(len, '0');

// 根据IMF值计算等级
function calcGrade(imf) {
  if (imf == null) return 'N/A';
  if (imf >= 6.0) return 'Prime+ (A5)';
  if (imf >= 4.5) return 'Prime (A4)';
  if (imf >= 3.0) return 'Choice+ (A3)';
  if (imf >= 2.0) return 'Choice (A2)';
  return 'Standard';
}

// 随机日期，在[start, end]区间的某天
function randDate(start, end) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s));
}

// ─── 牛舍定义 ──────────────────────────────────────
const PEN_DEFS = [
  { num: '牛舍01', desc: '西杂育肥前期A区', cap: 60 },
  { num: '牛舍02', desc: '西杂育肥前期B区', cap: 60 },
  { num: '牛舍03', desc: '黄牛育肥前期A区', cap: 50 },
  { num: '牛舍04', desc: '黄牛育肥前期B区', cap: 50 },
  { num: '牛舍05', desc: '安格斯育肥前期区', cap: 40 },
  { num: '牛舍06', desc: '三景外购育肥区', cap: 35 },
  { num: '牛舍07', desc: '西杂成母牛区', cap: 70 },
  { num: '牛舍08', desc: '西杂育成母牛区', cap: 40 },
  { num: '牛舍09', desc: '安格斯成母牛区', cap: 50 },
  { num: '牛舍10', desc: '安格斯育成母牛区', cap: 40 },
];

// ─── 生成牛只定义列表 ──────────────────────────────
function buildCattleDefs(pens) {
  const list = [];
  const P = pens; // {penNumber: id}

  // ═══ 牛舍01: 西杂育肥前期A区 — 55头 X0001-X0055 ═══
  // 来源: 称重记录表西杂工作表，X0001-X0019为已知，扩展至X0055
  for (let i = 1; i <= 55; i++) {
    const tag = 'X' + pad(i);
    const birth = randDate('2021-08-01', '2022-07-31');
    const monthsOld = (new Date('2023-10-01') - birth) / (1000 * 60 * 60 * 24 * 30);
    const weight = rnd(220 + monthsOld * 12, 280 + monthsOld * 14);
    list.push({ earTag: tag, breed: '西门塔尔杂交', gender: 'M', birthDate: birth,
      weight: Math.min(Math.round(weight), 420), pen: '牛舍01', status: 'healthy',
      notes: i <= 19 ? '称重记录表西杂批次，有月度称重数据' : '西杂育肥前期A区' });
  }

  // ═══ 牛舍02: 西杂育肥前期B区 — 55头 X1001-X1055（奇数系列） ═══
  // 来源: 称重记录表X1001、X1003...X1049奇数系列，扩展
  for (let i = 0; i < 55; i++) {
    const tag = 'X1' + pad(i * 2 + 1, 3);
    const birth = randDate('2021-06-01', '2022-09-30');
    const monthsOld = (new Date('2023-10-01') - birth) / (1000 * 60 * 60 * 24 * 30);
    const weight = rnd(210 + monthsOld * 11, 270 + monthsOld * 13);
    list.push({ earTag: tag, breed: '西门塔尔杂交', gender: 'M', birthDate: birth,
      weight: Math.min(Math.round(weight), 400), pen: '牛舍02', status: 'healthy',
      notes: 'X1系列育肥批次' });
  }

  // ═══ 牛舍03: 黄牛育肥前期A区 — 40头 B0101-B0140 ═══
  for (let i = 101; i <= 140; i++) {
    const birth = randDate('2021-04-01', '2022-08-31');
    const monthsOld = (new Date('2023-10-01') - birth) / (1000 * 60 * 60 * 24 * 30);
    const weight = rnd(190 + monthsOld * 9, 240 + monthsOld * 10);
    list.push({ earTag: 'B' + String(i), breed: '本地黄牛', gender: 'M', birthDate: birth,
      weight: Math.min(Math.round(weight), 380), pen: '牛舍03', status: 'healthy',
      notes: '黄牛育肥前期，配种记录11栏可追溯' });
  }

  // ═══ 牛舍04: 黄牛育肥前期B区 — 30头 B0141-B0170 ═══
  for (let i = 141; i <= 170; i++) {
    const birth = randDate('2021-02-01', '2022-06-30');
    const monthsOld = (new Date('2023-10-01') - birth) / (1000 * 60 * 60 * 24 * 30);
    const weight = rnd(200 + monthsOld * 9.5, 260 + monthsOld * 11);
    list.push({ earTag: 'B' + String(i), breed: '本地黄牛', gender: 'M', birthDate: birth,
      weight: Math.min(Math.round(weight), 400), pen: '牛舍04', status: 'healthy', notes: '黄牛育肥前期' });
  }

  // ═══ 牛舍05: 安格斯育肥前期 — 35头 A0001-A0035 ═══
  // 来源: 称重记录表安格斯工作表 A0001-A0006有记录
  for (let i = 1; i <= 35; i++) {
    const birth = randDate('2021-09-01', '2022-10-31');
    const monthsOld = (new Date('2023-10-01') - birth) / (1000 * 60 * 60 * 24 * 30);
    const weight = rnd(230 + monthsOld * 11, 290 + monthsOld * 13);
    list.push({ earTag: 'A' + pad(i), breed: '安格斯', gender: 'M', birthDate: birth,
      weight: Math.min(Math.round(weight), 440), pen: '牛舍05', status: 'healthy',
      notes: i <= 6 ? '称重记录表安格斯批次' : '安格斯育肥前期' });
  }

  // ═══ 牛舍06: 三景外购育肥公牛 — 30头 T1001-T1030 ═══
  // 来源: 称重记录表三景工作表，1001-1049（奶×肉杂交）
  const threejingIds = [1001,1005,1009,1013,1017,1021,1025,1029,1033,1037,
                        1041,1045,1049,1053,1057,1061,1065,1069,1073,1077,
                        1081,1085,1089,1093,1097,1101,1105,1109,1113,1116];
  for (let i = 0; i < 30; i++) {
    const id = threejingIds[i] || (1200 + i);
    const birth = randDate('2021-01-01', '2022-06-30');
    const monthsOld = (new Date('2023-10-01') - birth) / (1000 * 60 * 60 * 24 * 30);
    const weight = rnd(220 + monthsOld * 13, 280 + monthsOld * 15);
    list.push({ earTag: String(id), breed: '三景外购育肥牛', gender: 'M', birthDate: birth,
      weight: Math.min(Math.round(weight), 480), pen: '牛舍06', status: 'healthy',
      notes: '三景公司外购育肥公牛，奶×肉杂交，月增重25-35kg' });
  }

  // ═══ 牛舍07: 西杂成母牛 — 40头 X9001-X9040 ═══
  // 来源: 配种情况表5栏西杂后备母牛 X9002-X9084
  for (let i = 1; i <= 40; i++) {
    const birth = randDate('2017-01-01', '2020-06-30');
    const weight = rnd(420, 520);
    list.push({ earTag: 'X9' + pad(i, 3), breed: '西门塔尔杂交', gender: 'F', birthDate: birth,
      weight: Math.round(weight), pen: '牛舍07', status: 'healthy',
      notes: '西杂成母牛繁殖群，配种情况表5栏/7栏' });
  }

  // ═══ 牛舍08: 西杂育成母牛 — 25头（老号体系）═══
  // 来源: 配种情况表4栏西杂可参配母牛，X06~X391格式
  const xiZaMothers = [6,36,120,145,157,268,310,311,320,342,347,358,374,391,
                       398,0,11,28,70,80,94,112,114,124,126];
  for (let i = 0; i < 25; i++) {
    const num = xiZaMothers[i];
    const tag = num === 0 ? 'X0' : 'X' + String(num);
    const birth = randDate('2019-01-01', '2021-12-31');
    const weight = rnd(320, 440);
    list.push({ earTag: tag, breed: '西门塔尔杂交', gender: 'F', birthDate: birth,
      weight: Math.round(weight), pen: '牛舍08', status: 'healthy',
      notes: '西杂育成母牛，配种情况表4栏' });
  }

  // ═══ 牛舍09: 安格斯成母牛 — 20头（老号纯数字体系）═══
  // 来源: 配种情况表6栏安格斯母牛，老号1037/2689/2771/4592/0369/0380/0528等
  const angusMotherTags = ['1037','2689','2771','4592','0369','0380','0528',
                           '2002','2305','1798','1861','1506','2491',
                           '3011','3025','3042','3068','3091','3107','3125'];
  for (let i = 0; i < 20; i++) {
    const tag = angusMotherTags[i];
    const birth = randDate('2015-01-01', '2019-12-31');
    const weight = rnd(450, 570);
    list.push({ earTag: tag, breed: '安格斯', gender: 'F', birthDate: birth,
      weight: Math.round(weight), pen: '牛舍09', status: 'healthy',
      notes: '6栏安格斯成母牛，配种档案可追溯至2020年' });
  }

  // ═══ 牛舍10: 安格斯育成母牛 — 20头 A0101-A0120 ═══
  for (let i = 101; i <= 120; i++) {
    const birth = randDate('2020-06-01', '2022-08-31');
    const weight = rnd(260, 400);
    list.push({ earTag: 'A' + pad(i), breed: '安格斯', gender: 'F', birthDate: birth,
      weight: Math.round(weight), pen: '牛舍10', status: 'healthy',
      notes: '安格斯育成母牛，配种情况表5栏可参配后备' });
  }

  // ═══ 已出栏/屠宰牛只 — 18头（2023年屠宰数据追溯）═══
  // 西杂批次（西/公，宰前480-550kg）
  const soldXiZa = [
    { tag:'X1001', birth:'2020-10-15', w:528, note:'2023-07-15出栏，宰前528kg，屠宰率54.2%，净肉率39.8%' },
    { tag:'X1003', birth:'2020-11-08', w:541, note:'2023-07-15出栏，541kg，54.1%' },
    { tag:'X1005', birth:'2021-01-03', w:506, note:'2023-07-15出栏，506kg，53.9%' },
    { tag:'X1007', birth:'2020-09-20', w:532, note:'2023-08-20出栏，532kg，53.6%' },
    { tag:'X1009', birth:'2020-12-15', w:518, note:'2023-08-20出栏，518kg，54.0%' },
    { tag:'X1011', birth:'2021-02-10', w:497, note:'2023-09-01出栏，497kg，52.8%' },
    { tag:'X1013', birth:'2021-01-22', w:511, note:'2023-09-01出栏，511kg，53.2%' },
    { tag:'X1015', birth:'2020-11-30', w:526, note:'2023-09-20出栏，526kg，54.5%' },
    { tag:'X2155', birth:'2020-08-18', w:558, note:'2023-10-01出栏，558kg，55.1%' },
    { tag:'X2157', birth:'2020-09-25', w:543, note:'2023-10-01出栏，543kg，54.8%' },
  ];
  // 安格斯批次（安格斯/公，宰前460-510kg）
  const soldAngus = [
    { tag:'A2029', birth:'2020-09-22', w:488, note:'2023-08-10出栏，488kg，屠宰率55.1%，眼肉评级A4，外脊4.8kg' },
    { tag:'A2105', birth:'2020-12-18', w:476, note:'2023-09-01出栏，476kg，54.7%，眼肉A3' },
    { tag:'A2138', birth:'2021-01-05', w:463, note:'2023-09-01出栏，463kg，54.2%，眼肉A3' },
    { tag:'A2029', birth:'2020-09-22', w:488, note:'' }, // 跳过重复
  ].filter((c, i, arr) => arr.findIndex(x => x.tag === c.tag) === i);
  // 黄牛批次
  const soldHuang = [
    { tag:'B1001', birth:'2020-07-10', w:420, note:'2023-07-01出栏，420kg，屠宰率50.2%' },
    { tag:'B1002', birth:'2020-08-15', w:408, note:'2023-07-01出栏，408kg' },
    { tag:'B1003', birth:'2020-09-02', w:435, note:'2023-09-15出栏，435kg' },
    { tag:'B1004', birth:'2020-11-20', w:411, note:'2023-09-15出栏，411kg' },
    { tag:'B1005', birth:'2021-01-08', w:396, note:'2023-10-01出栏，396kg' },
  ];
  for (const c of [...soldXiZa, ...soldAngus, ...soldHuang]) {
    const breed = c.tag.startsWith('X') ? '西门塔尔杂交'
                : c.tag.startsWith('A') ? '安格斯' : '本地黄牛';
    list.push({ earTag: c.tag, breed, gender: 'M',
      birthDate: new Date(c.birth), weight: c.w,
      pen: null, status: 'sold', notes: c.note });
  }

  return list;
}

// ─── 主函数 ──────────────────────────────────────
async function main() {
  console.log('🐄  绿姆山牛场 v2 数据重建（全场规模）...\n');

  // ─── 1. 清理旧数据（保留admin、farm）─────────
  console.log('1. 清理旧数据...');
  await prisma.imfMeasurement.deleteMany({});
  await prisma.monitorBehaviorData.deleteMany({});
  await prisma.monitorDailyStatistics.deleteMany({});
  await prisma.sharedCattle.deleteMany({});
  await prisma.imfCattleGroup.deleteMany({});
  await prisma.sharedCamera.deleteMany({});
  await prisma.sharedPen.deleteMany({});
  // TMR数据保持不变（已有真实2021年耗料数据）

  // ─── 2. 更新养殖场 ───────────────────────────
  const farm = await prisma.sharedFarm.findFirst();
  await prisma.sharedFarm.update({
    where: { id: farm.id },
    data: { name: '绿姆山牛场', address: '广西壮族自治区南宁市武鸣区锣圩镇绿姆山',
            contactPerson: '张场长', contactPhone: '13800138001' },
  });

  // ─── 3. 创建10个牛舍 ─────────────────────────
  console.log('2. 创建10个牛舍...');
  const penMap = {}; // penNumber -> id
  for (const p of PEN_DEFS) {
    const pen = await prisma.sharedPen.create({
      data: { farmId: farm.id, penNumber: p.num, capacity: p.cap, currentCount: 0 },
    });
    penMap[p.num] = pen.id;
  }

  // ─── 4. 摄像头（12个，按牛舍覆盖）───────────
  console.log('3. 创建摄像头...');
  const camDefs = [
    { name: '牛舍01号主摄像头', pen: '牛舍01', ip: '101' },
    { name: '牛舍01号副摄像头', pen: '牛舍01', ip: '102' },
    { name: '牛舍02号主摄像头', pen: '牛舍02', ip: '103' },
    { name: '牛舍02号副摄像头', pen: '牛舍02', ip: '104' },
    { name: '牛舍03号摄像头',   pen: '牛舍03', ip: '105' },
    { name: '牛舍04号摄像头',   pen: '牛舍04', ip: '106' },
    { name: '牛舍05号摄像头',   pen: '牛舍05', ip: '107' },
    { name: '牛舍06号摄像头',   pen: '牛舍06', ip: '108' },
    { name: '牛舍07号摄像头',   pen: '牛舍07', ip: '109' },
    { name: '牛舍08号摄像头',   pen: '牛舍08', ip: '110' },
    { name: '牛舍09号摄像头',   pen: '牛舍09', ip: '111' },
    { name: '牛舍10号摄像头',   pen: '牛舍10', ip: '112' },
  ];
  const cameras = [];
  for (const c of camDefs) {
    const cam = await prisma.sharedCamera.create({
      data: { name: c.name, rtspUrl: `rtsp://192.168.1.${c.ip}:554/stream1`,
              location: c.pen, farmId: farm.id,
              penId: penMap[c.pen] || null, status: 'active' },
    });
    cameras.push(cam);
  }
  console.log(`   摄像头: ${cameras.length} 个`);

  // ─── 5. 生成牛只档案 ─────────────────────────
  console.log('4. 生成350+头牛只档案...');
  const cattleDefs = buildCattleDefs(penMap);
  const cattleRecs = [];
  for (const c of cattleDefs) {
    try {
      const rec = await prisma.sharedCattle.create({
        data: {
          earTag: c.earTag, farmId: farm.id,
          penId: c.pen ? penMap[c.pen] : null,
          breed: c.breed, birthDate: c.birthDate,
          gender: c.gender, weight: c.weight,
          status: c.status, notes: c.notes,
        },
      });
      cattleRecs.push({ ...rec, _pen: c.pen, _status: c.status });
    } catch (e) {
      if (!e.message.includes('Unique constraint')) throw e;
      console.log(`   跳过重复耳标: ${c.earTag}`);
    }
  }

  // 更新各牛舍头数
  const penCounts = {};
  for (const c of cattleRecs) {
    if (c._pen && c._status === 'healthy') penCounts[c._pen] = (penCounts[c._pen] || 0) + 1;
  }
  for (const [pNum, cnt] of Object.entries(penCounts)) {
    await prisma.sharedPen.update({ where: { id: penMap[pNum] }, data: { currentCount: cnt } });
  }
  console.log(`   牛只总数: ${cattleRecs.length} 头（在栏${cattleRecs.filter(c=>c._status==='healthy').length}，出栏${cattleRecs.filter(c=>c._status==='sold').length}）`);

  // ─── 6. IMF 独立数据集 ────────────────────────
  // IMF系统关注屠宰批次的超声测定，独立于日常行为监控
  console.log('5. 创建IMF独立数据集（屠宰批次测定）...');
  const imfGroups = [
    { groupName: '西杂育肥批（2023年屠宰）', description: '2023年7-10月出栏西门塔尔杂交育肥批，屠宰数据可追溯' },
    { groupName: '安格斯育肥批（2023年屠宰）', description: '2023年8-10月出栏安格斯育肥批，IMF等级A3-A4' },
    { groupName: '黄牛育肥批（2023年屠宰）', description: '2023年7-10月出栏本地黄牛，肉质细腻风味佳' },
    { groupName: '在栏育肥监测群（预估级）', description: '当前在栏育肥牛预估IMF，为出栏决策提供依据' },
  ];
  const groups = [];
  for (const g of imfGroups) {
    const grp = await prisma.imfCattleGroup.create({ data: g });
    groups.push(grp);
  }

  const admin = await prisma.sharedUser.findUnique({ where: { username: 'admin' } });

  // IMF测量对象：
  // 1) 已出栏的西杂（X1001-X1015 sold）: 屠宰前3次测定
  // 2) 已出栏的安格斯（A2029/A2105/A2138 sold）: 屠宰前3次测定
  // 3) 已出栏的黄牛（B1001-B1005 sold）: 屠宰前2次测定
  // 4) 在栏育肥前期 A0001-A0020（安格斯，预估）: 2次
  // 5) 在栏育肥前期 X0001-X0020（西杂，预估）: 2次
  const imfSchedules = [
    // 已出栏西杂 — 屠宰前约3个月、1个月、出栏前10天测定
    { tags: cattleRecs.filter(c=>c._status==='sold' && c.earTag.startsWith('X')).map(c=>c.earTag),
      groupId: groups[0].id,
      offsets: [-90, -30, -10], // 距屠宰日的天数
      slaughterDate: '2023-09-01',
      imfRange: [2.8, 4.2], bfRange: [9, 16], raRange: [58, 82] },
    // 已出栏安格斯
    { tags: cattleRecs.filter(c=>c._status==='sold' && c.earTag.startsWith('A')).map(c=>c.earTag),
      groupId: groups[1].id,
      offsets: [-90, -30, -10],
      slaughterDate: '2023-09-01',
      imfRange: [3.5, 5.8], bfRange: [12, 20], raRange: [65, 90] },
    // 已出栏黄牛
    { tags: cattleRecs.filter(c=>c._status==='sold' && c.earTag.startsWith('B')).map(c=>c.earTag),
      groupId: groups[2].id,
      offsets: [-60, -10],
      slaughterDate: '2023-09-15',
      imfRange: [1.8, 3.0], bfRange: [7, 12], raRange: [45, 62] },
    // 在栏安格斯育肥前期（预估）
    { tags: cattleRecs.filter(c=>c._status==='healthy' && c._pen==='牛舍05' && parseInt(c.earTag.replace('A','')) <= 20).map(c=>c.earTag),
      groupId: groups[3].id,
      offsets: [-60, -10],
      slaughterDate: '2024-02-01',
      imfRange: [2.5, 4.5], bfRange: [10, 18], raRange: [60, 85] },
    // 在栏西杂育肥（预估）
    { tags: cattleRecs.filter(c=>c._status==='healthy' && c._pen==='牛舍01' && parseInt(c.earTag.replace('X','')) <= 20).map(c=>c.earTag),
      groupId: groups[3].id,
      offsets: [-60, -10],
      slaughterDate: '2024-01-15',
      imfRange: [2.2, 3.8], bfRange: [8, 15], raRange: [55, 78] },
  ];

  // 分配imfGroupId
  const tagToGroupId = {};
  for (const sched of imfSchedules) {
    for (const tag of sched.tags) tagToGroupId[tag] = sched.groupId;
  }
  for (const [tag, gid] of Object.entries(tagToGroupId)) {
    const rec = cattleRecs.find(c => c.earTag === tag);
    if (rec) await prisma.sharedCattle.update({ where: { id: rec.id }, data: { imfGroupId: gid } });
  }

  let imfCount = 0;
  for (const sched of imfSchedules) {
    const slaughterMs = new Date(sched.slaughterDate).getTime();
    for (const tag of sched.tags) {
      const rec = cattleRecs.find(c => c.earTag === tag);
      if (!rec) continue;
      let imfBase = rnd(sched.imfRange[0], sched.imfRange[1]);
      for (let oi = 0; oi < sched.offsets.length; oi++) {
        const offset = sched.offsets[oi];
        const mDate = new Date(slaughterMs + offset * 86400000);
        const imfVal = Math.round((imfBase + oi * rnd(0.1, 0.25)) * 100) / 100;
        await prisma.imfMeasurement.create({
          data: {
            cattleId: rec.id, userId: admin.id,
            measurementDate: mDate,
            backfatThickness: rnd(sched.bfRange[0], sched.bfRange[1]),
            ribeyeArea:       rnd(sched.raRange[0], sched.raRange[1]),
            intramuscularFatImf: imfVal,
            ribeyeHeight: rnd(7.5, 12), ribeyeWidth: rnd(10, 16),
            simulatedGrade: calcGrade(imfVal),
            notes: offset === sched.offsets[sched.offsets.length - 1]
              ? `出栏前最终测定，${tag}，等级${calcGrade(imfVal)}`
              : `第${oi + 1}次定期超声测定`,
          },
        });
        imfCount++;
      }
    }
  }
  console.log(`   IMF分组: ${groups.length}组，测量: ${imfCount}条`);

  // ─── 7. 行为监控数据（2023-10-01~07）─────────
  console.log('6. 创建行为监控数据（2023-10-01~07）...');
  const monDates = ['2023-10-01','2023-10-02','2023-10-03','2023-10-04',
                    '2023-10-05','2023-10-06','2023-10-07'];
  const behaviors = ['eating','standing','lying','walking','drinking'];

  // 每天从育肥前期和母牛区各取一部分进行行为记录（共80头/天）
  const activeCattle = cattleRecs.filter(c => c._status === 'healthy');
  const penOrder = ['牛舍01','牛舍02','牛舍03','牛舍04','牛舍05','牛舍06','牛舍07','牛舍08','牛舍09','牛舍10'];
  const behaviorSubjects = [];
  for (const pn of penOrder) {
    const penCattle = activeCattle.filter(c => c._pen === pn);
    behaviorSubjects.push(...penCattle.slice(0, 8)); // 每舍最多8头
  }

  const penCamMap = {}; // penNum -> cameraId
  for (const cam of cameras) {
    const pn = cam.location;
    if (!penCamMap[pn]) penCamMap[pn] = cam.id;
  }

  const behaviorProfile = {
    '牛舍01': { eating:[65,95], standing:[120,180], lying:[290,420], walking:[30,55], drinking:[15,25] },
    '牛舍02': { eating:[65,95], standing:[120,180], lying:[290,420], walking:[30,55], drinking:[15,25] },
    '牛舍03': { eating:[70,95], standing:[110,165], lying:[280,400], walking:[35,60], drinking:[18,28] },
    '牛舍04': { eating:[70,95], standing:[110,165], lying:[280,400], walking:[35,60], drinking:[18,28] },
    '牛舍05': { eating:[75,105], standing:[130,190], lying:[270,390], walking:[35,60], drinking:[18,28] },
    '牛舍06': { eating:[65,90], standing:[120,175], lying:[285,410], walking:[30,55], drinking:[15,25] },
    '牛舍07': { eating:[85,120], standing:[145,220], lying:[260,380], walking:[45,75], drinking:[22,35] },
    '牛舍08': { eating:[80,110], standing:[140,210], lying:[265,385], walking:[40,70], drinking:[20,30] },
    '牛舍09': { eating:[90,125], standing:[150,225], lying:[255,375], walking:[50,80], drinking:[24,36] },
    '牛舍10': { eating:[80,115], standing:[140,210], lying:[260,380], walking:[45,72], drinking:[20,32] },
  };

  let behaviorCount = 0;
  for (const dateStr of monDates) {
    for (const rec of behaviorSubjects) {
      const pen = rec._pen;
      const profile = behaviorProfile[pen] || behaviorProfile['牛舍01'];
      const camId = penCamMap[pen] || cameras[0].id;
      for (const btype of behaviors) {
        const hour = 6 + behaviors.indexOf(btype) * 2 + rndI(0,1);
        const minute = rndI(0, 50);
        const startTime = new Date(`${dateStr}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`);
        const dur = rndI(profile[btype][0], profile[btype][1]);
        await prisma.monitorBehaviorData.create({
          data: { cattleId: rec.id, penId: penMap[pen] || null,
                  behaviorType: btype, startTime,
                  endTime: new Date(startTime.getTime() + dur * 60000),
                  duration: dur, cameraId: camId, confidence: rnd(0.86, 0.99) },
        });
        behaviorCount++;
      }
    }
  }
  console.log(`   行为数据: ${behaviorCount} 条（${behaviorSubjects.length}头 × 7天 × 5类）`);

  // ─── 8. 每日统计（2023-10-01~07，全部在栏牛只）──
  console.log('7. 创建每日统计（全部在栏牛只 × 7天）...');
  let statsCount = 0;
  for (const dateStr of monDates) {
    for (const rec of activeCattle) {
      const pen = rec._pen;
      const profile = behaviorProfile[pen] || behaviorProfile['牛舍01'];
      await prisma.monitorDailyStatistics.upsert({
        where: { cattleId_statDate: { cattleId: rec.id, statDate: d(dateStr) } },
        update: {},
        create: {
          cattleId: rec.id, statDate: d(dateStr),
          eatingTime:   rndI(profile.eating[0],   profile.eating[1]),
          standingTime: rndI(profile.standing[0], profile.standing[1]),
          lyingTime:    rndI(profile.lying[0],    profile.lying[1]),
          walkingTime:  rndI(profile.walking[0],  profile.walking[1]),
          drinkingTime: rndI(profile.drinking[0], profile.drinking[1]),
          totalActiveTime: rndI(380, 500),
        },
      });
      statsCount++;
    }
  }
  console.log(`   每日统计: ${statsCount} 条（${activeCattle.length}头 × 7天）`);

  // ─── 汇总 ────────────────────────────────────
  const totalActive = activeCattle.length;
  const totalSold   = cattleRecs.length - totalActive;
  console.log('\n✅ 全场规模数据重建完成！');
  console.log(`   牛舍: ${PEN_DEFS.length}个 | 摄像头: ${cameras.length}个`);
  console.log(`   牛只: ${cattleRecs.length}头（在栏${totalActive}，已出栏${totalSold}）`);
  console.log(`   IMF: ${groups.length}组（屠宰批独立数据集）| 测量: ${imfCount}条`);
  console.log(`   行为数据: ${behaviorCount}条 | 每日统计: ${statsCount}条`);
  console.log(`   TMR: 保持真实2021年耗料数据不变（993任务，5921喂料事件）`);
  console.log('');
  console.log('   品种分布:');
  const breedCounts = {};
  for (const c of activeCattle) breedCounts[c.breed] = (breedCounts[c.breed]||0)+1;
  for (const [b, n] of Object.entries(breedCounts)) console.log(`     ${b}: ${n}头`);
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
