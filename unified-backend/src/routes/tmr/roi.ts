import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/tmr/roi/:deviceId
router.get('/:deviceId', authenticate, async (req: AuthRequest, res: Response) => {
  const roi = await prisma.tmrCameraRoi.findUnique({
    where: { deviceId: Number(req.params.deviceId) },
  });
  if (!roi) { res.status(404).json({ error: 'ROI配置不存在' }); return; }
  res.json(roi);
});

// POST /api/v1/tmr/roi/:deviceId
router.post('/:deviceId', authenticate, async (req: AuthRequest, res: Response) => {
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
