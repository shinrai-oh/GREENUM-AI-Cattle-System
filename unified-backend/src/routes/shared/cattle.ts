import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/cattle?page=1&pageSize=20&search=&farmId=&status=
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
  const search = String(req.query.search || '');
  const farmId = req.query.farmId ? Number(req.query.farmId) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;

  const where = {
    ...(farmId && { farmId }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { earTag: { contains: search } },
        { breed: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.sharedCattle.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { earTag: 'asc' },
      include: { farm: { select: { name: true } }, pen: { select: { penNumber: true } } },
    }),
    prisma.sharedCattle.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});

// GET /api/v1/cattle/:earTag
router.get('/:earTag', authenticate, async (req: AuthRequest, res: Response) => {
  const cattle = await prisma.sharedCattle.findUnique({
    where: { earTag: req.params.earTag },
    include: { farm: true, pen: true, imfGroup: true },
  });
  if (!cattle) { res.status(404).json({ error: '牛只不存在' }); return; }
  res.json(cattle);
});

// POST /api/v1/cattle
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { earTag, farmId, penId, breed, birthDate, gender, weight, status, notes, imfGroupId } = req.body;
  if (!earTag || !farmId) { res.status(400).json({ error: 'earTag 和 farmId 不能为空' }); return; }

  const exists = await prisma.sharedCattle.findUnique({ where: { earTag } });
  if (exists) { res.status(409).json({ error: '耳标号已存在' }); return; }

  const cattle = await prisma.sharedCattle.create({
    data: {
      earTag,
      farmId: Number(farmId),
      penId: penId ? Number(penId) : undefined,
      breed,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      gender,
      weight: weight ? Number(weight) : undefined,
      status: status || 'active',
      notes,
      imfGroupId: imfGroupId ? Number(imfGroupId) : undefined,
    },
  });
  res.status(201).json(cattle);
});

// PUT /api/v1/cattle/:earTag
router.put('/:earTag', authenticate, async (req: AuthRequest, res: Response) => {
  const { penId, breed, birthDate, gender, weight, status, notes, imfGroupId } = req.body;
  const cattle = await prisma.sharedCattle.update({
    where: { earTag: req.params.earTag },
    data: {
      ...(penId !== undefined && { penId: penId ? Number(penId) : null }),
      ...(breed !== undefined && { breed }),
      ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
      ...(gender !== undefined && { gender }),
      ...(weight !== undefined && { weight: weight ? Number(weight) : null }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(imfGroupId !== undefined && { imfGroupId: imfGroupId ? Number(imfGroupId) : null }),
    },
  });
  res.json(cattle);
});

// GET /api/v1/cattle/:earTag/measurements  (IMF 测量历史，兼容旧路径)
router.get('/:earTag/measurements', authenticate, async (req: AuthRequest, res: Response) => {
  const cattle = await prisma.sharedCattle.findUnique({ where: { earTag: req.params.earTag } });
  if (!cattle) { res.status(404).json({ error: '牛只不存在' }); return; }
  const measurements = await prisma.imfMeasurement.findMany({
    where: { cattleId: cattle.id },
    orderBy: { measurementDate: 'desc' },
    include: { user: { select: { username: true } } },
  });
  res.json(measurements);
});

export default router;
