<template>
  <div class="farm-detail">
    <div class="page-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/management' }">系统管理</el-breadcrumb-item>
        <el-breadcrumb-item>养牛厂详情</el-breadcrumb-item>
      </el-breadcrumb>
      <h1>{{ farm.name || '养牛厂详情' }}</h1>
    </div>

    <div class="content-container">
      <el-row :gutter="20">
        <el-col :span="16">
          <el-card title="基本信息">
            <div class="farm-info">
              <div class="info-item">
                <label>养牛厂名称：</label>
                <span>{{ farm.name }}</span>
              </div>
              <div class="info-item">
                <label>地址：</label>
                <span>{{ farm.address }}</span>
              </div>
              <div class="info-item">
                <label>联系人：</label>
                <span>{{ farm.contact_person }}</span>
              </div>
              <div class="info-item">
                <label>联系电话：</label>
                <span>{{ farm.contact_phone }}</span>
              </div>
              <div class="info-item">
                <label>创建时间：</label>
                <span>{{ formatDate(farm.created_at) }}</span>
              </div>
            </div>
          </el-card>

          <el-card title="栏位信息" style="margin-top: 20px;">
            <el-table :data="pens" style="width: 100%">
              <el-table-column prop="pen_number" label="栏位编号" width="120" />
              <el-table-column prop="capacity" label="容量" width="100" />
              <el-table-column prop="current_count" label="当前数量" width="100" />
              <el-table-column label="使用率" width="100">
                <template #default="scope">
                  {{ Math.round((scope.row.current_count / scope.row.capacity) * 100) }}%
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="创建时间">
                <template #default="scope">
                  {{ formatDate(scope.row.created_at) }}
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <el-card title="摄像头信息" style="margin-top: 20px;">
            <el-table :data="cameras" style="width: 100%">
              <el-table-column prop="name" label="摄像头名称" />
              <el-table-column prop="location" label="位置" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="创建时间">
                <template #default="scope">
                  {{ formatDate(scope.row.created_at) }}
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card title="统计信息">
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">{{ farm.statistics?.pens_count || 0 }}</div>
                <div class="stat-label">栏位数量</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ farm.statistics?.cattle_count || 0 }}</div>
                <div class="stat-label">牛只数量</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ farm.statistics?.cameras_count || 0 }}</div>
                <div class="stat-label">摄像头数量</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ farm.statistics?.active_cameras || 0 }}</div>
                <div class="stat-label">在线摄像头</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getFarm } from '@/api/farms'
import { getFarmCameras } from '@/api/cameras'
import dayjs from 'dayjs'

const route = useRoute()
const farm = ref({})
const pens = ref([])
const cameras = ref([])
const loading = ref(false)

const fetchFarmDetail = async () => {
  try {
    loading.value = true
    const farmId = route.params.id
    const response = await getFarm(farmId)
    farm.value = response.data
    pens.value = response.data.pens || []
  } catch (error) {
    console.error('获取养牛厂详情失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchCameras = async () => {
  try {
    const farmId = route.params.id
    const response = await getCamerasByFarm(farmId)
    cameras.value = response.data.cameras || []
  } catch (error) {
    console.error('获取摄像头列表失败:', error)
  }
}

const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

const getStatusType = (status) => {
  const statusMap = {
    'active': 'success',
    'inactive': 'danger',
    'maintenance': 'warning'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status) => {
  const statusMap = {
    'active': '在线',
    'inactive': '离线',
    'maintenance': '维护中'
  }
  return statusMap[status] || '未知'
}

onMounted(() => {
  fetchFarmDetail()
  fetchCameras()
})
</script>

<style scoped>
.farm-detail {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 10px 0;
  color: #303133;
}

.farm-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item label {
  font-weight: 500;
  color: #606266;
  margin-right: 8px;
  min-width: 80px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

@media (max-width: 768px) {
  .farm-info {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>