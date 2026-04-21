import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/cameras?farmId=&penId=&status=
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const farmId = req.query.farmId ? Number(req.query.farmId) : undefined;
  const penId = req.query.penId ? Number(req.query.penId) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 50);

  const where = {
    ...(farmId && { farmId }),
    ...(penId && { penId }),
    ...(status && { status }),
  };

  const [cameras, total] = await Promise.all([
    prisma.sharedCamera.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: 'asc' },
      include: { farm: { select: { name: true } }, pen: { select: { penNumber: true } } },
    }),
    prisma.sharedCamera.count({ where }),
  ]);

  res.json({ cameras, total, page, limit });
});

// GET /api/v1/cameras/:id/stream  — 返回占位静态帧（无实际 RTSP 时使用）
router.get('/:id/stream', async (_req: AuthRequest, res: Response) => {
  // 1×1 black JPEG placeholder — no auth required so VideoPlayer <img> can load it
  const blackJpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUE/8QAHxAAAQQCAwEAAAAAAAAAAAAAAQACAxEEBRIhMf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABiBSi7r7SsulhSXNEVLdmrN26QCxF8dS0TfFCIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgD/2Q==',
    'base64'
  );
  res.set('Content-Type', 'image/jpeg');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(blackJpeg);
});

// GET /api/v1/cameras/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const camera = await prisma.sharedCamera.findUnique({
    where: { id: Number(req.params.id) },
    include: { farm: true, pen: true },
  });
  if (!camera) { res.status(404).json({ error: '摄像头不存在' }); return; }
  res.json(camera);
});

// POST /api/v1/cameras
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, rtspUrl, location, farmId, penId, status } = req.body;
  if (!name || !farmId) { res.status(400).json({ error: 'name 和 farmId 不能为空' }); return; }
  const camera = await prisma.sharedCamera.create({
    data: {
      name,
      rtspUrl,
      location,
      farmId: Number(farmId),
      penId: penId ? Number(penId) : undefined,
      status: status || 'active',
    },
  });
  res.status(201).json(camera);
});

// PUT /api/v1/cameras/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, rtspUrl, location, penId, status } = req.body;
  const camera = await prisma.sharedCamera.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(name !== undefined && { name }),
      ...(rtspUrl !== undefined && { rtspUrl }),
      ...(location !== undefined && { location }),
      ...(penId !== undefined && { penId: penId ? Number(penId) : null }),
      ...(status !== undefined && { status }),
    },
  });
  res.json(camera);
});

// POST /api/v1/cameras/stream/:id/frame  (转发到 Python sidecar)
router.post('/stream/:id/frame', authenticate, async (req: AuthRequest, res: Response) => {
  const camera = await prisma.sharedCamera.findUnique({ where: { id: Number(req.params.id) } });
  if (!camera) { res.status(404).json({ error: '摄像头不存在' }); return; }
  if (!camera.rtspUrl) { res.status(400).json({ error: '该摄像头未配置 RTSP 地址' }); return; }

  const sidecarUrl = process.env.PYTHON_SIDECAR_URL || 'http://python-sidecar:5000';
  try {
    const response = await fetch(`${sidecarUrl}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rtsp_url: camera.rtspUrl }),
    });
    const data = await response.json() as Record<string, unknown>;
    res.json(data);
  } catch {
    res.status(503).json({ error: '视频流服务不可用' });
  }
});

export default router;
