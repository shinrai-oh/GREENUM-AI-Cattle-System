import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/monitoring/stream/info
// 转发所有视频流请求到 Python sidecar
const sidecarProxy = async (path: string, body: unknown, res: Response) => {
  const sidecarUrl = process.env.PYTHON_SIDECAR_URL || 'http://python-sidecar:5000';
  try {
    const response = await fetch(`${sidecarUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    res.status(503).json({ error: 'Python 视频流服务不可用，请确认 python-sidecar 容器正在运行' });
  }
};

// POST /api/v1/monitoring/stream/capture  - 截取单帧
router.post('/capture', authenticate, async (req: AuthRequest, res: Response) => {
  await sidecarProxy('/capture', req.body, res);
});

// POST /api/v1/monitoring/stream/analyze  - 分析帧中的行为
router.post('/analyze', authenticate, async (req: AuthRequest, res: Response) => {
  await sidecarProxy('/analyze', req.body, res);
});

// GET /api/v1/monitoring/stream/health  - 检查 sidecar 状态
router.get('/health', async (_req, res: Response) => {
  const sidecarUrl = process.env.PYTHON_SIDECAR_URL || 'http://python-sidecar:5000';
  try {
    const response = await fetch(`${sidecarUrl}/health`);
    const data = await response.json();
    res.json({ sidecar: 'ok', ...data as Record<string, unknown> });
  } catch {
    res.status(503).json({ sidecar: 'unavailable' });
  }
});

export default router;
