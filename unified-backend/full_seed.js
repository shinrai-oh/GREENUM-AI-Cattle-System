/**
 * 完整演示数据种子脚本
 * 填入三个系统（Cattle-Monitoring, TMR, IMF）的完整演示数据
 * 数据时间范围：2020-2023
 */
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('开始填入完整演示数据...');

  // ─────────────────────────────────────────────
  // 1. 确保养殖场和栏位存在（seed.js 已创建基础数据）
  // ─────────────────────────────────────────────
  const farm = await prisma.sharedFarm.findFirst();
  if (!farm) throw new Error('请先运行 node dist/seed.js 创建基础数据');
  console.log(`使用养殖场: ${farm.name} (ID: ${farm.id})`);

  // 更新养殖场详细信息
  await prisma.sharedFarm.update({
    where: { id: farm.id },
    data: {
      address: '广西壮族自治区南宁市武鸣区绿姆山',
      contactPerson: '张场长',
      contactPhone: '13800138001',
    },
  });

  const pens = await prisma.sharedPen.findMany({ where: { farmId: farm.id } });
  const penMap = {};
  for (const p of pens) penMap[p.penNumber] = p.id;
  console.log(`找到栏位: ${Object.keys(penMap).join(', ')}`);

  // ─────────────────────────────────────────────
  // 2. 摄像头
  // ─────────────────────────────────────────────
  const cameraData = [
    { name: 'A1栏摄像头', location: 'A区1号栏', penNumber: 'A1', rtspUrl: 'rtsp://192.168.1.101:554/stream' },
    { name: 'A2栏摄像头', location: 'A区2号栏', penNumber: 'A2', rtspUrl: 'rtsp://192.168.1.102:554/stream' },
    { name: 'B1栏摄像头', location: 'B区1号栏', penNumber: 'B1', rtspUrl: 'rtsp://192.168.1.103:554/stream' },
    { name: 'B2栏摄像头', location: 'B区2号栏', penNumber: 'B2', rtspUrl: 'rtsp://192.168.1.104:554/stream' },
  ];
  const cameras = [];
  for (const c of cameraData) {
    const cam = await prisma.sharedCamera.upsert({
      where: { id: cameras.length + 1 },
      update: { name: c.name, location: c.location, rtspUrl: c.rtspUrl },
      create: {
        name: c.name, location: c.location, rtspUrl: c.rtspUrl,
        farmId: farm.id, penId: penMap[c.penNumber] || null, status: 'active',
      },
    });
    cameras.push(cam);
  }
  console.log(`摄像头: ${cameras.length} 个`);

  // ─────────────────────────────────────────────
  // 3. 牛只（20头，出生日期 2020-2023）
  // ─────────────────────────────────────────────
  const breeds = ['西门塔尔牛', '安格斯牛', '利木赞牛', '夏洛来牛', '本地黄牛'];
  const cattleList = [
    { earTag: 'C001', breed: '西门塔尔牛', birth: '2021-03-15', gender: 'M', weight: 480, pen: 'A1' },
    { earTag: 'C002', breed: '安格斯牛',   birth: '2020-07-22', gender: 'F', weight: 420, pen: 'A1' },
    { earTag: 'C003', breed: '西门塔尔牛', birth: '2022-01-10', gender: 'M', weight: 390, pen: 'A1' },
    { earTag: 'C004', breed: '利木赞牛',   birth: '2021-09-05', gender: 'F', weight: 445, pen: 'A1' },
    { earTag: 'C005', breed: '夏洛来牛',   birth: '2020-11-18', gender: 'M', weight: 510, pen: 'A1' },
    { earTag: 'C006', breed: '安格斯牛',   birth: '2023-02-28', gender: 'F', weight: 310, pen: 'A2' },
    { earTag: 'C007', breed: '本地黄牛',   birth: '2022-06-14', gender: 'M', weight: 365, pen: 'A2' },
    { earTag: 'C008', breed: '西门塔尔牛', birth: '2021-12-03', gender: 'F', weight: 430, pen: 'A2' },
    { earTag: 'C009', breed: '利木赞牛',   birth: '2020-04-19', gender: 'M', weight: 520, pen: 'A2' },
    { earTag: 'C010', breed: '夏洛来牛',   birth: '2023-05-07', gender: 'F', weight: 285, pen: 'A2' },
    { earTag: 'C011', breed: '安格斯牛',   birth: '2021-08-25', gender: 'M', weight: 465, pen: 'B1' },
    { earTag: 'C012', breed: '西门塔尔牛', birth: '2022-03-11', gender: 'F', weight: 415, pen: 'B1' },
    { earTag: 'C013', breed: '本地黄牛',   birth: '2020-09-30', gender: 'M', weight: 495, pen: 'B1' },
    { earTag: 'C014', breed: '利木赞牛',   birth: '2023-01-16', gender: 'F', weight: 295, pen: 'B1' },
    { earTag: 'C015', breed: '夏洛来牛',   birth: '2021-05-20', gender: 'M', weight: 475, pen: 'B1' },
    { earTag: 'C016', breed: '西门塔尔牛', birth: '2022-10-08', gender: 'F', weight: 400, pen: 'B2' },
    { earTag: 'C017', breed: '安格斯牛',   birth: '2020-02-14', gender: 'M', weight: 535, pen: 'B2' },
    { earTag: 'C018', breed: '本地黄牛',   birth: '2023-07-22', gender: 'F', weight: 260, pen: 'B2' },
    { earTag: 'C019', breed: '利木赞牛',   birth: '2021-11-09', gender: 'M', weight: 488, pen: 'B2' },
    { earTag: 'C020', breed: '夏洛来牛',   birth: '2022-08-17', gender: 'F', weight: 425, pen: 'B2' },
  ];

  const cattleIds = [];
  for (const c of cattleList) {
    const cattle = await prisma.sharedCattle.upsert({
      where: { earTag: c.earTag },
      update: {},
      create: {
        earTag: c.earTag,
        farmId: farm.id,
        penId: penMap[c.pen] || null,
        breed: c.breed,
        birthDate: new Date(c.birth),
        gender: c.gender,
        weight: c.weight,
        status: 'healthy',
      },
    });
    cattleIds.push(cattle.id);
  }
  console.log(`牛只: ${cattleIds.length} 头`);

  // 更新栏位当前头数
  for (const [penNum, penId] of Object.entries(penMap)) {
    const count = cattleList.filter(c => c.pen === penNum).length;
    await prisma.sharedPen.update({ where: { id: penId }, data: { currentCount: count } });
  }

  // ─────────────────────────────────────────────
  // 4. 行为监控数据（2023-10-01 ~ 10-07）
  // ─────────────────────────────────────────────
  const behaviors = ['eating', 'standing', 'lying', 'walking', 'drinking'];
  const dates = ['2023-10-01','2023-10-02','2023-10-03','2023-10-04','2023-10-05','2023-10-06','2023-10-07'];

  // 每天为前5头牛生成行为事件
  let behaviorCount = 0;
  for (const dateStr of dates) {
    for (let i = 0; i < 5; i++) {
      const cattleId = cattleIds[i];
      const camId = cameras[Math.floor(i / 5 * cameras.length)].id;
      for (const btype of behaviors) {
        const hour = 6 + behaviors.indexOf(btype) * 2;
        const startTime = new Date(`${dateStr}T${String(hour).padStart(2,'0')}:00:00`);
        const duration = 30 + Math.floor(Math.random() * 60); // 30-90分钟
        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
        await prisma.monitorBehaviorData.create({
          data: {
            cattleId,
            penId: penMap['A1'],
            behaviorType: btype,
            startTime,
            endTime,
            duration,
            cameraId: camId,
            confidence: 0.85 + Math.random() * 0.14,
          },
        });
        behaviorCount++;
      }
    }
  }
  console.log(`行为数据: ${behaviorCount} 条`);

  // ─────────────────────────────────────────────
  // 5. 每日统计数据（2023-10-01 ~ 10-07，全部20头）
  // ─────────────────────────────────────────────
  let statsCount = 0;
  for (const dateStr of dates) {
    for (const cattleId of cattleIds) {
      const eating   = 180 + Math.floor(Math.random() * 120); // 3-5h
      const standing = 240 + Math.floor(Math.random() * 120); // 4-6h
      const lying    = 360 + Math.floor(Math.random() * 120); // 6-8h
      const walking  = 60  + Math.floor(Math.random() * 60);  // 1-2h
      const drinking = 20  + Math.floor(Math.random() * 20);  // 20-40min
      await prisma.monitorDailyStatistics.upsert({
        where: { cattleId_statDate: { cattleId, statDate: new Date(dateStr) } },
        update: {},
        create: {
          cattleId,
          statDate: new Date(dateStr),
          eatingTime: eating,
          standingTime: standing,
          lyingTime: lying,
          walkingTime: walking,
          drinkingTime: drinking,
          totalActiveTime: eating + standing + walking + drinking,
        },
      });
      statsCount++;
    }
  }
  console.log(`每日统计: ${statsCount} 条`);

  // ─────────────────────────────────────────────
  // 6. TMR 设备、配方、任务、喂料事件
  // ─────────────────────────────────────────────

  // 6.1 设备
  const deviceDefs = [
    { name: '后期牛TMR搅拌车', cameraIp: 'rtsp://192.168.1.201:554/stream', status: 'idle' },
    { name: '前期牛TMR搅拌车', cameraIp: 'rtsp://192.168.1.202:554/stream', status: 'idle' },
    { name: '母牛TMR搅拌车',   cameraIp: 'rtsp://192.168.1.203:554/stream', status: 'idle' },
  ];
  const devices = [];
  for (const d of deviceDefs) {
    const dev = await prisma.tmrDevice.upsert({
      where: { id: devices.length + 1 },
      update: { name: d.name },
      create: { name: d.name, cameraIp: d.cameraIp, status: d.status },
    });
    devices.push(dev);
  }

  // 6.2 饲料配方
  const formulaDefs = [
    {
      name: '后期育肥配方',
      items: [
        { material: '精料', targetWeightKg: 8.5 },
        { material: '青贮', targetWeightKg: 15.0 },
        { material: '啤酒糟', targetWeightKg: 5.0 },
        { material: '发酵料', targetWeightKg: 3.0 },
        { material: '麦秆', targetWeightKg: 2.0 },
      ],
    },
    {
      name: '前期育肥配方',
      items: [
        { material: '精料', targetWeightKg: 6.0 },
        { material: '青贮', targetWeightKg: 12.0 },
        { material: '啤酒糟', targetWeightKg: 4.0 },
        { material: '糖蜜', targetWeightKg: 1.5 },
        { material: '甘蔗梢', targetWeightKg: 8.0 },
      ],
    },
    {
      name: '母牛维持配方',
      items: [
        { material: '精料', targetWeightKg: 4.0 },
        { material: '青贮', targetWeightKg: 10.0 },
        { material: '麦秆', targetWeightKg: 3.0 },
        { material: '糖蜜', targetWeightKg: 1.0 },
      ],
    },
  ];
  const formulas = [];
  for (const f of formulaDefs) {
    const formula = await prisma.tmrFeedFormula.upsert({
      where: { id: formulas.length + 1 },
      update: { name: f.name, items: f.items },
      create: { name: f.name, items: f.items },
    });
    formulas.push(formula);
  }

  // 6.3 每日任务 + 喂料事件（2023年10月整月）
  const tmrDates = [];
  for (let d = 1; d <= 31; d++) {
    try { tmrDates.push(new Date(`2023-10-${String(d).padStart(2,'0')}`)); } catch {}
  }
  // 加上9月最后一周
  for (let d = 24; d <= 30; d++) {
    tmrDates.unshift(new Date(`2023-09-${String(d).padStart(2,'0')}`));
  }

  let taskCount = 0, eventCount = 0;
  for (const taskDate of tmrDates) {
    for (let di = 0; di < devices.length; di++) {
      const task = await prisma.tmrDailyTask.create({
        data: {
          deviceId: devices[di].id,
          taskDate,
          formulaId: formulas[di].id,
          status: 'done',
        },
      });
      taskCount++;

      // 上午喂料事件
      const sessions = [
        { hour: 7, minute: 30 },
        { hour: 14, minute: 0 },
      ];
      for (const sess of sessions) {
        const baseTime = new Date(taskDate);
        baseTime.setHours(sess.hour, sess.minute, 0, 0);
        const items = formulaDefs[di].items;
        for (let ii = 0; ii < items.length; ii++) {
          const t = new Date(baseTime.getTime() + ii * 3 * 60 * 1000);
          const actualWeight = items[ii].targetWeightKg * (0.95 + Math.random() * 0.1);
          await prisma.tmrFeedingEvent.create({
            data: {
              deviceId: devices[di].id,
              timestamp: t,
              material: items[ii].material,
              weight: Math.round(actualWeight * 100) / 100,
            },
          });
          eventCount++;
        }
      }
    }
  }
  console.log(`TMR任务: ${taskCount} 条, 喂料事件: ${eventCount} 条`);

  // ─────────────────────────────────────────────
  // 7. IMF 牛只分组和测量数据
  // ─────────────────────────────────────────────
  const groupDefs = [
    { groupName: 'A组（高IMF潜力）', description: '预期IMF≥3.5%' },
    { groupName: 'B组（中IMF潜力）', description: '预期IMF 2.5-3.5%' },
    { groupName: 'C组（标准）',       description: '预期IMF<2.5%' },
  ];
  const imfGroups = [];
  for (const g of groupDefs) {
    const grp = await prisma.imfCattleGroup.upsert({
      where: { id: imfGroups.length + 1 },
      update: { groupName: g.groupName },
      create: { groupName: g.groupName, description: g.description },
    });
    imfGroups.push(grp);
  }

  // 将牛分配到 IMF 分组
  for (let i = 0; i < cattleIds.length; i++) {
    const groupId = imfGroups[i % 3].id;
    await prisma.sharedCattle.update({
      where: { id: cattleIds[i] },
      data: { imfGroupId: groupId },
    });
  }

  // 获取 admin 用户 id
  const admin = await prisma.sharedUser.findUnique({ where: { username: 'admin' } });

  // IMF 测量数据
  const imfMeasureDates = ['2023-08-15', '2023-09-15', '2023-10-07'];
  let imfCount = 0;
  for (const cattle of await prisma.sharedCattle.findMany({ take: 10 })) {
    for (const mdate of imfMeasureDates) {
      const imfVal = 2.0 + Math.random() * 2.5;
      await prisma.imfMeasurement.create({
        data: {
          cattleId: cattle.id,
          userId: admin.id,
          measurementDate: new Date(mdate),
          backfatThickness: 8 + Math.random() * 12,
          ribeyeArea: 50 + Math.random() * 30,
          intramuscularFatImf: Math.round(imfVal * 100) / 100,
          ribeyeHeight: 8 + Math.random() * 4,
          ribeyeWidth: 10 + Math.random() * 5,
          simulatedGrade: imfVal >= 3.5 ? 'A级' : imfVal >= 2.5 ? 'B级' : 'C级',
          notes: '超声波测定',
        },
      });
      imfCount++;
    }
  }
  console.log(`IMF分组: ${imfGroups.length} 组, 测量记录: ${imfCount} 条`);

  // ─────────────────────────────────────────────
  // 完成
  // ─────────────────────────────────────────────
  console.log('\n✅ 全部演示数据填入完成！');
  console.log('  - 摄像头: 4个');
  console.log(`  - 牛只: ${cattleIds.length}头（出生年份 2020-2023）`);
  console.log(`  - 行为数据: ${behaviorCount}条（2023-10-01~07）`);
  console.log(`  - 每日统计: ${statsCount}条（2023-10-01~07）`);
  console.log(`  - TMR任务: ${taskCount}条 / 喂料事件: ${eventCount}条`);
  console.log(`  - IMF测量: ${imfCount}条`);
}

main()
  .catch(e => { console.error('❌ 错误:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
