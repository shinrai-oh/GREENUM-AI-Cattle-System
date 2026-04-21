import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import authRouter from './routes/auth';
import prisma from './db';
import farmsRouter from './routes/shared/farms';
import pensRouter from './routes/shared/pens';
import cattleRouter from './routes/shared/cattle';
import camerasRouter from './routes/shared/cameras';
import imfMeasurementsRouter from './routes/imf/measurements';
import imfReportsRouter from './routes/imf/reports';
import monitorBehaviorRouter from './routes/monitoring/behavior';
import monitorStatisticsRouter from './routes/monitoring/statistics';
import monitorStreamRouter from './routes/monitoring/stream';
import tmrDevicesRouter from './routes/tmr/devices';
import tmrFormulasRouter from './routes/tmr/formulas';
import tmrTasksRouter from './routes/tmr/tasks';
import tmrEventsRouter from './routes/tmr/events';
import tmrRoiRouter from './routes/tmr/roi';
import { setupTmrSocket } from './websocket/tmr';
import { runImfSeed } from './imfSeed';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cattle-unified-backend', time: new Date().toISOString() });
});

// 系统状态 (行为监控前端)
app.get('/api/v1/system/status', async (_req, res) => {
  try {
    const [totalCameras, activeCameras] = await Promise.all([
      prisma.sharedCamera.count(),
      prisma.sharedCamera.count({ where: { status: 'active' } }),
    ]);
    res.json({
      database: { connected: true },
      cameras: {
        total: totalCameras,
        active: activeCameras,
        health_percentage: totalCameras > 0 ? Math.round((activeCameras / totalCameras) * 100) : 100,
      },
    });
  } catch {
    res.json({ database: { connected: false }, cameras: { total: 0, active: 0, health_percentage: 0 } });
  }
});

// 仪表板聚合 (行为监控前端)
app.get('/api/v1/dashboard', async (_req, res) => {
  try {
    const [totalFarms, totalCattle, totalCameras, activeCameras, farms, camStatus] = await Promise.all([
      prisma.sharedFarm.count(),
      prisma.sharedCattle.count({ where: { status: { not: 'sold' } } }),
      prisma.sharedCamera.count(),
      prisma.sharedCamera.count({ where: { status: 'active' } }),
      prisma.sharedFarm.findMany({
        take: 20,
        orderBy: { id: 'asc' },
        include: { _count: { select: { pens: true, cattle: true, cameras: true } } },
      }),
      Promise.all([
        prisma.sharedCamera.count({ where: { status: 'active' } }),
        prisma.sharedCamera.count({ where: { status: 'inactive' } }),
        prisma.sharedCamera.count({ where: { status: 'maintenance' } }),
      ]),
    ]);

    res.json({
      summary: {
        total_farms:    totalFarms,
        total_cattle:   totalCattle,
        total_cameras:  totalCameras,
        active_cameras: activeCameras,
      },
      farms: farms.map(f => ({
        ...f,
        statistics: {
          pens_count:    f._count.pens,
          cattle_count:  f._count.cattle,
          cameras_count: f._count.cameras,
          active_cameras: f._count.cameras,
        },
      })),
      camera_status: {
        active:      camStatus[0],
        inactive:    camStatus[1],
        maintenance: camStatus[2],
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 认证
app.use('/api/v1/auth', authRouter);

// 公共资源
app.use('/api/v1/farms', farmsRouter);
app.use('/api/v1/pens', pensRouter);
app.use('/api/v1/cattle', cattleRouter);
app.use('/api/v1/cameras', camerasRouter);

// IMF 肉质评估模块
app.use('/api/v1/measurements', imfMeasurementsRouter);
app.use('/api/v1/reports', imfReportsRouter);

// 行为监控模块
app.use('/api/v1/monitoring/behavior', monitorBehaviorRouter);
app.use('/api/v1/monitoring/statistics', monitorStatisticsRouter);
app.use('/api/v1/monitoring/stream', monitorStreamRouter);
app.use('/api/v1/statistics', monitorStatisticsRouter); // 兼容旧监控前端路径

// TMR 饲料配比模块
app.use('/api/v1/tmr/devices', tmrDevicesRouter);
app.use('/api/v1/tmr/formulas', tmrFormulasRouter);
app.use('/api/v1/tmr/tasks', tmrTasksRouter);
app.use('/api/v1/tmr/events', tmrEventsRouter);
app.use('/api/v1/tmr/roi', tmrRoiRouter);            // 兼容旧 TMR 前端路径
// /api/v1/tmr/reports/daily → 转发给 tmrTasksRouter 的 /reports/daily 处理器
app.use('/api/v1/tmr/reports', (req: any, res: any, next: any) => {
  if (req.path === '/daily') {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = '/reports/daily' + qs;
    return tmrTasksRouter(req, res, next);
  }
  next();
});

// Socket.IO (TMR 实时状态)
setupTmrSocket(io);

const PORT = Number(process.env.PORT) || 3000;
httpServer.listen(PORT, () => {
  console.log(`统一后端已启动: http://localhost:${PORT}`);
  console.log('模块: 认证 | 公共数据 | IMF肉质评估 | 行为监控 | TMR饲料配比');
  // 自动写入 IMF 示范数据（仅首次或数据不足时执行）
  runImfSeed().catch((err) => console.error('IMF seed 失败:', err));
});
