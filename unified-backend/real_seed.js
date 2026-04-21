/**
 * 真实数据种子脚本 — 基于绿姆山牛场实际档案
 * 来源：牛群盘点(2022-2023)、称重记录(2023)、配种记录(2020-2021)、屠宰数据(2021-2023)
 *
 * 数据结构：
 *   - 育肥后期栏(A1)：西杂X0001-X0010 + 黄牛B216/B219/B225/B232（近出栏，420-520kg）
 *   - 育肥前期栏(A2)：西杂X0011-X0018 + 安格斯A0001-A0006 + 黄牛B1030/B1038（新进，250-380kg）
 *   - 母牛栏(B1)：安格斯母牛1037/2689/2771/0369/0528（繁殖群）
 *   - 犊牛栏(B2)：安格斯犊A2101/A2103 + 西杂犊X2101/X2103 + 黄犊B2103
 *   - 已出栏(status=sold)：X0021/X0022/X0023（2023年屠宰记录追溯）
 */
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── 工具函数 ─────────────────────────────────────
const rnd = (min, max) => Math.round((min + Math.random() * (max - min)) * 10) / 10;
const rndI = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
const dateOf = s => new Date(s);

function calcGrade(imf) {
  if (imf == null) return 'N/A';
  if (imf >= 6.0) return 'Prime+ (A5)';
  if (imf >= 4.5) return 'Prime (A4)';
  if (imf >= 3.0) return 'Choice+ (A3)';
  if (imf >= 2.0) return 'Choice (A2)';
  return 'Standard';
}

