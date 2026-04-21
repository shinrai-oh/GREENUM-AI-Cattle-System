<template>
  <div class="statistics">
    <!-- 搜索和过滤 -->
    <div class="search-box">
      <el-form :model="searchForm" class="search-form">
        <el-form-item label="养牛厂">
          <el-select 
            v-model="searchForm.farm_id" 
            placeholder="选择养牛厂" 
            clearable
            @change="handleFarmChange"
            class="farm-select"
          >
            <el-option
              v-for="farm in farms"
              :key="farm.id"
              :label="farm.name"
              :value="farm.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="栏位">
          <el-select 
            v-model="searchForm.pen_id" 
            placeholder="选择栏位" 
            clearable
            :disabled="!searchForm.farm_id"
            class="pen-select"
          >
            <el-option
              v-for="pen in pens"
              :key="pen.id"
              :label="pen.pen_number"
              :value="pen.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="fetchData">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-button type="success" @click="exportData">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计概览 -->
    <el-row :gutter="20" class="mb-4">
      <el-col :xs="24" :sm="12" :md="6" v-for="stat in summaryStats" :key="stat.key">
        <div class="stat-card" :style="{ background: stat.gradient }">
          <el-icon class="stat-icon">
            <component :is="stat.icon" />
          </el-icon>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-unit">{{ stat.unit }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="mb-4">
      <!-- 行为趋势图 -->
      <!--
      <el-col :xs="24" :lg="12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><TrendCharts /></el-icon>
              行为趋势分析
            </h3>
            <el-select v-model="trendDays" size="small" @change="fetchTrendData">
              <el-option label="最近7天" :value="7" />
              <el-option label="最近15天" :value="15" />
              <el-option label="最近30天" :value="30" />
            </el-select>
          </div>
          <div class="card-body">
            <div class="chart-container" ref="trendChartRef" v-loading="loading.trend"></div>
          </div>
        </div>
      </el-col>
      -->
      
      <!-- 行为分布图 -->
      <el-col :xs="24" :lg="12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><PieChart /></el-icon>
              行为时间分布
            </h3>
            <el-date-picker
              v-model="distributionDate"
              type="date"
              placeholder="选择日期"
              size="small"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="fetchDistributionData"
            />
          </div>
          <div class="card-body">
            <div class="chart-container" ref="distributionChartRef" v-loading="loading.distribution"></div>
          </div>
        </div>
      </el-col>

      <!-- 栏位行为对比 -->
      <el-col :xs="24" :lg="12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><Histogram /></el-icon>
              栏位行为对比
            </h3>
            <div class="header-actions">
              <el-select 
                v-model="comparisonPens" 
                multiple 
                placeholder="选择要对比的栏位" 
                size="small"
                style="width: 200px;"
                @change="fetchComparisonData"
              >
                <el-option
                  v-for="pen in pens"
                  :key="pen.id"
                  :label="pen.pen_number"
                  :value="pen.id"
                />
              </el-select>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-container" ref="comparisonChartRef" v-loading="loading.comparison"></div>
          </div>
        </div>
      </el-col>
    </el-row>



    <!-- 数据表格 -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <el-icon><Grid /></el-icon>
          统计数据列表
        </h3>
        <div class="header-actions">
          <el-button size="small" @click="fetchStatistics">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
      <div class="card-body">
        <el-table 
          :data="statistics" 
          v-loading="loading.table"
          @row-click="handleRowClick"
          style="cursor: pointer;"
        >
          <el-table-column prop="stat_date" label="日期" width="120" />
          <el-table-column prop="cattle_ear_tag" label="耳标号" width="120" />
          <el-table-column prop="pen_number" label="栏位" width="80" />
          <el-table-column prop="is_estrus" label="是否发情" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.is_estrus ? 'danger' : 'info'" size="small">
                {{ row.is_estrus ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="eating_time" label="进食时间" width="100" align="center">
            <template #default="{ row }">
              {{ row.eating_time }}分钟
            </template>
          </el-table-column>
          <el-table-column prop="standing_time" label="站立时间" width="100" align="center">
            <template #default="{ row }">
              {{ row.standing_time }}分钟
            </template>
          </el-table-column>
          <el-table-column prop="lying_time" label="卧躺时间" width="100" align="center">
            <template #default="{ row }">
              {{ row.lying_time }}分钟
            </template>
          </el-table-column>
          <el-table-column prop="walking_time" label="行走时间" width="100" align="center">
            <template #default="{ row }">
              {{ row.walking_time }}分钟
            </template>
          </el-table-column>
          <el-table-column prop="drinking_time" label="饮水时间" width="100" align="center">
            <template #default="{ row }">
              {{ row.drinking_time }}分钟
            </template>
          </el-table-column>
          <el-table-column prop="total_active_time" label="总活动时间" width="120" align="center">
            <template #default="{ row }">
              {{ row.total_active_time }}分钟
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button 
                type="text" 
                size="small" 
                @click.stop="viewCattleDetail(row)"
              >
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.per_page"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onActivated, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search,
  Refresh,
  Download,
  TrendCharts,
  PieChart,
  Histogram,
  DataAnalysis,
  Grid,
  Timer,
  Food,
  Position,
  Location
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getDailyStatistics, getStatisticsSummary, getBehaviorTrends, getBehaviorComparison, exportStatistics } from '@/api/statistics'
import { getFarms, getFarmPens } from '@/api/farms'
import { clearCache } from '@/api/index'
import { 
  getDailyStatisticsMock, 
  getStatisticsSummaryMock, 
  getBehaviorTrendsMock, 
  getBehaviorComparisonMock 
} from '@/api/mock/statistics'
import { getFarmsMock, getFarmPensMock } from '@/api/mock/farms'

const router = useRouter()

// 响应式数据
const searchForm = reactive({
  farm_id: null,
  pen_id: null
})

const dateRange = ref([])
const trendDays = ref(7)
// 默认显示最近有数据的日期（2023-10-07）
const distributionDate = ref('2023-10-07')
const comparisonPens = ref([])

const farms = ref([])
const pens = ref([])
const statistics = ref([])
const summaryStats = ref([
  {
    key: 'avg_eating',
    label: '平均进食时间',
    value: 0,
    unit: '分钟/天',
    icon: 'Food',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    key: 'avg_standing',
    label: '平均站立时间',
    value: 0,
    unit: '分钟/天',
    icon: 'Location',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  {
    key: 'avg_lying',
    label: '平均卧躺时间',
    value: 0,
    unit: '分钟/天',
    icon: 'Timer',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  },
  {
    key: 'avg_walking',
    label: '平均行走时间',
    value: 0,
    unit: '分钟/天',
    icon: 'Position',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
  },
  {
    key: 'estrus_ratio',
    label: '发情牛只占比',
    value: 0,
    unit: '%',
    icon: 'DataAnalysis',
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
  }
])



const loading = reactive({
  table: false,
  trend: false,
  distribution: false,
  comparison: false
})

const pagination = reactive({
  page: 1,
  per_page: 20,
  total: 0
})

// 图表引用
const trendChartRef = ref(null)
const distributionChartRef = ref(null)
const comparisonChartRef = ref(null)

let trendChart = null
let distributionChart = null
let comparisonChart = null

// 获取养牛厂列表
const fetchFarms = async () => {
  try {
    const response = await getFarms({ per_page: 100 })
    // API拦截器已经返回了data部分
    farms.value = response.farms
    
    // 自动选择第一个农场作为默认选项
    if (farms.value.length > 0 && !searchForm.farm_id) {
      searchForm.farm_id = farms.value[0].id
      await fetchPens(searchForm.farm_id)
      
      // 自动选择前两个栏位进行对比
        if (pens.value.length > 0) {
          comparisonPens.value = pens.value.slice(0, Math.min(2, pens.value.length)).map(pen => pen.id)

          // 默认日期范围：2023-10-01 ~ 2023-10-07
          distributionDate.value = '2023-10-07'
          dateRange.value = ['2023-10-01', '2023-10-07']

          // 获取对比数据
          await fetchComparisonData()
        }
    }
  } catch (error) {
    console.error('获取养牛厂列表失败:', error)
    // 使用模拟数据兜底
    const mock = getFarmsMock()
    farms.value = mock.farms
    if (farms.value.length > 0 && !searchForm.farm_id) {
      searchForm.farm_id = farms.value[0].id
      await fetchPens(searchForm.farm_id)
      if (pens.value.length > 0) {
        comparisonPens.value = pens.value.slice(0, Math.min(2, pens.value.length)).map(pen => pen.id)
        distributionDate.value = '2023-10-07'
        dateRange.value = ['2023-10-01', '2023-10-07']
        await fetchComparisonData()
      }
    }
  }
}

// 获取栏位列表
const fetchPens = async (farmId) => {
  if (!farmId) {
    pens.value = []
    return
  }
  
  try {
    const response = await getFarmPens(farmId)
    // API拦截器已经返回了data部分
    pens.value = response.pens
  } catch (error) {
    console.error('获取栏位列表失败:', error)
    // 使用模拟数据兜底
    const mock = getFarmPensMock(farmId)
    pens.value = mock.pens
  }
}

// 养牛厂变化处理
const handleFarmChange = (farmId) => {
  searchForm.pen_id = null
  comparisonPens.value = []
  fetchPens(farmId)
}

// 获取统计数据
const fetchStatistics = async () => {
  try {
    loading.table = true
    
    const params = {
      ...searchForm,
      page: pagination.page,
      per_page: pagination.per_page
    }
    
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    
    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === null || params[key] === '') {
        delete params[key]
      }
    })
    
    const response = await getDailyStatistics(params)
    
    // API拦截器已经返回了data部分
    statistics.value = response.statistics
    pagination.total = response.pagination.total
  } catch (error) {
    console.error('获取统计数据失败:', error)
    // 模拟数据兜底
    const mock = getDailyStatisticsMock({})
    statistics.value = mock.statistics
    pagination.total = mock.pagination.total
    ElMessage.warning('获取统计数据失败，已加载模拟数据')
  } finally {
    loading.table = false
  }
}

