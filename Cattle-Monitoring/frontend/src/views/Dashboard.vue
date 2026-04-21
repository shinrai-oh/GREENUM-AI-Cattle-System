<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="mb-4">
      <el-col :xs="24" :sm="12" :md="6" v-for="stat in stats" :key="stat.key">
        <div class="stat-card" :style="{ background: stat.gradient }">
          <el-icon class="stat-icon">
            <component :is="stat.icon" v-if="stat.icon" />
          </el-icon>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <!-- 养牛厂概览 -->
      <el-col :xs="24" :lg="12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><OfficeBuilding /></el-icon>
              养牛厂概览
            </h3>
            <el-button type="primary" size="small" @click="$router.push('/management')">
              查看全部
            </el-button>
          </div>
          <div class="card-body">
            <el-table :data="farms" style="width: 100%" v-loading="loading.farms">
              <el-table-column prop="name" label="养牛厂名称" min-width="120" />
              <el-table-column prop="statistics.pens_count" label="栏位数" width="80" align="center" />
              <el-table-column prop="statistics.cattle_count" label="牛只数" width="80" align="center" />
              <el-table-column prop="statistics.cameras_count" label="摄像头" width="80" align="center" />
              <el-table-column label="状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag 
                    :type="row.statistics.active_cameras === row.statistics.cameras_count ? 'success' : 'warning'"
                    size="small"
                  >
                    {{ row.statistics.active_cameras }}/{{ row.statistics.cameras_count }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80" align="center">
                <template #default="{ row }">
                  <el-button 
                    type="text" 
                    size="small" 
                    @click="$router.push(`/management/farm/${row.id}`)"
                  >
                    详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-col>

      <!-- 摄像头状态 -->
      <el-col :xs="24" :lg="12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><VideoCamera /></el-icon>
              摄像头状态
            </h3>
            <el-button type="primary" size="small" @click="$router.push('/monitoring')">
              视频监控
            </el-button>
          </div>
          <div class="card-body">
            <div class="chart-container" ref="cameraChartRef"></div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-4">
      <!-- 最近活动 -->
      <el-col :xs="24" :lg="16">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><Clock /></el-icon>
              系统活动
            </h3>
          </div>
          <div class="card-body">
            <el-timeline>
              <el-timeline-item
                v-for="activity in activities"
                :key="activity.id"
                :timestamp="activity.time"
                :type="activity.type"
              >
                <div class="activity-content">
                  <div class="activity-title">{{ activity.title }}</div>
                  <div class="activity-desc">{{ activity.description }}</div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>
      </el-col>

      <!-- 快速操作 -->
      <el-col :xs="24" :lg="8">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><Operation /></el-icon>
              快速操作
            </h3>
          </div>
          <div class="card-body">
            <div class="quick-actions">
              <el-button 
                type="primary" 
                class="action-btn"
                @click="$router.push('/monitoring')"
              >
                <el-icon><VideoCamera /></el-icon>
                视频监控
              </el-button>
              <el-button 
                type="success" 
                class="action-btn"
                @click="$router.push('/statistics')"
              >
                <el-icon><DataAnalysis /></el-icon>
                数据统计
              </el-button>
              <el-button 
                type="info" 
                class="action-btn"
                @click="refreshData"
              >
                <el-icon><Refresh /></el-icon>
                刷新数据
              </el-button>
              <el-button 
                type="warning" 
                class="action-btn"
                @click="$router.push('/management')"
              >
                <el-icon><Setting /></el-icon>
                系统管理
              </el-button>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, onActivated, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import {
  OfficeBuilding,
  VideoCamera,
  DataAnalysis,
  Setting,
  Clock,
  Operation,
  Refresh,
  Monitor,
  User,
  Camera
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getDashboardData } from '@/api/system'
import { clearCache } from '@/api/index'

// 请求取消控制器
let abortController = null

// 取消待处理的请求
const cancelPendingRequests = () => {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
}

// 响应式数据
const stats = ref([
  {
    key: 'farms',
    label: '养牛厂数量',
    value: 0,
    icon: OfficeBuilding,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    key: 'cattle',
    label: '牛只总数',
    value: 0,
    icon: User,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  {
    key: 'cameras',
    label: '摄像头总数',
    value: 0,
    icon: Camera,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  },
  {
    key: 'active_cameras',
    label: '在线摄像头',
    value: 0,
    icon: Monitor,
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
  }
])

const farms = ref([])
const activities = ref([
  {
    id: 1,
    title: '系统启动',
    description: '肉牛监控系统成功启动',
    time: '2024-01-15 09:00:00',
    type: 'success'
  },
  {
    id: 2,
    title: '摄像头连接',
    description: '16个摄像头全部连接正常',
    time: '2024-01-15 09:05:00',
    type: 'success'
  },
  {
    id: 3,
    title: '数据同步',
    description: '完成今日行为数据同步',
    time: '2024-01-15 10:00:00',
    type: 'info'
  }
])

const loading = reactive({
  farms: false,
  dashboard: false
})

const cameraChartRef = ref(null)
let cameraChart = null

// 数据缓存
const lastFetchTime = ref(0)
const CACHE_DURATION = 60000 // 1分钟缓存

// 获取仪表板数据
const fetchDashboardData = async (forceRefresh = false) => {
  // 检查缓存
  const now = Date.now()
  if (!forceRefresh && now - lastFetchTime.value < CACHE_DURATION) {
    return // 使用缓存的数据
  }
  
  try {
    // 取消之前的请求
    cancelPendingRequests()
    
    // 创建新的请求控制器
    abortController = new AbortController()
    
    loading.dashboard = true
    loading.farms = true
    
    const response = await getDashboardData()
    
    // API拦截器返回data.data部分
    const { summary, farms: farmsData, camera_status } = response || {}
    
    // 更新统计数据 - 添加空值检查
    if (summary) {
      stats.value[0].value = summary.total_farms || 0
      stats.value[1].value = summary.total_cattle || 0
      stats.value[2].value = summary.total_cameras || 0
      stats.value[3].value = summary.active_cameras || 0
    }
    
    // 更新养牛厂数据
    farms.value = farmsData || []
    
    // 更新缓存时间
    lastFetchTime.value = now
    
    // 更新摄像头状态图表
    await nextTick()
    if (camera_status) {
      updateCameraChart(camera_status)
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('获取仪表板数据失败:', error)
      ElMessage.error('获取仪表板数据失败')
    }
  } finally {
    loading.dashboard = false
    loading.farms = false
  }
}

// 更新摄像头状态图表
const updateCameraChart = (cameraStatus) => {
  if (!cameraChartRef.value || !cameraStatus) return
  
  if (!cameraChart) {
    cameraChart = echarts.init(cameraChartRef.value)
  }
  
  const option = {
    title: {
      text: '摄像头状态分布',
      left: 'center',
      textStyle: {
        fontSize: 14,
        color: '#606266'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      bottom: '0',
      left: 'center'
    },
    series: [
      {
        name: '摄像头状态',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          {
            value: cameraStatus.active,
            name: '正常',
            itemStyle: { color: '#67c23a' }
          },
          {
            value: cameraStatus.inactive,
            name: '离线',
            itemStyle: { color: '#f56c6c' }
          },
          {
            value: cameraStatus.maintenance,
            name: '维护中',
            itemStyle: { color: '#e6a23c' }
          }
        ]
      }
    ]
  }
  
  cameraChart.setOption(option)
}

// 刷新数据
const refreshData = () => {
  ElMessage.success('正在刷新数据...')
  fetchDashboardData(true) // 强制刷新
}

// 组件挂载时获取数据
onMounted(() => {
  fetchDashboardData()
  
  // 监听窗口大小变化，重新调整图表
  window.addEventListener('resize', () => {
    if (cameraChart) {
      cameraChart.resize()
    }
  })
})

// 组件激活时检查是否需要刷新数据
onActivated(() => {
  // 清除API缓存，确保获取最新数据
  clearCache()
  fetchDashboardData() // 使用缓存机制
})

// 组件卸载前清理
onBeforeUnmount(() => {
  // 取消待处理的请求
  cancelPendingRequests()
  
  // 销毁图表实例
  if (cameraChart) {
    cameraChart.dispose()
    cameraChart = null
  }
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-btn {
  width: 100%;
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.action-btn .el-icon {
  font-size: 20px;
}

.activity-content {
  margin-left: 8px;
}

.activity-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.activity-desc {
  color: #909399;
  font-size: 12px;
}

@media (max-width: 768px) {
  .quick-actions {
    grid-template-columns: 1fr;
  }
  
  .action-btn {
    height: 50px;
  }
}
</style>