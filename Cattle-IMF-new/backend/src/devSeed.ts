import { getPrisma } from './db';
import bcrypt from 'bcryptjs';
import { calculateMockGrade } from './mockGrade';

export async function runDevSeed() {
  const prisma = getPrisma();

  const userCount = await prisma.user.count();
  const cattleCount = await prisma.cattleProfile.count();

  if (userCount > 0 && cattleCount > 0) {
    return; // already seeded
  }

  const adminHash = await bcrypt.hash('admin123', 10);
  const opHash = await bcrypt.hash('operator123', 10);

  await prisma.user.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', passwordHash: adminHash, role: 'admin' } });
  await prisma.user.upsert({ where: { username: 'operator' }, update: {}, create: { username: 'operator', passwordHash: opHash, role: 'operator' } });
  const operator = await prisma.user.findUnique({ where: { username: 'operator' } });
  const operatorId = operator!.id;

  const gA = await prisma.cattleGroup.upsert({ where: { id: 1 }, update: {}, create: { id: 1, groupName: '育肥A组', description: '高能量饲喂' } });
  const gB = await prisma.cattleGroup.upsert({ where: { id: 2 }, update: {}, create: { id: 2, groupName: '后备母牛群', description: '维持饲喂' } });
  const gC = await prisma.cattleGroup.upsert({ where: { id: 3 }, update: {}, create: { id: 3, groupName: '试验C组', description: '不同配方对比' } });
  const gD = await prisma.cattleGroup.upsert({ where: { id: 4 }, update: {}, create: { id: 4, groupName: '草饲D组', description: '草饲为主' } });

  const c1 = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1001' }, update: {}, create: { earTagId: 'E1001', birthDate: new Date('2023-03-05'), breed: '西门塔尔', sex: 'male', sireEarTagId: 'S001', damEarTagId: 'D001', groupId: gA.id } });
  const c2 = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1002' }, update: {}, create: { earTagId: 'E1002', birthDate: new Date('2023-02-21'), breed: '安格斯', sex: 'female', sireEarTagId: 'S002', damEarTagId: 'D002', groupId: gB.id } });
  const c3 = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1003' }, update: {}, create: { earTagId: 'E1003', birthDate: new Date('2022-12-10'), breed: '安格斯', sex: 'male', sireEarTagId: 'S003', damEarTagId: 'D003', groupId: gA.id } });
  const c4 = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1004' }, update: {}, create: { earTagId: 'E1004', birthDate: new Date('2023-01-12'), breed: '含安格斯杂交', sex: 'female', sireEarTagId: 'S004', damEarTagId: 'D004', groupId: gC.id } });
  const c5 = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1005' }, update: {}, create: { earTagId: 'E1005', birthDate: new Date('2022-11-03'), breed: '夏洛来', sex: 'male', sireEarTagId: 'S005', damEarTagId: 'D005', groupId: gD.id } });
  const c6 = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1006' }, update: {}, create: { earTagId: 'E1006', birthDate: new Date('2023-04-18'), breed: '西门塔尔', sex: 'female', sireEarTagId: 'S006', damEarTagId: 'D006', groupId: gA.id } });
  const c7 = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1007' }, update: {}, create: { earTagId: 'E1007', birthDate: new Date('2023-05-02'), breed: '安格斯', sex: 'female', sireEarTagId: 'S007', damEarTagId: 'D007', groupId: gB.id } });
  const c8 = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1008' }, update: {}, create: { earTagId: 'E1008', birthDate: new Date('2022-10-26'), breed: '利木赞', sex: 'male', sireEarTagId: 'S008', damEarTagId: 'D008', groupId: gC.id } });
  const c9 = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1009' }, update: {}, create: { earTagId: 'E1009', birthDate: new Date('2023-06-30'), breed: '海福特', sex: 'male', sireEarTagId: 'S009', damEarTagId: 'D009', groupId: gD.id } });
  const c10 = await prisma.cattleProfile.upsert({ where: { earTagId: 'E1010' }, update: {}, create: { earTagId: 'E1010', birthDate: new Date('2023-07-14'), breed: '安格斯', sex: 'female', sireEarTagId: 'S010', damEarTagId: 'D010', groupId: gA.id } });

  const samples = [
    { cattleProfileId: c1.id, date: '2025-09-01T10:00:00Z', backfat: 3.2, area: 85.4, imf: 3.5, h: 7.4, w: 11.2, notes: 'IMG-001' },
    { cattleProfileId: c1.id, date: '2025-10-01T10:00:00Z', backfat: 3.8, area: 88.0, imf: 4.6, h: 7.6, w: 11.3, notes: 'IMG-002' },
    { cattleProfileId: c2.id, date: '2025-09-05T10:00:00Z', backfat: 2.1, area: 76.2, imf: 2.3, h: 6.8, w: 10.1, notes: 'IMG-003' },
    { cattleProfileId: c3.id, date: '2025-08-20T10:00:00Z', backfat: 4.9, area: 92.1, imf: 6.1, h: 8.1, w: 12.2, notes: 'IMG-004' },
    { cattleProfileId: c4.id, date: '2025-07-15T10:00:00Z', backfat: 2.8, area: 80.3, imf: 3.1, h: 7.0, w: 10.9, notes: 'IMG-005' },
    { cattleProfileId: c4.id, date: '2025-09-16T10:00:00Z', backfat: 3.0, area: 82.0, imf: 3.6, h: 7.2, w: 11.0, notes: 'IMG-006' },
    { cattleProfileId: c5.id, date: '2025-08-01T10:00:00Z', backfat: 5.2, area: 95.0, imf: 5.8, h: 8.6, w: 12.6, notes: 'IMG-007' },
    { cattleProfileId: c6.id, date: '2025-09-22T10:00:00Z', backfat: 2.0, area: 74.5, imf: 1.8, h: 6.6, w: 10.0, notes: 'IMG-008' },
    { cattleProfileId: c7.id, date: '2025-09-28T10:00:00Z', backfat: 3.6, area: 86.4, imf: 4.2, h: 7.5, w: 11.1, notes: 'IMG-009' },
    { cattleProfileId: c8.id, date: '2025-07-03T10:00:00Z', backfat: 4.1, area: 90.2, imf: 4.9, h: 8.0, w: 12.0, notes: 'IMG-010' },
    { cattleProfileId: c9.id, date: '2025-10-02T10:00:00Z', backfat: 2.4, area: 78.1, imf: 2.6, h: 6.9, w: 10.4, notes: 'IMG-011' },
    { cattleProfileId: c10.id, date: '2025-10-03T10:00:00Z', backfat: 3.3, area: 84.0, imf: 3.9, h: 7.3, w: 11.0, notes: 'IMG-012' },
  ];

  for (const s of samples) {
    const grade = calculateMockGrade(s.imf);
    await prisma.measurement.create({ data: {
      cattleProfileId: s.cattleProfileId,
      userId: operatorId,
      measurementDate: new Date(s.date),
      backfatThickness: s.backfat,
      ribeyeArea: s.area,
      intramuscularFatImf: s.imf,
      ribeyeHeight: s.h,
      ribeyeWidth: s.w,
      notes: s.notes,
      simulatedGrade: grade,
    }});
  }
}