// 获取统计摘要
const fetchSummary = async () => {
  try {
    const params = {
      ...searchForm,
      date: distributionDate.value
    }
    
    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === null || params[key] === '') {
        delete params[key]
      }
    })
    
    const response = await getStatisticsSummary(params)
    
    // API拦截器已经返回了data部分
    const { averages, estrus } = response
    
    // 更新统计卡片
    summaryStats.value[0].value = averages.eating_time
    summaryStats.value[1].value = averages.standing_time
    summaryStats.value[2].value = averages.lying_time
    summaryStats.value[3].value = averages.walking_time
    summaryStats.value[4].value = Number(estrus?.ratio || 0)
  } catch (error) {
    console.error('获取统计摘要失败:', error)
    // 使用模拟数据更新概览卡片
    const mock = getStatisticsSummaryMock({ date: distributionDate.value })
    const { averages, estrus } = mock
    summaryStats.value[0].value = averages.eating_time
    summaryStats.value[1].value = averages.standing_time
    summaryStats.value[2].value = averages.lying_time
    summaryStats.value[3].value = averages.walking_time
    summaryStats.value[4].value = Number(estrus?.ratio || 0)
    ElMessage.warning('获取统计摘要失败，已加载模拟数据')
  }
}

// 获取趋势数据
const fetchTrendData = async () => {
  try {
    loading.trend = true
    
    const params = {
      ...searchForm,
      days: trendDays.value
    }
    
    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === null || params[key] === '') {
        delete params[key]
      }
    })
    
    const response = await getBehaviorTrends(params)
    
    // API拦截器已经返回了data部分
    await nextTick()
    updateTrendChart(response.trends)
  } catch (error) {
    console.error('获取趋势数据失败:', error)
    const mock = getBehaviorTrendsMock({ days: trendDays.value })
    await nextTick()
    updateTrendChart(mock.trends)
    ElMessage.warning('获取趋势数据失败，已加载模拟数据')
  } finally {
    loading.trend = false
  }
}

