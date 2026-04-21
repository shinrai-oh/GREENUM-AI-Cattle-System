import { getPrisma } from './db';
import bcrypt from 'bcryptjs';
import { calculateMockGrade } from './mockGrade';

export async function runDevSeed() {
  const prisma = getPrisma();

  const userCount    = await prisma.user.count();
  const cattleCount  = await prisma.cattleProfile.count();
  const measureCount = await prisma.measurement.count();

  if (userCount > 0 && cattleCount > 0 && measureCount >= 30) {
    return; // already seeded with sufficient data
  }

  const adminHash = await bcrypt.hash('admin123', 10);
  const opHash    = await bcrypt.hash('operator123', 10);

  await prisma.user.upsert({ where: { username: 'admin' },    update: {}, create: { username: 'admin',    passwordHash: adminHash, role: 'admin'    } });
  await prisma.user.upsert({ where: { username: 'operator' }, update: {}, create: { username: 'operator', passwordHash: opHash,    role: 'operator' } });
  const operator   = await prisma.user.findUnique({ where: { username: 'operator' } });
  const operatorId = operator!.id;

  const gA = await prisma.cattleGroup.upsert({ where: { id: 1 }, update: {}, create: { id: 1, groupName: '育肥A组',   description: '高能量饲喂' } });
  const gB = await prisma.cattleGroup.upsert({ where: { id: 2 }, update: {}, create: { id: 2, groupName: '后备母牛群', description: '维持饲喂' } });
  const gC = await prisma.cattleGroup.upsert({ where: { id: 3 }, update: {}, create: { id: 3, groupName: '试验C组',   description: '不同配方对比' } });
  const gD = await prisma.cattleGroup.upsert({ where: { id: 4 }, update: {}, create: { id: 4, groupName: '草饲D组',   description: '草饲为主' } });

  const c1  = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1001' }, update: {}, create: { earTagId: 'E1001', birthDate: new Date('2023-03-05'), breed: '西门塔尔',   sex: 'male',   sireEarTagId: 'S001', damEarTagId: 'D001', groupId: gA.id } });
  const c2  = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1002' }, update: {}, create: { earTagId: 'E1002', birthDate: new Date('2023-02-21'), breed: '安格斯',     sex: 'female', sireEarTagId: 'S002', damEarTagId: 'D002', groupId: gB.id } });
  const c3  = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1003' }, update: {}, create: { earTagId: 'E1003', birthDate: new Date('2022-12-10'), breed: '安格斯',     sex: 'male',   sireEarTagId: 'S003', damEarTagId: 'D003', groupId: gA.id } });
  const c4  = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1004' }, update: {}, create: { earTagId: 'E1004', birthDate: new Date('2023-01-12'), breed: '含安格斯杂交', sex: 'female', sireEarTagId: 'S004', damEarTagId: 'D004', groupId: gC.id } });
  const c5  = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1005' }, update: {}, create: { earTagId: 'E1005', birthDate: new Date('2022-11-03'), breed: '夏洛来',     sex: 'male',   sireEarTagId: 'S005', damEarTagId: 'D005', groupId: gD.id } });
  const c6  = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1006' }, update: {}, create: { earTagId: 'E1006', birthDate: new Date('2023-04-18'), breed: '西门塔尔',   sex: 'female', sireEarTagId: 'S006', damEarTagId: 'D006', groupId: gA.id } });
  const c7  = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1007' }, update: {}, create: { earTagId: 'E1007', birthDate: new Date('2023-05-02'), breed: '安格斯',     sex: 'female', sireEarTagId: 'S007', damEarTagId: 'D007', groupId: gB.id } });
  const c8  = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1008' }, update: {}, create: { earTagId: 'E1008', birthDate: new Date('2022-10-26'), breed: '利木赞',     sex: 'male',   sireEarTagId: 'S008', damEarTagId: 'D008', groupId: gC.id } });
  const c9  = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1009' }, update: {}, create: { earTagId: 'E1009', birthDate: new Date('2023-06-30'), breed: '海福特',     sex: 'male',   sireEarTagId: 'S009', damEarTagId: 'D009', groupId: gD.id } });
  const c10 = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1010' }, update: {}, create: { earTagId: 'E1010', birthDate: new Date('2023-07-14'), breed: '安格斯',     sex: 'female', sireEarTagId: 'S010', damEarTagId: 'D010', groupId: gA.id } });

  // 若已有测量但数量不足 30 条，清空重建
  if (measureCount > 0 && measureCount < 30) {
    await prisma.measurement.deleteMany({});
  }

  type S = { cattleProfileId: number; date: string; backfat: number; area: number; imf: number; h: number; w: number; notes: string };
  const samples: S[] = [
    // E1001 西门塔尔 male 育肥A组
    { cattleProfileId: c1.id,  date: '2025-03-01T10:00:00Z', backfat: 2.2, area: 75.0, imf: 2.0, h: 6.8, w: 10.2, notes: 'IMG-001-M1' },
    { cattleProfileId: c1.id,  date: '2025-04-01T10:00:00Z', backfat: 2.5, area: 77.5, imf: 2.5, h: 6.9, w: 10.5, notes: 'IMG-001-M2' },
    { cattleProfileId: c1.id,  date: '2025-05-01T10:00:00Z', backfat: 2.8, area: 80.0, imf: 3.0, h: 7.0, w: 10.7, notes: 'IMG-001-M3' },
    { cattleProfileId: c1.id,  date: '2025-06-01T10:00:00Z', backfat: 3.0, area: 82.5, imf: 3.5, h: 7.2, w: 10.9, notes: 'IMG-001-M4' },
    { cattleProfileId: c1.id,  date: '2025-07-01T10:00:00Z', backfat: 3.3, area: 85.0, imf: 4.0, h: 7.4, w: 11.0, notes: 'IMG-001-M5' },
    { cattleProfileId: c1.id,  date: '2025-08-01T10:00:00Z', backfat: 3.6, area: 87.0, imf: 4.4, h: 7.5, w: 11.1, notes: 'IMG-001-M6' },
    { cattleProfileId: c1.id,  date: '2025-09-01T10:00:00Z', backfat: 3.8, area: 88.5, imf: 4.8, h: 7.7, w: 11.2, notes: 'IMG-001-M7' },
    { cattleProfileId: c1.id,  date: '2025-10-01T10:00:00Z', backfat: 4.0, area: 90.0, imf: 5.3, h: 7.8, w: 11.4, notes: 'IMG-001-M8' },
    // E1002 安格斯 female 后备母牛群
    { cattleProfileId: c2.id,  date: '2025-03-05T10:00:00Z', backfat: 1.5, area: 70.0, imf: 1.6, h: 6.4, w:  9.8, notes: 'IMG-002-M1' },
    { cattleProfileId: c2.id,  date: '2025-04-05T10:00:00Z', backfat: 1.7, area: 71.5, imf: 1.9, h: 6.5, w:  9.9, notes: 'IMG-002-M2' },
    { cattleProfileId: c2.id,  date: '2025-05-05T10:00:00Z', backfat: 1.8, area: 73.0, imf: 2.2, h: 6.6, w: 10.0, notes: 'IMG-002-M3' },
    { cattleProfileId: c2.id,  date: '2025-06-05T10:00:00Z', backfat: 2.0, area: 74.5, imf: 2.5, h: 6.7, w: 10.1, notes: 'IMG-002-M4' },
    { cattleProfileId: c2.id,  date: '2025-07-05T10:00:00Z', backfat: 2.1, area: 75.5, imf: 2.8, h: 6.8, w: 10.2, notes: 'IMG-002-M5' },
    { cattleProfileId: c2.id,  date: '2025-08-05T10:00:00Z', backfat: 2.2, area: 76.5, imf: 3.0, h: 6.9, w: 10.3, notes: 'IMG-002-M6' },
    { cattleProfileId: c2.id,  date: '2025-09-05T10:00:00Z', backfat: 2.3, area: 77.0, imf: 3.2, h: 7.0, w: 10.4, notes: 'IMG-002-M7' },
    { cattleProfileId: c2.id,  date: '2025-10-05T10:00:00Z', backfat: 2.4, area: 78.0, imf: 3.5, h: 7.1, w: 10.5, notes: 'IMG-002-M8' },
    // E1003 安格斯 male 育肥A组
    { cattleProfileId: c3.id,  date: '2025-03-01T10:00:00Z', backfat: 3.5, area: 82.0, imf: 3.8, h: 7.5, w: 11.0, notes: 'IMG-003-M1' },
    { cattleProfileId: c3.id,  date: '2025-04-01T10:00:00Z', backfat: 3.9, area: 85.0, imf: 4.3, h: 7.7, w: 11.3, notes: 'IMG-003-M2' },
    { cattleProfileId: c3.id,  date: '2025-05-01T10:00:00Z', backfat: 4.2, area: 87.5, imf: 4.8, h: 7.9, w: 11.6, notes: 'IMG-003-M3' },
    { cattleProfileId: c3.id,  date: '2025-06-01T10:00:00Z', backfat: 4.5, area: 90.0, imf: 5.3, h: 8.0, w: 11.9, notes: 'IMG-003-M4' },
    { cattleProfileId: c3.id,  date: '2025-07-01T10:00:00Z', backfat: 4.7, area: 91.5, imf: 5.8, h: 8.1, w: 12.0, notes: 'IMG-003-M5' },
    { cattleProfileId: c3.id,  date: '2025-08-20T10:00:00Z', backfat: 5.0, area: 93.0, imf: 6.2, h: 8.2, w: 12.2, notes: 'IMG-003-M6' },
    { cattleProfileId: c3.id,  date: '2025-09-20T10:00:00Z', backfat: 5.2, area: 94.5, imf: 6.6, h: 8.3, w: 12.4, notes: 'IMG-003-M7' },
    { cattleProfileId: c3.id,  date: '2025-10-20T10:00:00Z', backfat: 5.5, area: 96.0, imf: 7.0, h: 8.4, w: 12.6, notes: 'IMG-003-M8' },
    // E1004 含安格斯杂交 female 试验C组
    { cattleProfileId: c4.id,  date: '2025-03-01T10:00:00Z', backfat: 2.0, area: 72.0, imf: 2.2, h: 6.5, w: 10.0, notes: 'IMG-004-M1' },
    { cattleProfileId: c4.id,  date: '2025-05-01T10:00:00Z', backfat: 2.3, area: 74.5, imf: 2.7, h: 6.7, w: 10.3, notes: 'IMG-004-M2' },
    { cattleProfileId: c4.id,  date: '2025-07-15T10:00:00Z', backfat: 2.7, area: 78.0, imf: 3.2, h: 7.0, w: 10.7, notes: 'IMG-004-M3' },
    { cattleProfileId: c4.id,  date: '2025-09-16T10:00:00Z', backfat: 3.0, area: 81.0, imf: 3.6, h: 7.2, w: 11.0, notes: 'IMG-004-M4' },
    { cattleProfileId: c4.id,  date: '2025-10-16T10:00:00Z', backfat: 3.2, area: 83.0, imf: 4.0, h: 7.3, w: 11.2, notes: 'IMG-004-M5' },
    // E1005 夏洛来 male 草饲D组
    { cattleProfileId: c5.id,  date: '2025-03-01T10:00:00Z', backfat: 3.8, area: 86.0, imf: 4.2, h: 7.8, w: 11.5, notes: 'IMG-005-M1' },
    { cattleProfileId: c5.id,  date: '2025-05-01T10:00:00Z', backfat: 4.2, area: 89.0, imf: 4.8, h: 8.0, w: 11.8, notes: 'IMG-005-M2' },
    { cattleProfileId: c5.id,  date: '2025-07-01T10:00:00Z', backfat: 4.6, area: 92.0, imf: 5.4, h: 8.2, w: 12.1, notes: 'IMG-005-M3' },
    { cattleProfileId: c5.id,  date: '2025-08-01T10:00:00Z', backfat: 4.8, area: 93.5, imf: 5.8, h: 8.3, w: 12.3, notes: 'IMG-005-M4' },
    { cattleProfileId: c5.id,  date: '2025-09-01T10:00:00Z', backfat: 5.0, area: 95.0, imf: 6.2, h: 8.4, w: 12.5, notes: 'IMG-005-M5' },
    // E1006 西门塔尔 female 育肥A组
    { cattleProfileId: c6.id,  date: '2025-04-01T10:00:00Z', backfat: 1.6, area: 70.0, imf: 1.5, h: 6.3, w:  9.8, notes: 'IMG-006-M1' },
    { cattleProfileId: c6.id,  date: '2025-06-01T10:00:00Z', backfat: 1.8, area: 72.0, imf: 2.0, h: 6.5, w: 10.0, notes: 'IMG-006-M2' },
    { cattleProfileId: c6.id,  date: '2025-08-01T10:00:00Z', backfat: 2.0, area: 74.5, imf: 2.5, h: 6.7, w: 10.2, notes: 'IMG-006-M3' },
    { cattleProfileId: c6.id,  date: '2025-09-22T10:00:00Z', backfat: 2.2, area: 76.0, imf: 2.8, h: 6.8, w: 10.4, notes: 'IMG-006-M4' },
    { cattleProfileId: c6.id,  date: '2025-10-22T10:00:00Z', backfat: 2.5, area: 78.0, imf: 3.2, h: 7.0, w: 10.6, notes: 'IMG-006-M5' },
    // E1007 安格斯 female 后备母牛群
    { cattleProfileId: c7.id,  date: '2025-04-01T10:00:00Z', backfat: 2.5, area: 76.0, imf: 2.8, h: 7.0, w: 10.5, notes: 'IMG-007-M1' },
    { cattleProfileId: c7.id,  date: '2025-06-01T10:00:00Z', backfat: 2.9, area: 79.0, imf: 3.4, h: 7.2, w: 10.8, notes: 'IMG-007-M2' },
    { cattleProfileId: c7.id,  date: '2025-08-01T10:00:00Z', backfat: 3.2, area: 82.0, imf: 3.9, h: 7.4, w: 11.0, notes: 'IMG-007-M3' },
    { cattleProfileId: c7.id,  date: '2025-09-28T10:00:00Z', backfat: 3.5, area: 85.0, imf: 4.3, h: 7.5, w: 11.2, notes: 'IMG-007-M4' },
    { cattleProfileId: c7.id,  date: '2025-10-28T10:00:00Z', backfat: 3.8, area: 87.0, imf: 4.7, h: 7.7, w: 11.5, notes: 'IMG-007-M5' },
    // E1008 利木赞 male 试验C组
    { cattleProfileId: c8.id,  date: '2025-04-01T10:00:00Z', backfat: 3.0, area: 82.0, imf: 3.5, h: 7.5, w: 11.0, notes: 'IMG-008-M1' },
    { cattleProfileId: c8.id,  date: '2025-06-01T10:00:00Z', backfat: 3.4, area: 85.0, imf: 4.2, h: 7.7, w: 11.3, notes: 'IMG-008-M2' },
    { cattleProfileId: c8.id,  date: '2025-07-03T10:00:00Z', backfat: 3.7, area: 88.0, imf: 4.7, h: 7.9, w: 11.7, notes: 'IMG-008-M3' },
    { cattleProfileId: c8.id,  date: '2025-09-03T10:00:00Z', backfat: 4.0, area: 91.0, imf: 5.2, h: 8.0, w: 12.0, notes: 'IMG-008-M4' },
    { cattleProfileId: c8.id,  date: '2025-10-03T10:00:00Z', backfat: 4.3, area: 93.0, imf: 5.7, h: 8.2, w: 12.2, notes: 'IMG-008-M5' },
    // E1009 海福特 male 草饲D组
    { cattleProfileId: c9.id,  date: '2025-05-01T10:00:00Z', backfat: 1.8, area: 72.0, imf: 2.1, h: 6.6, w: 10.1, notes: 'IMG-009-M1' },
    { cattleProfileId: c9.id,  date: '2025-07-01T10:00:00Z', backfat: 2.1, area: 75.0, imf: 2.6, h: 6.8, w: 10.4, notes: 'IMG-009-M2' },
    { cattleProfileId: c9.id,  date: '2025-09-01T10:00:00Z', backfat: 2.3, area: 77.5, imf: 3.1, h: 7.0, w: 10.7, notes: 'IMG-009-M3' },
    { cattleProfileId: c9.id,  date: '2025-10-02T10:00:00Z', backfat: 2.5, area: 79.0, imf: 3.4, h: 7.1, w: 10.9, notes: 'IMG-009-M4' },
    // E1010 安格斯 female 育肥A组
    { cattleProfileId: c10.id, date: '2025-04-01T10:00:00Z', backfat: 2.2, area: 74.0, imf: 2.6, h: 6.8, w: 10.3, notes: 'IMG-010-M1' },
    { cattleProfileId: c10.id, date: '2025-06-01T10:00:00Z', backfat: 2.6, area: 77.5, imf: 3.2, h: 7.1, w: 10.6, notes: 'IMG-010-M2' },
    { cattleProfileId: c10.id, date: '2025-08-01T10:00:00Z', backfat: 3.0, area: 81.0, imf: 3.8, h: 7.3, w: 10.9, notes: 'IMG-010-M3' },
    { cattleProfileId: c10.id, date: '2025-10-03T10:00:00Z', backfat: 3.3, area: 84.0, imf: 4.2, h: 7.5, w: 11.1, notes: 'IMG-010-M4' },
  ];

  for (const s of samples) {
    const grade = calculateMockGrade(s.imf);
    await prisma.measurement.create({
      data: {
        cattleProfileId:     s.cattleProfileId,
        userId:              operatorId,
        measurementDate:     new Date(s.date),
        backfatThickness:    s.backfat,
        ribeyeArea:          s.area,
        intramuscularFatImf: s.imf,
        ribeyeHeight:        s.h,
        ribeyeWidth:         s.w,
        notes:               s.notes,
        simulatedGrade:      grade,
      },
    });
  }
}
