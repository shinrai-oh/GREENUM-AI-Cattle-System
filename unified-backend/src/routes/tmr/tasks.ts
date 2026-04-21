import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/tmr/tasks?date=YYYY-MM-DD&deviceId=
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const dateStr = req.query.date ? String(req.query.date) : null;
  const deviceId = req.query.deviceId ? Number(req.query.deviceId) : undefined;

  const where = {
    ...(deviceId && { deviceId }),
    ...(dateStr && { taskDate: new Date(dateStr) }),
  };

  const tasks = await prisma.tmrDailyTask.findMany({
    where,
    orderBy: [{ taskDate: 'desc' }, { id: 'asc' }],
    include: {
      device: { select: { name: true, status: true } },
      formula: { select: { name: true, items: true } },
    },
  });
  res.json(tasks);
});

// POST /api/v1/tmr/tasks  (兼容 camelCase 和 snake_case)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  // 兼容旧 TMR 前端 snake_case 字段
  const deviceId = req.body.deviceId ?? req.body.device_id;
  const taskDate = req.body.taskDate ?? req.body.date;
  const formulaId = req.body.formulaId ?? req.body.formula_id;
  if (!deviceId || !taskDate || !formulaId) {
    res.status(400).json({ error: 'deviceId, taskDate, formulaId 不能为空' });
    return;
  }
  const task = await prisma.tmrDailyTask.create({
    data: {
      deviceId: Number(deviceId),
      taskDate: new Date(taskDate),
      formulaId: Number(formulaId),
    },
    include: { device: true, formula: true },
  });
  res.status(201).json(task);
});

// PUT /api/v1/tmr/tasks/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { status, formulaId } = req.body;
  const task = await prisma.tmrDailyTask.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(status !== undefined && { status }),
      ...(formulaId !== undefined && { formulaId: Number(formulaId) }),
    },
    include: { device: true, formula: true },
  });

  // 同步更新设备状态
  if (status) {
    const deviceStatus = status === 'mixing' ? 'mixing' : status === 'done' ? 'idle' : 'idle';
    await prisma.tmrDevice.update({
      where: { id: task.deviceId },
      data: { status: deviceStatus },
    });
  }

  res.json(task);
});

// GET /api/v1/tmr/tasks/reports/daily?date=YYYY-MM-DD
router.get('/reports/daily', authenticate, async (req: AuthRequest, res: Response) => {
  const dateStr = req.query.date ? String(req.query.date) : new Date().toISOString().split('T')[0];
  const date = new Date(dateStr);

  const tasks = await prisma.tmrDailyTask.findMany({
    where: { taskDate: date },
    include: {
      device: true,
      formula: true,
    },
  });

  const events = await prisma.tmrFeedingEvent.findMany({
    where: { timestamp: { gte: date, lt: new Date(date.getTime() + 86400000) } },
    include: { device: { select: { name: true } } },
    orderBy: { timestamp: 'asc' },
  });

  res.json({ date: dateStr, tasks, events });
});

export default router;