// 获取分布数据
const fetchDistributionData = async () => {
  try {
    loading.distribution = true
    
    const params = {
      ...searchForm,
      date: distributionDate.value
    }
    
    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === null || params[key] === '') {
        delete params[key]
      }
    })
    
    const response = await getStatisticsSummary(params)
    
    // API拦截器已经返回了data部分
    await nextTick()
    updateDistributionChart(response.averages)
  } catch (error) {
    console.error('获取分布数据失败:', error)
    const mock = getStatisticsSummaryMock({ date: distributionDate.value })
    await nextTick()
    updateDistributionChart(mock.averages)
    ElMessage.warning('获取分布数据失败，已加载模拟数据')
  } finally {
    loading.distribution = false
  }
}

// 获取对比数据
const fetchComparisonData = async () => {
  if (comparisonPens.value.length === 0) {
    if (comparisonChart) {
      comparisonChart.clear()
    }
    return
  }
  
  try {
    loading.comparison = true
    
    const params = {
      pen_ids: comparisonPens.value,
      date: distributionDate.value
    }
    
    const response = await getBehaviorComparison(params)
    
    // API拦截器已经返回了data部分
    await nextTick()
    updateComparisonChart(response.comparison)
  } catch (error) {
    console.error('获取对比数据失败:', error)
    const mock = getBehaviorComparisonMock({ pen_ids: comparisonPens.value, date: distributionDate.value })
    await nextTick()
    updateComparisonChart(mock.comparison)
    ElMessage.warning('获取对比数据失败，已加载模拟数据')
  } finally {
    loading.comparison = false
  }
}

