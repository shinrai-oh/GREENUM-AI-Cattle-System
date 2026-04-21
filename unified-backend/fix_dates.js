// 临时脚本：将统计数据时间从 2026 改为 2023
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // monitor_daily_statistics: 2026-04-05~11 → 2023-10-01~07
  const stats = await prisma.monitorDailyStatistic.findMany({ orderBy: { statDate: 'asc' } });
  console.log('统计记录数:', stats.length);

  // 按原日期顺序重映射：最早日期 → 2023-10-01
  const dates = [...new Set(stats.map(s => s.statDate.toISOString().slice(0,10)))].sort();
  const base = new Date('2023-10-01');
  const dateMap = {};
  dates.forEach((d, i) => {
    const nd = new Date(base);
    nd.setDate(nd.getDate() + i);
    dateMap[d] = nd;
    console.log(`  ${d} → ${nd.toISOString().slice(0,10)}`);
  });

  for (const s of stats) {
    const oldKey = s.statDate.toISOString().slice(0,10);
    await prisma.monitorDailyStatistic.update({
      where: { id: s.id },
      data: { statDate: dateMap[oldKey] }
    });
  }
  console.log('每日统计日期更新完成');

  // monitor_behavior_data: 2026-04-11 → 2023-10-07
  const behaviors = await prisma.monitorBehaviorData.findMany();
  console.log('行为事件数:', behaviors.length);
  for (const b of behaviors) {
    const origStart = b.startTime;
    const origEnd   = b.endTime;
    const newStart  = new Date('2023-10-07T' + origStart.toISOString().slice(11));
    const newEnd    = origEnd ? new Date('2023-10-07T' + origEnd.toISOString().slice(11)) : null;
    await prisma.monitorBehaviorData.update({
      where: { id: b.id },
      data: { startTime: newStart, endTime: newEnd }
    });
  }
  console.log('行为事件时间更新完成');

  // 最终验证
  const [minS, maxS] = await Promise.all([
    prisma.monitorDailyStatistic.findFirst({ orderBy: { statDate: 'asc' }, select: { statDate: true } }),
    prisma.monitorDailyStatistic.findFirst({ orderBy: { statDate: 'desc' }, select: { statDate: true } }),
  ]);
  console.log('统计日期范围:', minS.statDate.toISOString().slice(0,10), '~', maxS.statDate.toISOString().slice(0,10));
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });
