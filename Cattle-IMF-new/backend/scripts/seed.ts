import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculateMockGrade } from '../src/mockGrade';

const prisma = new PrismaClient();

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function monthSeriesDates(): Date[] {
  const dates: Date[] = [];
  for (let y = 2023; y <= 2024; y++) {
    for (let m = 0; m < 12; m++) {
      // 每月1日 10:00 UTC
      dates.push(new Date(Date.UTC(y, m, 1, 10, 0, 0)));
    }
  }
  return dates;
}

function makeMeasurementsForCattle(earTagId: string, cattleProfileId: number, groupName: string, userId: number) {
  const dates = monthSeriesDates();
  const hash = earTagId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const idSuffix = parseInt(earTagId.replace(/\D/g, '')) % 10;
  const groupFactor = groupName.includes('育肥') ? 0.4 : groupName.includes('后备') ? -0.1 : groupName.includes('草饲') ? -0.3 : 0.0;
  const baseImf = 2.0 + (idSuffix * 0.15) + groupFactor;
  const areaBase = 75 + (groupFactor * 5);

  return dates.map((d, idx) => {
    const trend = idx * 0.05; // 随时间逐步增加
    const wave = Math.sin(idx / 3) * 0.3; // 周期波动
    const noise = ((hash % 13) - 6) * 0.02; // 稳定噪声

    const imf = clamp(baseImf + trend + wave + noise, 1.5, 7.0);
    const backfat = clamp(1.8 + imf * 0.5 + noise, 1.5, 6.5);
    const area = clamp(areaBase + imf * 5 + (wave * 2), 70, 105);
    const h = clamp(6.0 + imf * 0.2 + (noise * 0.5), 5.5, 9.5);
    const w = clamp(10.0 + imf * 0.3 + (noise * 0.5), 9.5, 13.5);
    const grade = calculateMockGrade(imf);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return {
      cattleProfileId,
      userId,
      measurementDate: d,
      backfatThickness: Number(backfat.toFixed(2)),
      ribeyeArea: Number(area.toFixed(1)),
      intramuscularFatImf: Number(imf.toFixed(2)),
      ribeyeHeight: Number(h.toFixed(1)),
      ribeyeWidth: Number(w.toFixed(1)),
      notes: `SIM-${earTagId}-${y}${m}`,
      simulatedGrade: grade,
    };
  });
}

async function main() {
  // Users
  const adminHash = await bcrypt.hash('admin123', 10);
  const opHash = await bcrypt.hash('operator123', 10);
  await prisma.user.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', passwordHash: adminHash, role: 'admin' } });
  await prisma.user.upsert({ where: { username: 'operator' }, update: {}, create: { username: 'operator', passwordHash: opHash, role: 'operator' } });
  const operator = await prisma.user.findUnique({ where: { username: 'operator' } });
  const operatorId = operator!.id;

  // Groups（与 devSeed 保持一致以覆盖多场景）
  const gA = await prisma.cattleGroup.upsert({ where: { id: 1 }, update: {}, create: { id: 1, groupName: '育肥A组', description: '高能量饲喂' } });
  const gB = await prisma.cattleGroup.upsert({ where: { id: 2 }, update: {}, create: { id: 2, groupName: '后备母牛群', description: '维持饲喂' } });
  const gC = await prisma.cattleGroup.upsert({ where: { id: 3 }, update: {}, create: { id: 3, groupName: '试验C组', description: '不同配方对比' } });
  const gD = await prisma.cattleGroup.upsert({ where: { id: 4 }, update: {}, create: { id: 4, groupName: '草饲D组', description: '草饲为主' } });

  // Cattle（10头，覆盖不同组）
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

  // 为每头牛生成 2023-01 至 2024-12 的月度测量
  const cattleList = [
    { c: c1, g: gA.groupName },
    { c: c2, g: gB.groupName },
    { c: c3, g: gA.groupName },
    { c: c4, g: gC.groupName },
    { c: c5, g: gD.groupName },
    { c: c6, g: gA.groupName },
    { c: c7, g: gB.groupName },
    { c: c8, g: gC.groupName },
    { c: c9, g: gD.groupName },
    { c: c10, g: gA.groupName },
  ];

  for (const { c, g } of cattleList) {
    const rows = makeMeasurementsForCattle(c.earTagId, c.id, g, operatorId);
    for (const data of rows) {
      await prisma.measurement.create({ data });
    }
  }

  console.log('Seed completed: 2023–2024 monthly series for 10 cattle');
}

main().finally(async () => { await prisma.$disconnect(); });
