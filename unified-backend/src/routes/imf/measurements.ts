import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

function calcGrade(imf: number | null): string {
  if (imf == null) return 'N/A';
  if (imf >= 6.0) return 'Prime+ (A5)';
  if (imf >= 4.5) return 'Prime (A4)';
  if (imf >= 3.0) return 'Choice+ (A3)';
  if (imf >= 2.0) return 'Choice (A2)';
  return 'Standard';
}

// POST /api/v1/measurements
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const {
    ear_tag_id,
    measurement_date,
    backfat_thickness,
    ribeye_area,
    intramuscular_fat_imf,
    ribeye_height,
    ribeye_width,
    notes,
  } = req.body;

  if (!ear_tag_id) { res.status(400).json({ error: 'ear_tag_id 不能为空' }); return; }

  const cattle = await prisma.sharedCattle.findUnique({ where: { earTag: ear_tag_id } });
  if (!cattle) { res.status(404).json({ error: '牛只不存在' }); return; }

  const imfVal = intramuscular_fat_imf ? Number(intramuscular_fat_imf) : null;
  const measurement = await prisma.imfMeasurement.create({
    data: {
      cattleId: cattle.id,
      userId: req.user!.id,
      measurementDate: measurement_date ? new Date(measurement_date) : new Date(),
      backfatThickness: backfat_thickness ? Number(backfat_thickness) : null,
      ribeyeArea: ribeye_area ? Number(ribeye_area) : null,
      intramuscularFatImf: imfVal,
      ribeyeHeight: ribeye_height ? Number(ribeye_height) : null,
      ribeyeWidth: ribeye_width ? Number(ribeye_width) : null,
      notes: notes || null,
      simulatedGrade: calcGrade(imfVal),
    },
    include: { cattle: { select: { earTag: true } }, user: { select: { username: true } } },
  });
  res.status(201).json(measurement);
});

// GET /api/v1/measurements?cattleId=&earTag=&page=1&pageSize=20
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const cattleId = req.query.cattleId ? Number(req.query.cattleId) : undefined;
  const earTag = req.query.earTag ? String(req.query.earTag) : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 20);

  let resolvedCattleId = cattleId;
  if (!resolvedCattleId && earTag) {
    const c = await prisma.sharedCattle.findUnique({ where: { earTag } });
    if (!c) { res.json({ items: [], total: 0 }); return; }
    resolvedCattleId = c.id;
  }

  const where = resolvedCattleId ? { cattleId: resolvedCattleId } : {};
  const [items, total] = await Promise.all([
    prisma.imfMeasurement.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { measurementDate: 'desc' },
      include: {
        cattle: { select: { earTag: true, breed: true } },
        user: { select: { username: true } },
      },
    }),
    prisma.imfMeasurement.count({ where }),
  ]);
  res.json({ items, total, page, pageSize });
});

export default router;
