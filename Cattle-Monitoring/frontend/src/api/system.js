import api from './index';

// 获取系统状态
export function checkSystemStatus() {
  return api({
    url: '/system/status',
    method: 'get'
  });
}

// 获取仪表板数据
export function getDashboardData() {
  return api({
    url: '/dashboard',
    method: 'get'
  });
}

// 全局搜索
export function searchData(params) {
  return api({
    url: '/search',
    method: 'get',
    params
  });
}

// 获取API信息
export function getApiInfo() {
  return api({
    url: '/info',
    method: 'get'
  });
}