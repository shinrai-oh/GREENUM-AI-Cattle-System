/**
 * IMF 系统自动种子数据
 * 为 IMF 肉质评估系统生成包含多时间点测量记录的示范数据，
 * 使"查看趋势"功能能正常展示 IMF 历次变化折线图。
 */
import bcrypt from 'bcryptjs';
import prisma from './db';

function calcGrade(imf: number | null): string {
  if (imf == null) return 'N/A';
  if (imf >= 6.0) return 'Prime+ (A5)';
  if (imf >= 4.5) return 'Prime (A4)';
  if (imf >= 3.0) return 'Choice+ (A3)';
  if (imf >= 2.0) return 'Choice (A2)';
  return 'Standard';
}

export async function runImfSeed() {
  // 检查 E1001 是否存在且有足够的历史测量记录
  const e1001 = await prisma.sharedCattle.findUnique({ where: { earTag: 'E1001' } });
  const e1001MeasureCount = e1001
    ? await prisma.imfMeasurement.count({ where: { cattleId: e1001.id } })
    : 0;

  // E1001 已有 ≥6 条测量时认为示范数据已齐全，跳过
  if (e1001 && e1001MeasureCount >= 6) return;

  console.log('IMF seed: 开始写入示范数据...');

  // ── operator 用户 ──────────────────────────────────────────────
  let operator = await prisma.sharedUser.findFirst({ where: { role: 'operator' } });
  if (!operator) {
    const hash = await bcrypt.hash('operator123', 10);
    operator = await prisma.sharedUser.create({
      data: { username: 'operator', passwordHash: hash, role: 'operator' },
    });
  }

  // ── 默认牧场 ───────────────────────────────────────────────────
  let farm = await prisma.sharedFarm.findFirst();
  if (!farm) {
    console.log('IMF seed: 未找到牧场，跳过');
    return;
  }

  // ── IMF 分组 ───────────────────────────────────────────────────
  const groups = [
    { id: 1, groupName: '育肥A组',   description: '高能量饲喂' },
    { id: 2, groupName: '后备母牛群', description: '维持饲喂' },
    { id: 3, groupName: '试验C组',   description: '不同配方对比' },
    { id: 4, groupName: '草饲D组',   description: '草饲为主' },
  ];
  for (const g of groups) {
    await prisma.imfCattleGroup.upsert({
      where: { id: g.id },
      update: {},
      create: g,
    });
  }

  // ── 牛只档案 ───────────────────────────────────────────────────
  const cattleDefs = [
    { earTag: 'E1001', breed: '西门塔尔',   gender: 'M', birth: '2023-03-05', groupId: 1 },
    { earTag: 'E1002', breed: '安格斯',     gender: 'F', birth: '2023-02-21', groupId: 2 },
    { earTag: 'E1003', breed: '安格斯',     gender: 'M', birth: '2022-12-10', groupId: 1 },
    { earTag: 'E1004', breed: '含安格斯杂交', gender: 'F', birth: '2023-01-12', groupId: 3 },
    { earTag: 'E1005', breed: '夏洛来',     gender: 'M', birth: '2022-11-03', groupId: 4 },
    { earTag: 'E1006', breed: '西门塔尔',   gender: 'F', birth: '2023-04-18', groupId: 1 },
    { earTag: 'E1007', breed: '安格斯',     gender: 'F', birth: '2023-05-02', groupId: 2 },
    { earTag: 'E1008', breed: '利木赞',     gender: 'M', birth: '2022-10-26', groupId: 3 },
    { earTag: 'E1009', breed: '海福特',     gender: 'M', birth: '2023-06-30', groupId: 4 },
    { earTag: 'E1010', breed: '安格斯',     gender: 'F', birth: '2023-07-14', groupId: 1 },
  ];

  const cattleIdMap: Record<string, number> = {};
  for (const cd of cattleDefs) {
    const c = await prisma.sharedCattle.upsert({
      where: { earTag: cd.earTag },
      update: { imfGroupId: cd.groupId },
      create: {
        earTag:      cd.earTag,
        farmId:      farm.id,
        breed:       cd.breed,
        gender:      cd.gender,
        birthDate:   new Date(cd.birth),
        imfGroupId:  cd.groupId,
        status:      'active',
      },
    });
    cattleIdMap[cd.earTag] = c.id;
  }

  // 若已有测量记录过多则保留，否则清空重建
  if (imfMeasureCount > 0 && imfMeasureCount < 30) {
    await prisma.imfMeasurement.deleteMany({});
  }

  // ── 测量记录（每头 4-8 个时间点，展示 IMF 随育肥时间增长趋势）──
  type Sample = { earTag: string; date: string; backfat: number; area: number; imf: number; h: number; w: number };
  const samples: Sample[] = [
    // E1001 西门塔尔 male 育肥A组 — 高能量饲喂，IMF 快速增长
    { earTag:'E1001', date:'2025-03-01', backfat:2.2, area:75.0, imf:2.0, h:6.8, w:10.2 },
    { earTag:'E1001', date:'2025-04-01', backfat:2.5, area:77.5, imf:2.5, h:6.9, w:10.5 },
    { earTag:'E1001', date:'2025-05-01', backfat:2.8, area:80.0, imf:3.0, h:7.0, w:10.7 },
    { earTag:'E1001', date:'2025-06-01', backfat:3.0, area:82.5, imf:3.5, h:7.2, w:10.9 },
    { earTag:'E1001', date:'2025-07-01', backfat:3.3, area:85.0, imf:4.0, h:7.4, w:11.0 },
    { earTag:'E1001', date:'2025-08-01', backfat:3.6, area:87.0, imf:4.4, h:7.5, w:11.1 },
    { earTag:'E1001', date:'2025-09-01', backfat:3.8, area:88.5, imf:4.8, h:7.7, w:11.2 },
    { earTag:'E1001', date:'2025-10-01', backfat:4.0, area:90.0, imf:5.3, h:7.8, w:11.4 },

    // E1002 安格斯 female 后备母牛群 — 维持饲喂，IMF 缓慢增长
    { earTag:'E1002', date:'2025-03-05', backfat:1.5, area:70.0, imf:1.6, h:6.4, w:9.8  },
    { earTag:'E1002', date:'2025-04-05', backfat:1.7, area:71.5, imf:1.9, h:6.5, w:9.9  },
    { earTag:'E1002', date:'2025-05-05', backfat:1.8, area:73.0, imf:2.2, h:6.6, w:10.0 },
    { earTag:'E1002', date:'2025-06-05', backfat:2.0, area:74.5, imf:2.5, h:6.7, w:10.1 },
    { earTag:'E1002', date:'2025-07-05', backfat:2.1, area:75.5, imf:2.8, h:6.8, w:10.2 },
    { earTag:'E1002', date:'2025-08-05', backfat:2.2, area:76.5, imf:3.0, h:6.9, w:10.3 },
    { earTag:'E1002', date:'2025-09-05', backfat:2.3, area:77.0, imf:3.2, h:7.0, w:10.4 },
    { earTag:'E1002', date:'2025-10-05', backfat:2.4, area:78.0, imf:3.5, h:7.1, w:10.5 },

    // E1003 安格斯 male 育肥A组 — 高基础 IMF，迅速突破 Prime+
    { earTag:'E1003', date:'2025-03-01', backfat:3.5, area:82.0, imf:3.8, h:7.5, w:11.0 },
    { earTag:'E1003', date:'2025-04-01', backfat:3.9, area:85.0, imf:4.3, h:7.7, w:11.3 },
    { earTag:'E1003', date:'2025-05-01', backfat:4.2, area:87.5, imf:4.8, h:7.9, w:11.6 },
    { earTag:'E1003', date:'2025-06-01', backfat:4.5, area:90.0, imf:5.3, h:8.0, w:11.9 },
    { earTag:'E1003', date:'2025-07-01', backfat:4.7, area:91.5, imf:5.8, h:8.1, w:12.0 },
    { earTag:'E1003', date:'2025-08-20', backfat:5.0, area:93.0, imf:6.2, h:8.2, w:12.2 },
    { earTag:'E1003', date:'2025-09-20', backfat:5.2, area:94.5, imf:6.6, h:8.3, w:12.4 },
    { earTag:'E1003', date:'2025-10-20', backfat:5.5, area:96.0, imf:7.0, h:8.4, w:12.6 },

    // E1004 含安格斯杂交 female 试验C组
    { earTag:'E1004', date:'2025-03-01', backfat:2.0, area:72.0, imf:2.2, h:6.5, w:10.0 },
    { earTag:'E1004', date:'2025-05-01', backfat:2.3, area:74.5, imf:2.7, h:6.7, w:10.3 },
    { earTag:'E1004', date:'2025-07-15', backfat:2.7, area:78.0, imf:3.2, h:7.0, w:10.7 },
    { earTag:'E1004', date:'2025-09-16', backfat:3.0, area:81.0, imf:3.6, h:7.2, w:11.0 },
    { earTag:'E1004', date:'2025-10-16', backfat:3.2, area:83.0, imf:4.0, h:7.3, w:11.2 },

    // E1005 夏洛来 male 草饲D组
    { earTag:'E1005', date:'2025-03-01', backfat:3.8, area:86.0, imf:4.2, h:7.8, w:11.5 },
    { earTag:'E1005', date:'2025-05-01', backfat:4.2, area:89.0, imf:4.8, h:8.0, w:11.8 },
    { earTag:'E1005', date:'2025-07-01', backfat:4.6, area:92.0, imf:5.4, h:8.2, w:12.1 },
    { earTag:'E1005', date:'2025-08-01', backfat:4.8, area:93.5, imf:5.8, h:8.3, w:12.3 },
    { earTag:'E1005', date:'2025-09-01', backfat:5.0, area:95.0, imf:6.2, h:8.4, w:12.5 },

    // E1006 西门塔尔 female 育肥A组
    { earTag:'E1006', date:'2025-04-01', backfat:1.6, area:70.0, imf:1.5, h:6.3, w:9.8  },
    { earTag:'E1006', date:'2025-06-01', backfat:1.8, area:72.0, imf:2.0, h:6.5, w:10.0 },
    { earTag:'E1006', date:'2025-08-01', backfat:2.0, area:74.5, imf:2.5, h:6.7, w:10.2 },
    { earTag:'E1006', date:'2025-09-22', backfat:2.2, area:76.0, imf:2.8, h:6.8, w:10.4 },
    { earTag:'E1006', date:'2025-10-22', backfat:2.5, area:78.0, imf:3.2, h:7.0, w:10.6 },

    // E1007 安格斯 female 后备母牛群
    { earTag:'E1007', date:'2025-04-01', backfat:2.5, area:76.0, imf:2.8, h:7.0, w:10.5 },
    { earTag:'E1007', date:'2025-06-01', backfat:2.9, area:79.0, imf:3.4, h:7.2, w:10.8 },
    { earTag:'E1007', date:'2025-08-01', backfat:3.2, area:82.0, imf:3.9, h:7.4, w:11.0 },
    { earTag:'E1007', date:'2025-09-28', backfat:3.5, area:85.0, imf:4.3, h:7.5, w:11.2 },
    { earTag:'E1007', date:'2025-10-28', backfat:3.8, area:87.0, imf:4.7, h:7.7, w:11.5 },

    // E1008 利木赞 male 试验C组
    { earTag:'E1008', date:'2025-04-01', backfat:3.0, area:82.0, imf:3.5, h:7.5, w:11.0 },
    { earTag:'E1008', date:'2025-06-01', backfat:3.4, area:85.0, imf:4.2, h:7.7, w:11.3 },
    { earTag:'E1008', date:'2025-07-03', backfat:3.7, area:88.0, imf:4.7, h:7.9, w:11.7 },
    { earTag:'E1008', date:'2025-09-03', backfat:4.0, area:91.0, imf:5.2, h:8.0, w:12.0 },
    { earTag:'E1008', date:'2025-10-03', backfat:4.3, area:93.0, imf:5.7, h:8.2, w:12.2 },

    // E1009 海福特 male 草饲D组
    { earTag:'E1009', date:'2025-05-01', backfat:1.8, area:72.0, imf:2.1, h:6.6, w:10.1 },
    { earTag:'E1009', date:'2025-07-01', backfat:2.1, area:75.0, imf:2.6, h:6.8, w:10.4 },
    { earTag:'E1009', date:'2025-09-01', backfat:2.3, area:77.5, imf:3.1, h:7.0, w:10.7 },
    { earTag:'E1009', date:'2025-10-02', backfat:2.5, area:79.0, imf:3.4, h:7.1, w:10.9 },

    // E1010 安格斯 female 育肥A组
    { earTag:'E1010', date:'2025-04-01', backfat:2.2, area:74.0, imf:2.6, h:6.8, w:10.3 },
    { earTag:'E1010', date:'2025-06-01', backfat:2.6, area:77.5, imf:3.2, h:7.1, w:10.6 },
    { earTag:'E1010', date:'2025-08-01', backfat:3.0, area:81.0, imf:3.8, h:7.3, w:10.9 },
    { earTag:'E1010', date:'2025-10-03', backfat:3.3, area:84.0, imf:4.2, h:7.5, w:11.1 },
  ];

  let inserted = 0;
  for (const s of samples) {
    const cattleId = cattleIdMap[s.earTag];
    if (!cattleId) continue;
    await prisma.imfMeasurement.create({
      data: {
        cattleId,
        userId:              operator.id,
        measurementDate:     new Date(`${s.date}T10:00:00Z`),
        backfatThickness:    s.backfat,
        ribeyeArea:          s.area,
        intramuscularFatImf: s.imf,
        ribeyeHeight:        s.h,
        ribeyeWidth:         s.w,
        simulatedGrade:      calcGrade(s.imf),
        notes:               `自动种子-${s.earTag}`,
      },
    });
    inserted++;
  }

  console.log(`IMF seed 完成：${cattleDefs.length} 头牛，${inserted} 条测量记录`);
}
