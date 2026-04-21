import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/tmr/devices
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  const devices = await prisma.tmrDevice.findMany({
    orderBy: { id: 'asc' },
    include: { roi: true },
  });
  res.json(devices);
});

// GET /api/v1/tmr/devices/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const device = await prisma.tmrDevice.findUnique({
    where: { id: Number(req.params.id) },
    include: { roi: true },
  });
  if (!device) { res.status(404).json({ error: 'TMR设备不存在' }); return; }
  res.json(device);
});

// POST /api/v1/tmr/devices
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, cameraIp } = req.body;
  if (!name) { res.status(400).json({ error: '设备名称不能为空' }); return; }
  const device = await prisma.tmrDevice.create({ data: { name, cameraIp } });
  res.status(201).json(device);
});

// PUT /api/v1/tmr/devices/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, cameraIp, status } = req.body;
  const device = await prisma.tmrDevice.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(name !== undefined && { name }),
      ...(cameraIp !== undefined && { cameraIp }),
      ...(status !== undefined && { status }),
    },
  });
  res.json(device);
});

// GET /api/v1/tmr/devices/:deviceId/roi
router.get('/:deviceId/roi', authenticate, async (req: AuthRequest, res: Response) => {
  const roi = await prisma.tmrCameraRoi.findUnique({
    where: { deviceId: Number(req.params.deviceId) },
  });
  if (!roi) { res.status(404).json({ error: 'ROI配置不存在' }); return; }
  res.json(roi);
});

// POST /api/v1/tmr/devices/:deviceId/roi
router.post('/:deviceId/roi', authenticate, async (req: AuthRequest, res: Response) => {
  const deviceId = Number(req.params.deviceId);
  const { roi1, roi2 } = req.body;
  if (!roi1 || !roi2) { res.status(400).json({ error: 'roi1 和 roi2 不能为空' }); return; }

  const roi = await prisma.tmrCameraRoi.upsert({
    where: { deviceId },
    create: { deviceId, roi1, roi2 },
    update: { roi1, roi2 },
  });
  res.json(roi);
});

export default router;
