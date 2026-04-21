import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/reports/group?groupIds=1,2,3
router.get('/group', authenticate, async (req: AuthRequest, res: Response) => {
  const groupIdsStr = String(req.query.groupIds || '');
  const groupIds = groupIdsStr
    ? groupIdsStr.split(',').map(Number).filter((n) => !isNaN(n))
    : [];

  const groups = await prisma.imfCattleGroup.findMany({
    where: groupIds.length ? { id: { in: groupIds } } : undefined,
    include: {
      cattle: {
        include: {
          imfMeasurements: { orderBy: { measurementDate: 'desc' }, take: 1 },
        },
      },
    },
  });

  const result = groups.map((g) => {
    const allMeasurements = g.cattle.flatMap((c) => c.imfMeasurements);
    const avg = (vals: (number | null)[]) => {
      const valid = vals.filter((v): v is number => v != null);
      return valid.length ? Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2)) : 0;
    };
    return {
      group_id: g.id,
      group_name: g.groupName,
      cattle_count: g.cattle.length,
      avg_imf: avg(allMeasurements.map((m) => m.intramuscularFatImf)),
      avg_ribeye_area: avg(allMeasurements.map((m) => m.ribeyeArea)),
      avg_backfat: avg(allMeasurements.map((m) => m.backfatThickness)),
    };
  });

  res.json(result);
});

// GET /api/v1/reports/cattle?groupIds=&grades=&imfMin=&imfMax=&sortBy=date&sortOrder=desc
router.get('/cattle', authenticate, async (req: AuthRequest, res: Response) => {
  const groupIdsStr = String(req.query.groupIds || '');
  const gradesStr = String(req.query.grades || '');
  const groupIds = groupIdsStr ? groupIdsStr.split(',').map(Number).filter(Boolean) : [];
  const grades = gradesStr ? gradesStr.split(',').filter(Boolean) : [];
  const imfMin = req.query.imfMin ? Number(req.query.imfMin) : null;
  const imfMax = req.query.imfMax ? Number(req.query.imfMax) : null;
  const sortBy = String(req.query.sortBy || 'date');
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

  const cattle = await prisma.sharedCattle.findMany({
    where: groupIds.length ? { imfGroupId: { in: groupIds } } : undefined,
    include: {
      imfMeasurements: {
        orderBy: { measurementDate: 'desc' },
        take: 1,
      },
      imfGroup: { select: { groupName: true } },
    },
  });

  let items = cattle.map((c) => {
    const latest = c.imfMeasurements[0] || null;
    return {
      ear_tag_id: c.earTag,
      group_id: c.imfGroupId,
      group_name: c.imfGroup?.groupName,
      breed: c.breed,
      sex: c.gender,
      latest: latest
        ? {
            measurement_date: latest.measurementDate,
            intramuscular_fat_imf: latest.intramuscularFatImf,
            ribeye_area: latest.ribeyeArea,
            backfat_thickness: latest.backfatThickness,
            simulated_grade: latest.simulatedGrade,
          }
        : null,
    };
  });

  if (grades.length) {
    items = items.filter((x) => x.latest && grades.includes(String(x.latest.simulated_grade)));
  }
  if (imfMin != null) {
    items = items.filter((x) => x.latest?.intramuscular_fat_imf != null && x.latest.intramuscular_fat_imf >= imfMin);
  }
  if (imfMax != null) {
    items = items.filter((x) => x.latest?.intramuscular_fat_imf != null && x.latest.intramuscular_fat_imf <= imfMax);
  }

  const gradeRank: Record<string, number> = {
    Standard: 1, 'Choice (A2)': 2, 'Choice+ (A3)': 3, 'Prime (A4)': 4, 'Prime+ (A5)': 5,
  };
  const dir = sortOrder === 'asc' ? 1 : -1;
  items.sort((a, b) => {
    const la = a.latest, lb = b.latest;
    if (!la && !lb) return 0;
    if (!la) return 1;
    if (!lb) return -1;
    if (sortBy === 'imf') return ((la.intramuscular_fat_imf ?? 0) - (lb.intramuscular_fat_imf ?? 0)) * dir;
    if (sortBy === 'grade') return ((gradeRank[la.simulated_grade ?? ''] ?? 0) - (gradeRank[lb.simulated_grade ?? ''] ?? 0)) * dir;
    return (new Date(la.measurement_date).getTime() - new Date(lb.measurement_date).getTime()) * dir;
  });

  res.json(items);
});

// GET /api/v1/reports/imf-groups  (IMF 分组列表)
router.get('/imf-groups', authenticate, async (_req: AuthRequest, res: Response) => {
  const groups = await prisma.imfCattleGroup.findMany({
    orderBy: { id: 'asc' },
    include: { _count: { select: { cattle: true } } },
  });
  res.json(groups);
});

// POST /api/v1/reports/imf-groups
router.post('/imf-groups', authenticate, async (req: AuthRequest, res: Response) => {
  const { groupName, description } = req.body;
  if (!groupName) { res.status(400).json({ error: 'groupName 不能为空' }); return; }
  const group = await prisma.imfCattleGroup.create({ data: { groupName, description } });
  res.status(201).json(group);
});

export default router;