// 更新趋势图表
const updateTrendChart = (data) => {
  if (!trendChartRef.value) return
  
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }
  
  const dates = data.map(item => item.date)
  const eatingData = data.map(item => item.avg_eating_time)
  const standingData = data.map(item => item.avg_standing_time)
  const lyingData = data.map(item => item.avg_lying_time)
  const walkingData = data.map(item => item.avg_walking_time)
  
  const option = {
    title: {
      text: '行为趋势分析',
      left: 'center',
      textStyle: { fontSize: 14, color: '#606266' }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      bottom: 0,
      data: ['进食', '站立', '卧躺', '行走']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { rotate: 45 }
    },
    yAxis: {
      type: 'value',
      name: '时间(分钟)'
    },
    series: [
      {
        name: '进食',
        type: 'line',
        data: eatingData,
        smooth: true,
        itemStyle: { color: '#5470c6' }
      },
      {
        name: '站立',
        type: 'line',
        data: standingData,
        smooth: true,
        itemStyle: { color: '#91cc75' }
      },
      {
        name: '卧躺',
        type: 'line',
        data: lyingData,
        smooth: true,
        itemStyle: { color: '#fac858' }
      },
      {
        name: '行走',
        type: 'line',
        data: walkingData,
        smooth: true,
        itemStyle: { color: '#ee6666' }
      }
    ]
  }
  
  trendChart.setOption(option)
}

// 更新分布图表
const updateDistributionChart = (data) => {
  if (!distributionChartRef.value) return
  
  if (!distributionChart) {
    distributionChart = echarts.init(distributionChartRef.value)
  }
  
  const totalValue =
    (Number(data.eating_time) || 0) +
    (Number(data.standing_time) || 0) +
    (Number(data.lying_time) || 0) +
    (Number(data.walking_time) || 0) +
    (Number(data.drinking_time) || 0)
  const hasData = totalValue > 0

  const option = {
    title: {
      text: '行为时间分布',
      left: 'center',
      textStyle: { fontSize: 14, color: '#606266' }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c}分钟 ({d}%)'
    },
    legend: {
      bottom: 0,
      left: 'center'
    },
    graphic: !hasData
      ? [
          {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: '暂无数据，换个日期试试',
              fill: '#909399',
              fontSize: 14
            }
          }
        ]
      : [],
    series: [
      {
        name: '行为时间',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        data: hasData
          ? [
              { value: data.eating_time, name: '进食', itemStyle: { color: '#5470c6' } },
              { value: data.standing_time, name: '站立', itemStyle: { color: '#91cc75' } },
              { value: data.lying_time, name: '卧躺', itemStyle: { color: '#fac858' } },
              { value: data.walking_time, name: '行走', itemStyle: { color: '#ee6666' } },
              { value: data.drinking_time, name: '饮水', itemStyle: { color: '#73c0de' } }
            ]
          : [],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  distributionChart.setOption(option)
}

// 更新对比图表
const updateComparisonChart = (data) => {
  if (!comparisonChartRef.value) return
  
  if (!comparisonChart) {
    comparisonChart = echarts.init(comparisonChartRef.value)
  }
  
  const penNumbers = data.map(item => item.pen_number)
  const eatingData = data.map(item => item.avg_eating_time)
  const standingData = data.map(item => item.avg_standing_time)
  const lyingData = data.map(item => item.avg_lying_time)
  const walkingData = data.map(item => item.avg_walking_time)
  const estrusData = data.map(item => (item.estrus_count ?? 0))
  const totalSum = [eatingData, standingData, lyingData, walkingData]
    .flat()
    .reduce((sum, v) => sum + (Number(v) || 0), 0)
  const countsSum = estrusData.reduce((sum, v) => sum + (Number(v) || 0), 0)
  const hasData = totalSum > 0 || countsSum > 0
  
  const option = {
    title: {
      text: '栏位行为对比',
      left: 'center',
      textStyle: { fontSize: 14, color: '#606266' }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      bottom: 0,
      data: ['进食', '站立', '卧躺', '行走', '发情牛只']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: penNumbers
    },
    yAxis: [
      {
        type: 'value',
        name: '时间(分钟)'
      },
      {
        type: 'value',
        name: '牛只(头)',
        position: 'right',
        min: 0
      }
    ],
    graphic: !hasData
      ? [
          {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: '暂无数据，换个日期或栏位试试',
              fill: '#909399',
              fontSize: 14
            }
          }
        ]
      : [],
    series: [
      {
        name: '进食',
        type: 'bar',
        data: hasData ? eatingData : [],
        itemStyle: { color: '#5470c6' }
      },
      {
        name: '站立',
        type: 'bar',
        data: hasData ? standingData : [],
        itemStyle: { color: '#91cc75' }
      },
      {
        name: '卧躺',
        type: 'bar',
        data: hasData ? lyingData : [],
        itemStyle: { color: '#fac858' }
      },
      {
        name: '行走',
        type: 'bar',
        data: hasData ? walkingData : [],
        itemStyle: { color: '#ee6666' }
      },
      {
        name: '发情牛只',
        type: 'bar',
        data: hasData ? estrusData : [],
        yAxisIndex: 1,
        itemStyle: { color: '#ff9a9e' }
      }
    ]
  }
  
  comparisonChart.setOption(option)
}

