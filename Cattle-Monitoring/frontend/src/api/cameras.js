import api from './index'

// 获取摄像头列表
export const getCameras = (params) => {
  return api.get('/cameras', { params })
}

// 获取单个摄像头信息
export const getCamera = (id) => {
  return api.get(`/cameras/${id}`)
}

// 创建摄像头
export const createCamera = (data) => {
  return api.post('/cameras', data)
}

// 更新摄像头
export const updateCamera = (id, data) => {
  return api.put(`/cameras/${id}`, data)
}

// 删除摄像头
export const deleteCamera = (id) => {
  return api.delete(`/cameras/${id}`)
}

// 获取摄像头视频流URL
export const getCameraStreamUrl = (id) => {
  return `/api/v1/cameras/${id}/stream`
}

// 获取摄像头快照
export const getCameraSnapshot = (id) => {
  return api.get(`/cameras/${id}/snapshot`)
}

// 测试摄像头连接
export const testCameraConnection = (id) => {
  return api.post(`/cameras/${id}/test`)
}

// 获取养牛厂的摄像头
export const getFarmCameras = (farmId) => {
  return api.get(`/cameras/farm/${farmId}`)
}