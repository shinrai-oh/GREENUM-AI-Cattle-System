import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/pens?farmId=1
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const farmId = req.query.farmId ? Number(req.query.farmId) : undefined;
  const pens = await prisma.sharedPen.findMany({
    where: farmId ? { farmId } : undefined,
    orderBy: [{ farmId: 'asc' }, { penNumber: 'asc' }],
    include: { _count: { select: { cattle: true } } },
  });
  res.json(pens);
});

// GET /api/v1/pens/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const pen = await prisma.sharedPen.findUnique({ where: { id: Number(req.params.id) } });
  if (!pen) { res.status(404).json({ error: '栏位不存在' }); return; }
  res.json(pen);
});

// POST /api/v1/pens
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { farmId, penNumber, capacity } = req.body;
  if (!farmId || !penNumber) { res.status(400).json({ error: 'farmId 和 penNumber 不能为空' }); return; }
  const pen = await prisma.sharedPen.create({
    data: { farmId: Number(farmId), penNumber, capacity: capacity ? Number(capacity) : undefined },
  });
  res.status(201).json(pen);
});

// PUT /api/v1/pens/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { penNumber, capacity, currentCount } = req.body;
  const pen = await prisma.sharedPen.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(penNumber !== undefined && { penNumber }),
      ...(capacity !== undefined && { capacity: Number(capacity) }),
      ...(currentCount !== undefined && { currentCount: Number(currentCount) }),
    },
  });
  res.json(pen);
});

export default router;
