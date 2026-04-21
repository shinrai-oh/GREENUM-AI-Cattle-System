import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/monitoring/behavior?cattleId=&cameraId=&behaviorType=&startDate=&endDate=&page=1&limit=50
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const cattleId = req.query.cattleId ? Number(req.query.cattleId) : undefined;
  const cameraId = req.query.cameraId ? Number(req.query.cameraId) : undefined;
  const behaviorType = req.query.behaviorType ? String(req.query.behaviorType) : undefined;
  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
  const endDateRaw = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
  // If only a date (no time) is given for endDate, extend to end of that day
  const endDate = endDateRaw
    ? (String(req.query.endDate).length <= 10
        ? new Date(endDateRaw.getFullYear(), endDateRaw.getMonth(), endDateRaw.getDate(), 23, 59, 59, 999)
        : endDateRaw)
    : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Number(req.query.limit) || 50);

  const where = {
    ...(cattleId && { cattleId }),
    ...(cameraId && { cameraId }),
    ...(behaviorType && { behaviorType }),
    ...(startDate || endDate
      ? { startTime: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.monitorBehaviorData.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startTime: 'desc' },
      include: {
        cattle: { select: { earTag: true } },
        camera: { select: { name: true } },
      },
    }),
    prisma.monitorBehaviorData.count({ where }),
  ]);

  res.json({ items, total, page, limit });
});

// POST /api/v1/monitoring/behavior
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { cattleId, penId, behaviorType, startTime, endTime, duration, cameraId, confidence } = req.body;
  if (!cattleId || !behaviorType || !startTime) {
    res.status(400).json({ error: 'cattleId, behaviorType, startTime 不能为空' });
    return;
  }
  const record = await prisma.monitorBehaviorData.create({
    data: {
      cattleId: Number(cattleId),
      penId: penId ? Number(penId) : undefined,
      behaviorType,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
      duration: duration ? Number(duration) : undefined,
      cameraId: cameraId ? Number(cameraId) : undefined,
      confidence: confidence ? Number(confidence) : undefined,
    },
  });
  res.status(201).json(record);
});

export default router;
