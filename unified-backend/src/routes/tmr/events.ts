import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/tmr/events?deviceId=&startDate=&endDate=&page=1&limit=50
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const deviceId = req.query.deviceId ? Number(req.query.deviceId) : undefined;
  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
  const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Number(req.query.limit) || 50);

  const where = {
    ...(deviceId && { deviceId }),
    ...(startDate || endDate
      ? { timestamp: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.tmrFeedingEvent.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: { device: { select: { name: true } } },
    }),
    prisma.tmrFeedingEvent.count({ where }),
  ]);

  res.json({ items, total, page, limit });
});

// POST /api/v1/tmr/events
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { deviceId, timestamp, material, weight, snapshotPath } = req.body;
  if (!deviceId || !material || weight == null) {
    res.status(400).json({ error: 'deviceId, material, weight 不能为空' });
    return;
  }
  const event = await prisma.tmrFeedingEvent.create({
    data: {
      deviceId: Number(deviceId),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      material,
      weight: Number(weight),
      snapshotPath,
    },
  });
  res.status(201).json(event);
});

export default router;