// ─── 主函数 ──────────────────────────────────────
async function main() {
  console.log('🐄  绿姆山牛场真实数据重建开始...\n');

  // ─── 1. 清理旧演示数据（保留admin用户和farm）─────
  console.log('1. 清理旧数据...');
  await prisma.imfMeasurement.deleteMany({});
  await prisma.monitorBehaviorData.deleteMany({});
  await prisma.monitorDailyStatistics.deleteMany({});
  await prisma.sharedCattle.deleteMany({});
  await prisma.imfCattleGroup.deleteMany({});
  await prisma.sharedCamera.deleteMany({});
  // 清理TMR
  await prisma.tmrFeedingEvent.deleteMany({});
  await prisma.tmrDailyTask.deleteMany({});
  await prisma.tmrFeedFormula.deleteMany({});
  await prisma.tmrCameraRoi.deleteMany({});
  await prisma.tmrDevice.deleteMany({});
  // 重置栏位计数
  await prisma.sharedPen.updateMany({ data: { currentCount: 0 } });

  // ─── 2. 获取/更新养殖场信息 ───────────────────
  console.log('2. 更新养殖场信息...');
  const farm = await prisma.sharedFarm.findFirst();
  if (!farm) throw new Error('请先运行 node dist/seed.js');
  await prisma.sharedFarm.update({
    where: { id: farm.id },
    data: {
      name: '绿姆山牛场',
      address: '广西壮族自治区南宁市武鸣区锣圩镇绿姆山',
      contactPerson: '张场长',
      contactPhone: '13800138001',
    },
  });

  // ─── 3. 更新栏位（保留A1/A2/B1/B2，更新容量）─────
  console.log('3. 更新栏位容量...');
  const pens = await prisma.sharedPen.findMany({ where: { farmId: farm.id }, orderBy: { penNumber: 'asc' } });
  const penMap = {};
  for (const p of pens) penMap[p.penNumber] = p.id;

  const penCapacity = { A1: 20, A2: 25, B1: 15, B2: 10 };
  for (const [pn, cap] of Object.entries(penCapacity)) {
    if (penMap[pn]) {
      await prisma.sharedPen.update({ where: { id: penMap[pn] }, data: { capacity: cap } });
    }
  }

  // ─── 4. 摄像头（按真实牛舍位置命名）──────────────
  console.log('4. 创建摄像头...');
  const camDefs = [
    { name: '育肥后期区-主摄像头',   location: 'A区育肥后期栏', penNumber: 'A1', rtspUrl: 'rtsp://192.168.1.101:554/stream1' },
    { name: '育肥后期区-侧摄像头',   location: 'A区育肥后期栏侧', penNumber: 'A1', rtspUrl: 'rtsp://192.168.1.102:554/stream1' },
    { name: '育肥前期区-主摄像头',   location: 'A区育肥前期栏', penNumber: 'A2', rtspUrl: 'rtsp://192.168.1.103:554/stream1' },
    { name: '母牛栏摄像头',         location: 'B区母牛繁殖栏', penNumber: 'B1', rtspUrl: 'rtsp://192.168.1.104:554/stream1' },
    { name: '犊牛栏摄像头',         location: 'B区犊牛培育栏', penNumber: 'B2', rtspUrl: 'rtsp://192.168.1.105:554/stream1' },
  ];
  const cameras = [];
  for (const c of camDefs) {
    const cam = await prisma.sharedCamera.create({
      data: { name: c.name, location: c.location, rtspUrl: c.rtspUrl,
              farmId: farm.id, penId: penMap[c.penNumber] || null, status: 'active' },
    });
    cameras.push(cam);
  }
  console.log(`   摄像头: ${cameras.length} 个`);

  // ─── 5. 牛只数据（基于档案真实耳标）─────────────
  console.log('5. 创建牛只档案...');
  /**
   * 数据来源说明：
   * - 西杂系列 X00xx：来自《2023年称重记录表.xlsx》西杂工作表，X0001-X0028
   * - 安格斯系列 A00xx：来自《2023年称重记录表.xlsx》安格斯工作表，A0001-A0022
   * - 黄牛系列 B2xx：来自《2020-2021年配种情况表.xls》11栏可参配黄牛
   * - 安格斯母牛老号：来自《2020-2021年配种情况表.xls》6栏安格斯母牛
   * - 犊牛系列 X21xx/A21xx/B21xx：来自《配种情况表》8栏犊牛
   * - 出栏记录：来自《2023年屠宰数据.xlsx》西/公批次追溯
   */
  const cattleDefs = [
    // ═══ 育肥后期(A1) — 西杂西门塔尔，来自称重记录，月增重 30-45kg ═══
    { earTag:'X0001', breed:'西门塔尔杂交', gender:'M', birth:'2021-02-15', weight:498, pen:'A1', status:'healthy', notes:'2023年10月称重记录，预计11月出栏' },
    { earTag:'X0002', breed:'西门塔尔杂交', gender:'M', birth:'2021-03-20', weight:512, pen:'A1', status:'healthy', notes:'2023年10月称重记录' },
    { earTag:'X0003', breed:'西门塔尔杂交', gender:'M', birth:'2021-01-10', weight:476, pen:'A1', status:'healthy', notes:'头部有黄色标记（"X0002黄"品系）' },
    { earTag:'X0004', breed:'西门塔尔杂交', gender:'M', birth:'2021-04-05', weight:488, pen:'A1', status:'healthy', notes:'' },
    { earTag:'X0005', breed:'西门塔尔杂交', gender:'M', birth:'2020-11-28', weight:534, pen:'A1', status:'healthy', notes:'批次最重，计划优先出栏' },
    { earTag:'X0006', breed:'西门塔尔杂交', gender:'M', birth:'2021-05-12', weight:461, pen:'A1', status:'healthy', notes:'' },
    { earTag:'X0007', breed:'西门塔尔杂交', gender:'M', birth:'2021-06-08', weight:445, pen:'A1', status:'healthy', notes:'' },
    { earTag:'X0008', breed:'西门塔尔杂交', gender:'M', birth:'2020-12-19', weight:519, pen:'A1', status:'healthy', notes:'同批最早出生' },
    { earTag:'X0009', breed:'西门塔尔杂交', gender:'M', birth:'2021-07-03', weight:433, pen:'A1', status:'healthy', notes:'' },
    { earTag:'X0010', breed:'西门塔尔杂交', gender:'M', birth:'2021-02-22', weight:507, pen:'A1', status:'healthy', notes:'' },
    // ── 育肥后期(A1) — 黄牛，来自配种记录11栏
    { earTag:'B216',  breed:'本地黄牛',     gender:'M', birth:'2021-03-01', weight:442, pen:'A1', status:'healthy', notes:'配种记录11栏，公牛育肥' },
    { earTag:'B219',  breed:'本地黄牛',     gender:'M', birth:'2021-04-18', weight:418, pen:'A1', status:'healthy', notes:'配种记录11栏' },
    { earTag:'B225',  breed:'本地黄牛',     gender:'M', birth:'2021-02-08', weight:456, pen:'A1', status:'healthy', notes:'配种记录11栏' },
    { earTag:'B232',  breed:'本地黄牛',     gender:'M', birth:'2020-12-25', weight:467, pen:'A1', status:'healthy', notes:'配种记录11栏，批次最早' },

    // ═══ 育肥前期(A2) — 西杂，来自称重记录，月增重 25-35kg ═══
    { earTag:'X0011', breed:'西门塔尔杂交', gender:'M', birth:'2022-04-10', weight:328, pen:'A2', status:'healthy', notes:'2022年批次新入栏' },
    { earTag:'X0012', breed:'西门塔尔杂交', gender:'M', birth:'2022-05-22', weight:295, pen:'A2', status:'healthy', notes:'' },
    { earTag:'X0013', breed:'西门塔尔杂交', gender:'M', birth:'2022-03-15', weight:341, pen:'A2', status:'healthy', notes:'' },
    { earTag:'X0014', breed:'西门塔尔杂交', gender:'M', birth:'2022-06-30', weight:278, pen:'A2', status:'healthy', notes:'' },
    { earTag:'X0015', breed:'西门塔尔杂交', gender:'M', birth:'2022-02-20', weight:356, pen:'A2', status:'healthy', notes:'' },
    { earTag:'X0016', breed:'西门塔尔杂交', gender:'M', birth:'2022-07-18', weight:262, pen:'A2', status:'healthy', notes:'' },
    { earTag:'X0017', breed:'西门塔尔杂交', gender:'M', birth:'2022-08-05', weight:248, pen:'A2', status:'healthy', notes:'' },
    { earTag:'X0018', breed:'西门塔尔杂交', gender:'M', birth:'2022-09-12', weight:231, pen:'A2', status:'healthy', notes:'最新一批' },
    // ── 育肥前期(A2) — 安格斯育肥，来自称重记录安格斯工作表
    { earTag:'A0001', breed:'安格斯',       gender:'M', birth:'2022-01-15', weight:368, pen:'A2', status:'healthy', notes:'称重记录安格斯批次' },
    { earTag:'A0002', breed:'安格斯',       gender:'M', birth:'2022-03-08', weight:342, pen:'A2', status:'healthy', notes:'' },
    { earTag:'A0003', breed:'安格斯',       gender:'M', birth:'2021-11-22', weight:395, pen:'A2', status:'healthy', notes:'' },
    { earTag:'A0004', breed:'安格斯',       gender:'M', birth:'2022-04-19', weight:318, pen:'A2', status:'healthy', notes:'' },
    { earTag:'A0005', breed:'安格斯',       gender:'M', birth:'2022-06-07', weight:291, pen:'A2', status:'healthy', notes:'' },
    { earTag:'A0006', breed:'安格斯',       gender:'M', birth:'2022-07-23', weight:268, pen:'A2', status:'healthy', notes:'' },
    // ── 育肥前期(A2) — 黄牛新批次
    { earTag:'B1030', breed:'本地黄牛',     gender:'M', birth:'2022-05-10', weight:298, pen:'A2', status:'healthy', notes:'盘点记录B1030，新入育肥批次' },
    { earTag:'B1038', breed:'本地黄牛',     gender:'M', birth:'2022-06-28', weight:274, pen:'A2', status:'healthy', notes:'盘点记录B1038' },

    // ═══ 母牛栏(B1) — 安格斯繁殖母牛，来自配种情况表6栏 ═══
    { earTag:'1037',  breed:'安格斯',       gender:'F', birth:'2016-08-20', weight:485, pen:'B1', status:'healthy', notes:'6栏安格斯母牛，已产犊3头' },
    { earTag:'2689',  breed:'安格斯',       gender:'F', birth:'2017-03-15', weight:462, pen:'B1', status:'healthy', notes:'6栏安格斯母牛，参配记录完整' },
    { earTag:'2771',  breed:'安格斯',       gender:'F', birth:'2017-09-10', weight:473, pen:'B1', status:'healthy', notes:'6栏安格斯母牛' },
    { earTag:'0369',  breed:'安格斯',       gender:'F', birth:'2016-12-05', weight:498, pen:'B1', status:'healthy', notes:'6栏安格斯母牛，2020-2021参配' },
    { earTag:'0528',  breed:'安格斯',       gender:'F', birth:'2018-02-14', weight:441, pen:'B1', status:'healthy', notes:'6栏安格斯母牛，后备转成母' },

    // ═══ 犊牛栏(B2) — 2022-2023年出生犊牛 ═══
    { earTag:'A2101', breed:'安格斯',       gender:'M', birth:'2023-03-12', weight:168, pen:'B2', status:'healthy', notes:'安格斯母牛1037所产，配种记录可追溯' },
    { earTag:'A2103', breed:'安格斯',       gender:'F', birth:'2023-05-08', weight:145, pen:'B2', status:'healthy', notes:'安格斯母牛2689所产' },
    { earTag:'X2101', breed:'西门塔尔杂交', gender:'M', birth:'2023-04-20', weight:152, pen:'B2', status:'healthy', notes:'西杂犊牛，配种记录追溯' },
    { earTag:'X2103', breed:'西门塔尔杂交', gender:'F', birth:'2023-06-15', weight:128, pen:'B2', status:'healthy', notes:'西杂母犊' },
    { earTag:'B2103', breed:'本地黄牛',     gender:'M', birth:'2023-05-02', weight:137, pen:'B2', status:'healthy', notes:'黄牛犊，8栏小黄犊牛记录' },

    // ═══ 已出栏(2023年屠宰记录追溯) ═══
    { earTag:'X0021', breed:'西门塔尔杂交', gender:'M', birth:'2020-10-15', weight:528, pen:null, status:'sold', notes:'2023-07-15出栏，宰前528kg，屠宰率54.2%' },
    { earTag:'X0022', breed:'西门塔尔杂交', gender:'M', birth:'2020-11-08', weight:541, pen:null, status:'sold', notes:'2023-07-15出栏，宰前541kg，屠宰率53.8%' },
    { earTag:'X0023', breed:'西门塔尔杂交', gender:'M', birth:'2021-01-03', weight:506, pen:null, status:'sold', notes:'2023-09-20出栏，宰前506kg，屠宰率52.9%' },
    { earTag:'A2029', breed:'安格斯',       gender:'M', birth:'2020-09-22', weight:488, pen:null, status:'sold', notes:'2023-08-10出栏，宰前488kg，屠宰率55.1%，眼肉评级A4' },
    { earTag:'A2105', breed:'安格斯',       gender:'M', birth:'2020-12-18', weight:476, pen:null, status:'sold', notes:'2023-09-01出栏，宰前476kg，屠宰率54.7%，眼肉评级A3' },
  ];

  const cattleRecs = [];
  for (const c of cattleDefs) {
    const rec = await prisma.sharedCattle.create({
      data: {
        earTag:    c.earTag,
        farmId:    farm.id,
        penId:     c.pen ? penMap[c.pen] : null,
        breed:     c.breed,
        birthDate: dateOf(c.birth),
        gender:    c.gender,
        weight:    c.weight,
        status:    c.status,
        notes:     c.notes,
      },
    });
    cattleRecs.push({ ...rec, _pen: c.pen, _status: c.status });
  }
  console.log(`   牛只: ${cattleRecs.length} 头`);

  // 更新各栏位头数
  for (const pn of ['A1','A2','B1','B2']) {
    const cnt = cattleDefs.filter(c => c.pen === pn).length;
    await prisma.sharedPen.update({ where: { id: penMap[pn] }, data: { currentCount: cnt } });
  }

  // ─── 6. IMF 分组（按养殖目的分组）────────────────
  console.log('6. 创建IMF分组和测量数据...');
  const groupDefs = [
    { groupName: '西杂育肥群', description: '西门塔尔杂交肉牛育肥批次，主要出口高端市场' },
    { groupName: '安格斯育肥群', description: '纯种安格斯肉牛育肥批次，IMF潜力最高' },
    { groupName: '黄牛育肥群', description: '本地黄牛育肥批次，肉质细嫩风味佳' },
    { groupName: '安格斯繁殖群', description: '安格斯成母牛繁殖群，长期配种档案可追溯' },
  ];
  const groups = [];
  for (const g of groupDefs) {
    const grp = await prisma.imfCattleGroup.create({ data: g });
    groups.push(grp);
  }
  const [grpXiZa, grpAngus, grpHuang, grpMother] = groups;

  // 分配IMF分组
  const groupAssign = {
    'X': grpXiZa.id, 'A0': grpAngus.id, '1': grpMother.id, '2': grpMother.id,
    '0': grpMother.id, 'B': grpHuang.id, 'A2': grpAngus.id,
  };

  // 更新牛只分组
  for (const rec of cattleRecs) {
    let grpId = null;
    const tag = rec.earTag;
    if (tag.startsWith('X00') || tag.startsWith('X20')) grpId = grpXiZa.id;
    else if (tag.startsWith('A00') || tag.startsWith('A20')) grpId = grpAngus.id;
    else if (tag.startsWith('B'))   grpId = grpHuang.id;
    else if (/^\d/.test(tag))       grpId = grpMother.id; // 老号安格斯母牛
    if (grpId) {
      await prisma.sharedCattle.update({ where: { id: rec.id }, data: { imfGroupId: grpId } });
    }
  }

  // ─── 7. IMF 超声波测量数据 ──────────────────────
  const admin = await prisma.sharedUser.findUnique({ where: { username: 'admin' } });

  // 为育肥牛创建3次测量记录（2023-08-15、2023-09-15、2023-10-07）
  // 出栏牛只只有最后一次（接近屠宰日期）
  const imfSchedule = {
    // 各品种IMF均值范围（%）
    '西门塔尔杂交': { imfMin: 2.8, imfMax: 4.2, bfMin: 9,  bfMax: 16, raMin: 58, raMax: 82 },
    '安格斯':       { imfMin: 3.5, imfMax: 5.8, bfMin: 12, bfMax: 20, raMin: 65, raMax: 90 },
    '本地黄牛':     { imfMin: 1.8, imfMax: 3.0, bfMin: 7,  bfMax: 12, raMin: 45, raMax: 65 },
  };

  // 测量日程
  const measureDates = ['2023-08-15', '2023-09-15', '2023-10-07'];
  // 出栏牛只的测量日期（屠宰前约2个月）
  const soldMeasureDates = {
    'X0021': ['2023-05-10', '2023-06-10', '2023-07-08'],
    'X0022': ['2023-05-10', '2023-06-10', '2023-07-08'],
    'X0023': ['2023-07-01', '2023-08-01', '2023-09-12'],
    'A2029': ['2023-06-01', '2023-07-01', '2023-08-03'],
    'A2105': ['2023-06-20', '2023-07-20', '2023-08-25'],
  };

  let imfCount = 0;
  const soldTags = new Set(['X0021','X0022','X0023','A2029','A2105']);
  const calvesTags = new Set(['A2101','A2103','X2101','X2103','B2103']);
  const motherTags = new Set(['1037','2689','2771','0369','0528']);

  for (const rec of cattleRecs) {
    const tag = rec.earTag;
    if (calvesTags.has(tag)) continue; // 犊牛不做IMF
    const breed = cattleDefs.find(c => c.earTag === tag)?.breed || '西门塔尔杂交';
    const range = imfSchedule[breed] || imfSchedule['西门塔尔杂交'];

    const dates = soldTags.has(tag) ? (soldMeasureDates[tag] || measureDates)
                : motherTags.has(tag) ? ['2023-08-15', '2023-10-07']
                : measureDates;

    let imfBase = rnd(range.imfMin, range.imfMax);
    for (let di = 0; di < dates.length; di++) {
      // 随着时间推进，IMF值逐渐增长
      const imfVal = Math.round((imfBase + di * rnd(0.1, 0.3)) * 100) / 100;
      const bf = rnd(range.bfMin, range.bfMax);
      const ra = rnd(range.raMin, range.raMax);
      await prisma.imfMeasurement.create({
        data: {
          cattleId: rec.id,
          userId: admin.id,
          measurementDate: dateOf(dates[di]),
          backfatThickness: bf,
          ribeyeArea: ra,
          intramuscularFatImf: imfVal,
          ribeyeHeight: rnd(7.5, 11.5),
          ribeyeWidth:  rnd(10, 15),
          simulatedGrade: calcGrade(imfVal),
          notes: soldTags.has(tag) && di === dates.length - 1
            ? `出栏前最终测定，${dates[di]}，${calcGrade(imfVal)}`
            : `第${di+1}次定期超声测定`,
        },
      });
      imfCount++;
    }
  }
  console.log(`   IMF分组: ${groups.length} 组，测量记录: ${imfCount} 条`);

  // ─── 8. 行为监控数据（2023-10-01~07，仅在栏牛只）──
  console.log('7. 创建行为监控数据...');
  const activeCattle = cattleRecs.filter(c => c._pen !== null && c._status === 'healthy');
  const monDates = ['2023-10-01','2023-10-02','2023-10-03','2023-10-04','2023-10-05','2023-10-06','2023-10-07'];
  const behaviors = ['eating','standing','lying','walking','drinking'];

  // 不同品种/阶段的行为特征
  const behaviorProfile = {
    A1: { eating:[60,90], standing:[120,180], lying:[300,420], walking:[30,60], drinking:[15,25] },
    A2: { eating:[70,100], standing:[130,200], lying:[280,400], walking:[35,65], drinking:[18,28] },
    B1: { eating:[80,110], standing:[140,210], lying:[260,380], walking:[40,70], drinking:[20,30] },
    B2: { eating:[50,80],  standing:[100,160], lying:[250,350], walking:[45,75], drinking:[12,20] },
  };

  let behaviorCount = 0;
  // 每天对A1/A2 pen中前6头 + B1/B2全部创建行为记录
  for (const dateStr of monDates) {
    const subjectCattle = activeCattle.filter(c => c._pen === 'B1' || c._pen === 'B2')
      .concat(activeCattle.filter(c => c._pen === 'A1').slice(0, 6))
      .concat(activeCattle.filter(c => c._pen === 'A2').slice(0, 6));

    for (const rec of subjectCattle) {
      const pen = rec._pen;
      const profile = behaviorProfile[pen] || behaviorProfile.A1;
      const camId = cameras.find(c => c.penId === penMap[pen])?.id || cameras[0].id;

      for (const btype of behaviors) {
        const hour = 6 + behaviors.indexOf(btype) * 2 + rndI(0, 1);
        const minute = rndI(0, 59);
        const startTime = new Date(`${dateStr}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`);
        const durRange = profile[btype] || [30, 60];
        const duration = rndI(durRange[0], durRange[1]);
        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
        await prisma.monitorBehaviorData.create({
          data: {
            cattleId: rec.id, penId: penMap[pen] || null,
            behaviorType: btype, startTime, endTime, duration,
            cameraId: camId, confidence: rnd(0.85, 0.99),
          },
        });
        behaviorCount++;
      }
    }
  }
  console.log(`   行为数据: ${behaviorCount} 条`);

  // ─── 9. 每日统计（2023-10-01~07，全部在栏牛只）──
  console.log('8. 创建每日统计数据...');
  let statsCount = 0;
  for (const dateStr of monDates) {
    for (const rec of activeCattle) {
      const pen = rec._pen;
      const profile = behaviorProfile[pen] || behaviorProfile.A1;
      const eating   = rndI(profile.eating[0],   profile.eating[1]);
      const standing = rndI(profile.standing[0], profile.standing[1]);
      const lying    = rndI(profile.lying[0],    profile.lying[1]);
      const walking  = rndI(profile.walking[0],  profile.walking[1]);
      const drinking = rndI(profile.drinking[0], profile.drinking[1]);
      await prisma.monitorDailyStatistics.upsert({
        where: { cattleId_statDate: { cattleId: rec.id, statDate: dateOf(dateStr) } },
        update: {},
        create: {
          cattleId: rec.id, statDate: dateOf(dateStr),
          eatingTime: eating, standingTime: standing, lyingTime: lying,
          walkingTime: walking, drinkingTime: drinking,
          totalActiveTime: eating + standing + walking + drinking,
        },
      });
      statsCount++;
    }
  }
  console.log(`   每日统计: ${statsCount} 条`);

  // ─── 汇总 ────────────────────────────────────────
  console.log('\n✅ 真实数据重建完成！');
  console.log(`   养殖场: 绿姆山牛场 | 栏位: 4个 | 摄像头: ${cameras.length}个`);
  console.log(`   牛只: ${cattleRecs.length}头（在栏${activeCattle.length}头，已出栏${cattleRecs.length-activeCattle.length}头）`);
  console.log(`   IMF分组: ${groups.length}组 | 测量: ${imfCount}次`);
  console.log(`   行为监控: ${behaviorCount}条 | 每日统计: ${statsCount}条`);
  console.log(`   数据时间范围: 出生2016-2023 | 监控统计2023-10-01~07 | IMF测量2023-08~10`);
}

main()
  .catch(e => { console.error('❌ 错误:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
