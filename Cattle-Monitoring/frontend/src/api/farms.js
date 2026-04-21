import api from './index'

// 获取养牛厂列表
export const getFarms = (params) => {
  return api.get('/farms', { params })
}

// 获取单个养牛厂信息
export const getFarm = (id) => {
  return api.get(`/farms/${id}`)
}

// 创建养牛厂
export const createFarm = (data) => {
  return api.post('/farms', data)
}

// 更新养牛厂
export const updateFarm = (id, data) => {
  return api.put(`/farms/${id}`, data)
}

// 删除养牛厂
export const deleteFarm = (id) => {
  return api.delete(`/farms/${id}`)
}

// 获取养牛厂的栏位列表
export const getFarmPens = (farmId) => {
  return api.get(`/farms/${farmId}/pens`)
}

// 为养牛厂创建栏位
export const createFarmPen = (farmId, data) => {
  return api.post(`/farms/${farmId}/pens`, data)
}

// 获取养牛厂的牛只列表
export const getFarmCattle = (farmId, params) => {
  return api.get(`/farms/${farmId}/cattle`, { params })
}

// 为养牛厂添加牛只
export const createFarmCattle = (farmId, data) => {
  return api.post(`/farms/${farmId}/cattle`, data)
}