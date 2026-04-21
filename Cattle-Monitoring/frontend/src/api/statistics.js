import api from './index'

// 获取日统计数据
export const getDailyStatistics = (params) => {
  return api.get('/statistics/daily', { params })
}

// 获取行为数据
export const getBehaviorData = (params) => {
  return api.get('/statistics/behavior', { params })
}

// 获取统计摘要
export const getStatisticsSummary = (params) => {
  return api.get('/statistics/summary', { params })
}

// 获取行为趋势数据
export const getBehaviorTrends = (params) => {
  return api.get('/statistics/trends', { params })
}

// 获取行为对比数据
export const getBehaviorComparison = (params) => {
  // 处理数组参数，确保正确序列化
  const searchParams = new URLSearchParams()
  
  if (params.farm_id) {
    searchParams.append('farm_id', params.farm_id)
  }
  
  if (params.pen_ids && Array.isArray(params.pen_ids)) {
    params.pen_ids.forEach(id => {
      searchParams.append('pen_ids', id)
    })
  }
  
  if (params.date) {
    searchParams.append('date', params.date)
  }
  
  return api.get(`/statistics/comparison?${searchParams.toString()}`)
}

// 获取牛只历史数据
export const getCattleHistory = (cattleId, params) => {
  return api.get(`/statistics/cattle/${cattleId}/history`, { params })
}

// 导出统计数据
export const exportStatistics = (params) => {
  return api.get('/statistics/export', { params })
}