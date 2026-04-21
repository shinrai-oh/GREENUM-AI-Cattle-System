import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/farms
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const page  = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit || req.query.per_page) || 20);
  const skip  = (page - 1) * limit;

  const [farms, total] = await Promise.all([
    prisma.sharedFarm.findMany({
      skip,
      take: limit,
      orderBy: { id: 'asc' },
      include: { _count: { select: { pens: true, cattle: true, cameras: true } } },
    }),
    prisma.sharedFarm.count(),
  ]);

  res.json({ farms, total, page, limit });
});

// GET /api/v1/farms/:id/pens  ← must be BEFORE /:id to avoid capture
router.get('/:id/pens', authenticate, async (req: AuthRequest, res: Response) => {
  const farmId = Number(req.params.id);
  const pens = await prisma.sharedPen.findMany({
    where: { farmId },
    orderBy: [{ penNumber: 'asc' }],
    include: { _count: { select: { cattle: true } } },
  });
  res.json({ pens });
});

// GET /api/v1/farms/:id/cattle
router.get('/:id/cattle', authenticate, async (req: AuthRequest, res: Response) => {
  const farmId  = Number(req.params.id);
  const page    = Math.max(1, Number(req.query.page) || 1);
  const limit   = Math.min(1000, Number(req.query.limit || req.query.per_page || req.query.pageSize) || 20);
  const penId   = req.query.penId || req.query.pen_id ? Number(req.query.penId || req.query.pen_id) : undefined;
  const status  = req.query.status ? String(req.query.status) : undefined;

  const where = {
    farmId,
    ...(penId  && { penId }),
    ...(status && { status }),
  };

  const [items, total] = await Promise.all([
    prisma.sharedCattle.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { earTag: 'asc' },
      include: {
        pen:  { select: { penNumber: true } },
        farm: { select: { name: true } },
      },
    }),
    prisma.sharedCattle.count({ where }),
  ]);

  res.json({
    cattle: items,
    pagination: { total, page, per_page: limit },
    total,
  });
});

// GET /api/v1/farms/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const farm = await prisma.sharedFarm.findUnique({
    where: { id: Number(req.params.id) },
    include: { pens: true },
  });
  if (!farm) { res.status(404).json({ error: '养殖场不存在' }); return; }
  res.json(farm);
});

// POST /api/v1/farms/:id/cattle  (add cattle to a farm)
router.post('/:id/cattle', authenticate, async (req: AuthRequest, res: Response) => {
  const farmId = Number(req.params.id);
  const { earTag, ear_tag, penId, pen_id, breed, birthDate, birth_date, gender, weight, status, notes } = req.body;
  const tag = earTag || ear_tag;
  const pen  = penId  || pen_id;
  const bDate = birthDate || birth_date;
  if (!tag) { res.status(400).json({ error: 'earTag 不能为空' }); return; }

  const exists = await prisma.sharedCattle.findUnique({ where: { earTag: tag } });
  if (exists) { res.status(409).json({ error: '耳标号已存在' }); return; }

  const cattle = await prisma.sharedCattle.create({
    data: {
      earTag: tag,
      farmId,
      penId:     pen    ? Number(pen)    : undefined,
      breed,
      birthDate: bDate  ? new Date(bDate) : undefined,
      gender,
      weight:    weight ? Number(weight)  : undefined,
      status:    status || 'healthy',
      notes,
    },
    include: { farm: { select: { name: true } }, pen: { select: { penNumber: true } } },
  });
  res.status(201).json(cattle);
});

// POST /api/v1/farms
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, address, contactPerson, contactPhone } = req.body;
  if (!name) { res.status(400).json({ error: '养殖场名称不能为空' }); return; }
  const farm = await prisma.sharedFarm.create({
    data: { name, address, contactPerson, contactPhone },
  });
  res.status(201).json(farm);
});

// PUT /api/v1/farms/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, address, contactPerson, contactPhone } = req.body;
  const farm = await prisma.sharedFarm.update({
    where: { id: Number(req.params.id) },
    data: { name, address, contactPerson, contactPhone },
  });
  res.json(farm);
});

export default router;
