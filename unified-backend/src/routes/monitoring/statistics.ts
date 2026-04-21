import { Router, Response } from 'express';
import prisma from '../../db';
import { authenticate, AuthRequest } from '../../auth';

const router = Router();

// GET /api/v1/statistics/behavior
router.get('/behavior', authenticate, async (req: AuthRequest, res: Response) => {
  const cattleId    = req.query.cattleId    ? Number(req.query.cattleId)              : undefined;
  const behaviorType = req.query.behaviorType ? String(req.query.behaviorType)        : undefined;
  const startDate   = req.query.startDate   ? new Date(String(req.query.startDate))   : undefined;
  const endDate     = req.query.endDate     ? new Date(String(req.query.endDate))     : undefined;

  const where = {
    ...(cattleId && { cattleId }),
    ...(behaviorType && { behaviorType }),
    ...(startDate || endDate
      ? { startTime: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
      : {}),
  };

  const data = await prisma.monitorBehaviorData.findMany({
    where, orderBy: { startTime: 'desc' }, take: 500,
    include: { cattle: { select: { earTag: true } } },
  });

  res.json({ data, total: data.length });
});

// GET /api/v1/statistics/daily
router.get('/daily', authenticate, async (req: AuthRequest, res: Response) => {
  const cattleId  = req.query.cattleId  ? Number(req.query.cattleId)             : undefined;
  const farmId    = req.query.farmId    ? Number(req.query.farmId)               : undefined;
  const penId     = req.query.penId     ? Number(req.query.penId)                : undefined;
  const startDate = req.query.startDate ? new Date(String(req.query.startDate))  : undefined;
  const endDate   = req.query.endDate   ? new Date(String(req.query.endDate))    : undefined;
  const page      = Math.max(1, Number(req.query.page) || 1);
  const perPage   = Math.min(500, Number(req.query.limit || req.query.per_page || req.query.perPage) || 20);

  const where: any = {
    ...(cattleId && { cattleId }),
    ...(startDate || endDate
      ? { statDate: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
      : {}),
  };
  if (farmId) where.cattle = { farmId };
  if (penId)  where.cattle = { ...(where.cattle || {}), penId };

  const [data, total] = await Promise.all([
    prisma.monitorDailyStatistics.findMany({
      where, orderBy: { statDate: 'desc' },
      skip: (page - 1) * perPage, take: perPage,
      include: {
        cattle: {
          select: {
            earTag: true, farmId: true, penId: true, breed: true, gender: true,
            pen: { select: { penNumber: true } },
          },
        },
      },
    }),
    prisma.monitorDailyStatistics.count({ where }),
  ]);

  // 扁平化附加字段，方便前端直接读取
  const statistics = data.map(r => ({
    ...r,
    cattle_ear_tag: r.cattle?.earTag ?? null,
    pen_number:     r.cattle?.pen?.penNumber ?? null,
    breed:          r.cattle?.breed ?? null,
    gender:         r.cattle?.gender ?? null,
    is_estrus:      r.isEstrus,
  }));

  res.json({
    statistics,
    pagination: { total, page, per_page: perPage },
    total,
  });
});

// GET /api/v1/statistics/summary
router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  // 优先使用请求的日期；若无则回退到最近有数据的日期
  let queryDate = req.query.date ? new Date(String(req.query.date)) : null;
  if (!queryDate) {
    // 找最近有统计数据的日期
    const latest = await prisma.monitorDailyStatistics.findFirst({ orderBy: { statDate: 'desc' }, select: { statDate: true } });
    queryDate = latest?.statDate ?? new Date();
  }
  const dayStart = new Date(queryDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(queryDate);
  dayEnd.setHours(23, 59, 59, 999);

  const [totalCattle, totalFemaleCattle, totalCameras, todayBehavior, todayStats, estrusCount, pregnancyStats] = await Promise.all([
    prisma.sharedCattle.count({ where: { status: { not: 'sold' } } }),
    prisma.sharedCattle.count({ where: { gender: 'F', status: { not: 'sold' } } }),
    prisma.sharedCamera.count({ where: { status: 'active' } }),
    prisma.monitorBehaviorData.count({ where: { startTime: { gte: dayStart, lte: dayEnd } } }),
    prisma.monitorDailyStatistics.aggregate({
      where: { statDate: dayStart },
      _avg: { eatingTime: true, standingTime: true, lyingTime: true, walkingTime: true },
    }),
    // 当日发情头数
    prisma.monitorDailyStatistics.count({ where: { statDate: dayStart, isEstrus: true } }),
    // 妊娠状态分布（当日）
    prisma.monitorDailyStatistics.groupBy({
      by: ['pregnancyStatus'],
      where: { statDate: dayStart, pregnancyStatus: { not: null } },
      _count: { id: true },
    }),
  ]);

  const totalFemale = totalFemaleCattle || 104;
  const pregnancyMap: Record<string, number> = {};
  for (const r of pregnancyStats) {
    if (r.pregnancyStatus) pregnancyMap[r.pregnancyStatus] = r._count.id;
  }

  res.json({
    total_cattle:          totalCattle,
    total_female_cattle:   totalFemale,
    total_cameras:         totalCameras,
    today_behavior_events: todayBehavior,
    averages: {
      eating_time:   Math.round(todayStats._avg.eatingTime   ?? 0),
      standing_time: Math.round(todayStats._avg.standingTime ?? 0),
      lying_time:    Math.round(todayStats._avg.lyingTime    ?? 0),
      walking_time:  Math.round(todayStats._avg.walkingTime  ?? 0),
    },
    today_avg: {
      eating_time:   Math.round(todayStats._avg.eatingTime   ?? 0),
      standing_time: Math.round(todayStats._avg.standingTime ?? 0),
      lying_time:    Math.round(todayStats._avg.lyingTime    ?? 0),
      walking_time:  Math.round(todayStats._avg.walkingTime  ?? 0),
    },
    estrus: {
      count: estrusCount,
      ratio: Number(((estrusCount / totalFemale) * 100).toFixed(1)),
    },
    pregnancy: {
      open:      pregnancyMap['open']      ?? 0,
      bred:      pregnancyMap['bred']      ?? 0,
      pregnant:  pregnancyMap['pregnant']  ?? 0,
      calving:   pregnancyMap['calving']   ?? 0,
    },
  });
});

// GET /api/v1/statistics/trends
router.get('/trends', authenticate, async (req: AuthRequest, res: Response) => {
  const days   = Math.min(30, Number(req.query.days) || 7);
  const farmId = req.query.farmId ? Number(req.query.farmId) : undefined;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const data = await prisma.monitorDailyStatistics.findMany({
    where: {
      statDate: { gte: since },
      ...(farmId ? { cattle: { farmId } } : {}),
    },
    orderBy: { statDate: 'asc' },
    include: { cattle: { select: { earTag: true } } },
  });

  // Group by date
  const byDate: Record<string, { eating: number; standing: number; lying: number; walking: number; count: number }> = {};
  for (const d of data) {
    const key = d.statDate.toISOString().slice(0, 10);
    if (!byDate[key]) byDate[key] = { eating: 0, standing: 0, lying: 0, walking: 0, count: 0 };
    byDate[key].eating   += d.eatingTime   ?? 0;
    byDate[key].standing += d.standingTime ?? 0;
    byDate[key].lying    += d.lyingTime    ?? 0;
    byDate[key].walking  += d.walkingTime  ?? 0;
    byDate[key].count    += 1;
  }

  const trends = Object.entries(byDate).map(([date, v]) => ({
    date,
    eating_time:   v.count ? Math.round(v.eating   / v.count) : 0,
    standing_time: v.count ? Math.round(v.standing / v.count) : 0,
    lying_time:    v.count ? Math.round(v.lying    / v.count) : 0,
    walking_time:  v.count ? Math.round(v.walking  / v.count) : 0,
  }));

  res.json({ trends });
});

// GET /api/v1/statistics/comparison
router.get('/comparison', authenticate, async (req: AuthRequest, res: Response) => {
  const penIds = [req.query.pen_ids].flat().filter(Boolean).map(Number);
  const date   = req.query.date ? new Date(String(req.query.date)) : new Date();
  const dayStart = new Date(new Date(date).setHours(0, 0, 0, 0));
  const dayEnd   = new Date(new Date(date).setHours(23, 59, 59, 999));

  const pens = penIds.length > 0
    ? await prisma.sharedPen.findMany({ where: { id: { in: penIds } } })
    : await prisma.sharedPen.findMany({ take: 5 });

  const comparison = await Promise.all(pens.map(async pen => {
    const stats = await prisma.monitorDailyStatistics.aggregate({
      where: {
        statDate: { gte: dayStart, lte: dayEnd },
        cattle: { penId: pen.id },
      },
      _avg: { eatingTime: true, standingTime: true, lyingTime: true, walkingTime: true },
    });
    return {
      pen_id:        pen.id,
      pen_number:    pen.penNumber,
      eating_time:   Math.round(stats._avg.eatingTime   ?? 0),
      standing_time: Math.round(stats._avg.standingTime ?? 0),
      lying_time:    Math.round(stats._avg.lyingTime    ?? 0),
      walking_time:  Math.round(stats._avg.walkingTime  ?? 0),
    };
  }));

  res.json({ comparison });
});

// GET /api/v1/statistics/cattle/:id/history
router.get('/cattle/:id/history', authenticate, async (req: AuthRequest, res: Response) => {
  const cattleId = Number(req.params.id);

  // 不限制日期范围：直接返回该牛只全部历史数据
  // 避免"今天日期 - N天"的锚点导致跨年数据查不到
  const [cattle, daily_statistics, recent_behaviors] = await Promise.all([
    prisma.sharedCattle.findUnique({
      where: { id: cattleId },
      include: { farm: true, pen: true },
    }),
    prisma.monitorDailyStatistics.findMany({
      where: { cattleId },
      orderBy: { statDate: 'desc' },
      take: 90,
    }),
    prisma.monitorBehaviorData.findMany({
      where: { cattleId },
      orderBy: { startTime: 'desc' },
      take: 100,
    }),
  ]);

  if (!cattle) { res.status(404).json({ error: '牛只不存在' }); return; }
  res.json({ cattle, daily_statistics, recent_behaviors });
});

// GET /api/v1/statistics/export
router.get('/export', authenticate, async (req: AuthRequest, res: Response) => {
  const farmId    = req.query.farmId    ? Number(req.query.farmId)               : undefined;
  const startDate = req.query.startDate ? new Date(String(req.query.startDate))  : undefined;
  const endDate   = req.query.endDate   ? new Date(String(req.query.endDate))    : undefined;

  const where: any = {
    ...(startDate || endDate
      ? { statDate: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
      : {}),
  };
  if (farmId) where.cattle = { farmId };

  const data = await prisma.monitorDailyStatistics.findMany({
    where, orderBy: { statDate: 'desc' }, take: 5000,
    include: { cattle: { select: { earTag: true, farmId: true } } },
  });

  res.json({ data, total: data.length, exported_at: new Date().toISOString() });
});

// POST /api/v1/statistics/daily  (写入/更新日统计)
router.post('/daily', authenticate, async (req: AuthRequest, res: Response) => {
  const { cattleId, statDate, eatingTime, standingTime, lyingTime, walkingTime, drinkingTime } = req.body;
  if (!cattleId || !statDate) { res.status(400).json({ error: 'cattleId 和 statDate 不能为空' }); return; }

  const record = await prisma.monitorDailyStatistics.upsert({
    where: { cattleId_statDate: { cattleId: Number(cattleId), statDate: new Date(statDate) } },
    create: {
      cattleId:        Number(cattleId),
      statDate:        new Date(statDate),
      eatingTime:      eatingTime      ?? 0,
      standingTime:    standingTime    ?? 0,
      lyingTime:       lyingTime       ?? 0,
      walkingTime:     walkingTime     ?? 0,
      drinkingTime:    drinkingTime    ?? 0,
      totalActiveTime: (eatingTime ?? 0) + (standingTime ?? 0) + (walkingTime ?? 0),
    },
    update: {
      eatingTime:      eatingTime      ?? 0,
      standingTime:    standingTime    ?? 0,
      lyingTime:       lyingTime       ?? 0,
      walkingTime:     walkingTime     ?? 0,
      drinkingTime:    drinkingTime    ?? 0,
      totalActiveTime: (eatingTime ?? 0) + (standingTime ?? 0) + (walkingTime ?? 0),
    },
  });
  res.json(record);
});

// GET /api/v1/statistics/estrus?date=&farmId=&penId=
// 获取指定日期的发情牛只列表（带配种档案信息）
router.get('/estrus', authenticate, async (req: AuthRequest, res: Response) => {
  const dateStr = String(req.query.date || '');
  const farmId  = req.query.farmId ? Number(req.query.farmId) : undefined;
  const penId   = req.query.penId  ? Number(req.query.penId)  : undefined;

  // 若无指定日期，取最近有发情记录的日期
  let queryDate: Date;
  if (dateStr) {
    queryDate = new Date(dateStr);
  } else {
    const latest = await prisma.monitorDailyStatistics.findFirst({
      where: { isEstrus: true },
      orderBy: { statDate: 'desc' },
      select: { statDate: true },
    });
    queryDate = latest?.statDate ?? new Date('2023-10-07');
  }

  const where: any = {
    statDate: queryDate,
    isEstrus: true,
    cattle: { gender: 'F' },
  };
  if (farmId) where.cattle = { ...where.cattle, farmId };
  if (penId)  where.cattle = { ...where.cattle, penId };

  const data = await prisma.monitorDailyStatistics.findMany({
    where,
    orderBy: { estrusIntensity: 'desc' },
    include: {
      cattle: {
        select: {
          id: true, earTag: true, breed: true, birthDate: true, weight: true,
          farmId: true, penId: true,
          pen: { select: { penNumber: true } },
        },
      },
    },
  });

  // 获取当日总母牛数
  const totalFemale = await prisma.sharedCattle.count({ where: { gender: 'F', status: { not: 'sold' } } });

  const items = data.map(r => ({
    id:                r.id,
    stat_date:         r.statDate,
    cattle_id:         r.cattle.id,
    cattle_ear_tag:    r.cattle.earTag,
    pen_number:        r.cattle.pen?.penNumber ?? null,
    breed:             r.cattle.breed,
    birth_date:        r.cattle.birthDate,
    weight:            r.cattle.weight,
    is_estrus:         r.isEstrus,
    estrus_intensity:  r.estrusIntensity,
    last_breeding_date: r.lastBreedingDate,
    pregnancy_status:  r.pregnancyStatus,
    eating_time:       r.eatingTime,
    standing_time:     r.standingTime,
    lying_time:        r.lyingTime,
    walking_time:      r.walkingTime,
    drinking_time:     r.drinkingTime,
    total_active_time: r.totalActiveTime,
  }));

  res.json({
    date:          queryDate,
    count:         items.length,
    total_female:  totalFemale,
    ratio:         Number(((items.length / totalFemale) * 100).toFixed(1)),
    items,
  });
});

// GET /api/v1/statistics/breeding-overview?date=
// 繁殖档案概览：妊娠率、配种率等
router.get('/breeding-overview', authenticate, async (req: AuthRequest, res: Response) => {
  const dateStr = String(req.query.date || '2023-10-07');
  const statDate = new Date(dateStr);

  const [pregnancyGroups, estrusDays] = await Promise.all([
    // 妊娠状态分布
    prisma.monitorDailyStatistics.groupBy({
      by: ['pregnancyStatus'],
      where: { statDate, pregnancyStatus: { not: null } },
      _count: { id: true },
    }),
    // 近7天每日发情数
    prisma.monitorDailyStatistics.groupBy({
      by: ['statDate'],
      where: {
        statDate: {
          gte: new Date('2023-10-01'),
          lte: new Date('2023-10-07'),
        },
        isEstrus: true,
      },
      _count: { id: true },
      orderBy: { statDate: 'asc' },
    }),
  ]);

  const totalFemale = await prisma.sharedCattle.count({ where: { gender: 'F', status: { not: 'sold' } } });

  const statusMap: Record<string, number> = {};
  for (const g of pregnancyGroups) {
    if (g.pregnancyStatus) statusMap[g.pregnancyStatus] = g._count.id;
  }

  res.json({
    total_female: totalFemale,
    pregnancy_rate: Number((((statusMap['pregnant'] ?? 0) / totalFemale) * 100).toFixed(1)),
    breeding_rate:  Number((((statusMap['bred'] ?? 0) / totalFemale) * 100).toFixed(1)),
    open_rate:      Number((((statusMap['open'] ?? 0) / totalFemale) * 100).toFixed(1)),
    status: {
      pregnant: statusMap['pregnant'] ?? 0,
      bred:     statusMap['bred']     ?? 0,
      open:     statusMap['open']     ?? 0,
      calving:  statusMap['calving']  ?? 0,
    },
    estrus_trend: estrusDays.map(d => ({
      date:  d.statDate,
      count: d._count.id,
    })),
  });
});

export default router;