// 请求取消控制器
let abortController = null

// 取消所有进行中的请求
const cancelPendingRequests = () => {
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()
}

// 获取所有数据
const fetchData = async () => {
  try {
    // 取消之前的请求
    cancelPendingRequests()
    
    // 并行执行所有数据获取，但等待它们完成
    await Promise.allSettled([
      fetchStatistics(),
      fetchSummary(),
      fetchTrendData(),
      fetchDistributionData(),
      fetchComparisonData()
    ])
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('获取数据失败:', error)
    }
  }
}

// 重置搜索
const resetSearch = async () => {
  // 取消进行中的请求
  cancelPendingRequests()
  
  searchForm.farm_id = null
  searchForm.pen_id = null
  dateRange.value = []
  comparisonPens.value = []
  pens.value = []
  pagination.page = 1
  
  await fetchData()
}

// 导出数据
const exportData = async () => {
  try {
    const params = {
      ...searchForm,
      format: 'json'
    }
    
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    
    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === null || params[key] === '') {
        delete params[key]
      }
    })
    
    const response = await exportStatistics(params)
    
    // API拦截器已经返回了data部分
    // 创建下载链接
    const blob = new Blob([JSON.stringify(response, null, 2)], {
      type: 'application/json'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cattle_statistics_${Date.now()}.json`
    link.click()
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('数据导出成功')
  } catch (error) {
    console.error('导出数据失败:', error)
    ElMessage.error('导出数据失败')
  }
}

// 表格行点击
const handleRowClick = (row) => {
  // 可以添加行点击处理逻辑
}

// 查看牛只详情
const viewCattleDetail = (row) => {
  // 携带所选日期进入详情页，便于按该日期显示统计
  router.push({
    path: `/statistics/cattle/${row.cattle_id}`,
    query: { date: row.stat_date }
  })
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.per_page = size
  pagination.page = 1
  fetchStatistics()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  fetchStatistics()
}

// 初始化数据函数
const initializeData = async () => {
  try {
    // 取消之前的请求
    cancelPendingRequests()
    
    // 先获取农场数据，再获取其他数据
    await fetchFarms()
    await fetchData()
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('初始化数据失败:', error)
    }
  }
}

// 组件挂载
onMounted(() => {
  initializeData()
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    if (trendChart) trendChart.resize()
    if (distributionChart) distributionChart.resize()
    if (comparisonChart) comparisonChart.resize()
  })
})

// 组件激活（用于处理 keep-alive 缓存的组件）
onActivated(() => {
  // 清除API缓存，确保获取最新数据
  clearCache()
  // 当组件被激活时，重新初始化数据
  initializeData()
})

// 组件卸载时取消请求
onBeforeUnmount(() => {
  cancelPendingRequests()
})
</script>

<style scoped>
.statistics {
  padding: 0;
}

/* 养牛厂选择框 - 20个字符宽度 */
.farm-select {
  width: 20em;
  min-width: 200px;
}

/* 栏位选择框 - 10个字符宽度 */
.pen-select {
  width: 10em;
  min-width: 120px;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .search-form {
    flex-direction: column;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .chart-container {
    height: 300px;
  }
  
  /* 移动端适配 */
  .farm-select,
  .pen-select {
    width: 100%;
    min-width: auto;
  }
}
</style>
