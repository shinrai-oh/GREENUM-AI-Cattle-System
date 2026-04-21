// 统计相关模拟数据

export const getStatisticsSummaryMock = (params = {}) => {
  const date = params.date || '2024-12-29'
  return {
    date,
    total_cattle: 12,
    averages: {
      drinking_time: 6.67,
      eating_time: 48.33,
      lying_time: 237.5,
      standing_time: 172.5,
      walking_time: 17.92,
      total_active_time: 482.92
    },
    totals: {
      drinking_time: 80,
      eating_time: 580,
      lying_time: 2850,
      standing_time: 2070,
      walking_time: 215,
      total_active_time: 5795
    },
    estrus: {
      count: 2,
      ratio: 16.67
    }
  }
}

export const getBehaviorTrendsMock = (params = {}) => {
  const days = params.days || 7
  const base = new Date('2024-12-29')
  const trends = Array.from({ length: days }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() - (days - 1 - i))
    const dateStr = d.toISOString().split('T')[0]
    return {
      date: dateStr,
      avg_eating_time: 40 + Math.round(Math.random() * 20),
      avg_standing_time: 150 + Math.round(Math.random() * 40),
      avg_lying_time: 220 + Math.round(Math.random() * 40),
      avg_walking_time: 15 + Math.round(Math.random() * 6)
    }
  })
  return { trends }
}

export const getBehaviorComparisonMock = (params = {}) => {
  const pens = params.pen_ids || ['A001', 'A002']
  const comparison = pens.map((id, idx) => ({
    pen_number: typeof id === 'string' ? id : `A00${idx + 1}`,
    avg_eating_time: 45 + Math.round(Math.random() * 10),
    avg_standing_time: 160 + Math.round(Math.random() * 20),
    avg_lying_time: 230 + Math.round(Math.random() * 20),
    avg_walking_time: 16 + Math.round(Math.random() * 4),
    estrus_count: Math.round(Math.random() * 5)
  }))
  return { comparison }
}

export const getDailyStatisticsMock = (params = {}) => {
  const makeRow = (idx) => ({
    stat_date: params.start_date || '2024-12-29',
    cattle_id: idx + 1,
    cattle_ear_tag: `E${String(1000 + idx)}`,
    pen_number: `A00${(idx % 3) + 1}`,
    is_estrus: (idx % 6) === 0, // 简单随机：约16%的记录为“是”
    eating_time: 40 + (idx % 10),
    standing_time: 160 + (idx % 15),
    lying_time: 230 + (idx % 20),
    walking_time: 16 + (idx % 6),
    drinking_time: 6 + (idx % 3),
    total_active_time: 480 + (idx % 25)
  })
  const statistics = Array.from({ length: 20 }, (_, i) => makeRow(i))
  return {
    statistics,
    pagination: { total: statistics.length }
  }
}
