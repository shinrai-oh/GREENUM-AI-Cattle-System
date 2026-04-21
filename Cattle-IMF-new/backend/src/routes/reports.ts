import { Router } from 'express';
import { getPrisma } from '../db';
import { authenticate } from '../auth';

export const reportsRouter = Router();

reportsRouter.get('/group', authenticate, async (req, res) => {
  const prisma = getPrisma();
  const groupIdsParam = String(req.query.groupIds || '').trim();
  const groupIds = groupIdsParam ? groupIdsParam.split(',').map(id => Number(id)).filter(Boolean) : [];

  try {
    const groups = await prisma.cattleGroup.findMany({ where: groupIds.length ? { id: { in: groupIds } } : {} });
    const result = [] as any[];
    for (const g of groups) {
      const cattle = await prisma.cattleProfile.findMany({ where: { groupId: g.id } });
      const cattleIds = cattle.map(c => c.id);
      const ms = await prisma.measurement.findMany({ where: { cattleProfileId: { in: cattleIds } } });
      const avg = (arr: (number|null)[]) => arr.length ? (arr.reduce((a,b)=>a+(b||0),0)/arr.length) : 0;
      result.push({
        group_id: g.id,
        group_name: g.groupName,
        avg_imf: Number(avg(ms.map(m => m.intramuscularFatImf)).toFixed(2)),
        avg_ribeye_area: Number(avg(ms.map(m => m.ribeyeArea)).toFixed(2)),
        avg_backfat: Number(avg(ms.map(m => m.backfatThickness)).toFixed(2)),
      });
    }
    return res.json(result);
  } catch (e) {
    return res.json([]);
  }
});

// 个体评估：返回每头牛的最新测量与模拟评级
reportsRouter.get('/cattle', authenticate, async (req, res) => {
  const prisma = getPrisma();
  try {
    const groupIdsParam = String(req.query.groupIds || '').trim();
    const groupIds = groupIdsParam ? groupIdsParam.split(',').map(id => Number(id)).filter(Boolean) : [];
    const gradesParam = String(req.query.grades || '').trim();
    const grades = gradesParam ? gradesParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    const imfMin = req.query.imfMin != null ? Number(req.query.imfMin) : null;
    const imfMax = req.query.imfMax != null ? Number(req.query.imfMax) : null;
    const sortBy = String(req.query.sortBy || 'date'); // 'date' | 'imf' | 'grade'
    const sortOrder = String(req.query.sortOrder || 'desc'); // 'asc' | 'desc'
    const startParam = String(req.query.start || '').trim();
    const endParam = String(req.query.end || '').trim();
    const startDate = startParam ? new Date(startParam) : null;
    const endDate = endParam ? new Date(endParam) : null;

    const cattle = await prisma.cattleProfile.findMany({ where: groupIds.length ? { groupId: { in: groupIds } } : {} });
    let result: any[] = [];
    for (const c of cattle) {
      const where: any = { cattleProfileId: c.id };
      if (startDate || endDate) {
        where.measurementDate = {};
        if (startDate) where.measurementDate.gte = startDate;
        if (endDate) where.measurementDate.lte = endDate;
      }
      const latest = await prisma.measurement.findFirst({ where, orderBy: { measurementDate: 'desc' } });
      result.push({
        ear_tag_id: c.earTagId,
        group_id: c.groupId || null,
        breed: c.breed || null,
        sex: c.sex || null,
        latest: latest ? {
          measurement_date: latest.measurementDate.toISOString(),
          intramuscular_fat_imf: latest.intramuscularFatImf,
          ribeye_area: latest.ribeyeArea,
          backfat_thickness: latest.backfatThickness,
          simulated_grade: latest.simulatedGrade,
        } : null,
      });
    }

    // 过滤
    if (grades.length) {
      result = result.filter(x => x.latest && x.latest.simulated_grade && grades.includes(String(x.latest.simulated_grade)));
    }
    if (imfMin != null) {
      result = result.filter(x => x.latest && x.latest.intramuscular_fat_imf != null && Number(x.latest.intramuscular_fat_imf) >= imfMin);
    }
    if (imfMax != null) {
      result = result.filter(x => x.latest && x.latest.intramuscular_fat_imf != null && Number(x.latest.intramuscular_fat_imf) <= imfMax);
    }

    // 排序
    const gradeRank: Record<string, number> = {
      'Standard': 1,
      'Choice (A2)': 2,
      'Choice+ (A3)': 3,
      'Prime (A4)': 4,
      'Prime+ (A5)': 5,
    };
    const dir = sortOrder === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      const la = a.latest, lb = b.latest;
      if (!la && !lb) return 0;
      if (!la) return 1; // 无最新记录排后
      if (!lb) return -1;
      if (sortBy === 'imf') {
        const va = Number(la.intramuscular_fat_imf || 0);
        const vb = Number(lb.intramuscular_fat_imf || 0);
        return (va - vb) * dir;
      } else if (sortBy === 'grade') {
        const va = gradeRank[String(la.simulated_grade)] || 0;
        const vb = gradeRank[String(lb.simulated_grade)] || 0;
        return (va - vb) * dir;
      } else {
        const va = new Date(String(la.measurement_date)).getTime();
        const vb = new Date(String(lb.measurement_date)).getTime();
        return (va - vb) * dir;
      }
    });

    return res.json(result);
  } catch (e) {
    return res.json([]);
  }
});
