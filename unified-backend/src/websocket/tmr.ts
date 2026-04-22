import { Server as SocketIOServer } from 'socket.io';
import prisma from '../db';

export function setupTmrSocket(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    console.log(`Socket 客户端已连接: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Socket 客户端已断开: ${socket.id}`);
    });
  });

  // 每 2 秒广播所有 TMR 设备状态
  setInterval(async () => {
    try {
      const devices = await prisma.tmrDevice.findMany({
        include: {
          tasks: {
            include: { formula: true },
            orderBy: { taskDate: 'desc' },
            take: 1,
          },
        },
      });

      for (const device of devices) {
        const latestTask = device.tasks[0] || null;
        const formulaItems = latestTask
          ? (latestTask.formula.items as { material: string; targetWeightKg: number }[])
          : [];

        io.emit('status', {
          deviceId: device.id,
          deviceName: device.name,
          status: device.status,
          progressPct: device.status === 'mixing' ? simulateProgress() : 0,
          taskDate: latestTask ? latestTask.taskDate.toISOString().slice(0, 10) : null,
          formulaName: latestTask ? latestTask.formula.name : null,
          items: formulaItems.map((item) => ({
            material: item.material,
            targetWeightKg: item.targetWeightKg,
          })),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      // DB 可能未就绪，静默忽略
    }
  }, 2000);
}

// 模拟混合进度（正式使用时由实际设备反馈替换）
let _progress = 0;
function simulateProgress(): number {
  _progress = (_progress + 2) % 101;
  return _progress;
}
