<template>
  <div class="estrus-page">
    <!-- 筛选区域 -->
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
            <el-option v-for="farm in farms" :key="farm.id" :label="farm.name" :value="farm.id" />
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
            <el-option v-for="pen in pens" :key="pen.id" :label="pen.pen_number" :value="pen.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="日期">
          <el-date-picker
            v-model="targetDate"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="fetchData">
            <el-icon><Search /></el-icon>查询
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon>重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 概览卡片 -->
    <el-row :gutter="16" class="mb-4">
      <el-col :xs="12" :sm="6">
        <div class="stat-card" style="background: linear-gradient(135deg,#ff6b9d,#ff9a9e)">
          <el-icon class="stat-icon"><DataAnalysis /></el-icon>
          <div class="stat-value">{{ summary.count }}</div>
          <div class="stat-label">发情头数（{{ targetDate }}）</div>
          <div class="stat-unit">头</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card" style="background: linear-gradient(135deg,#f77062,#fe5196)">
          <el-icon class="stat-icon"><DataAnalysis /></el-icon>
          <div class="stat-value">{{ summary.ratio }}</div>
          <div class="stat-label">当日发情率</div>
          <div class="stat-unit">%</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card" style="background: linear-gradient(135deg,#56ab2f,#a8e063)">
          <el-icon class="stat-icon"><CircleCheck /></el-icon>
          <div class="stat-value">{{ overview.status.pregnant }}</div>
          <div class="stat-label">已确认怀孕</div>
          <div class="stat-unit">头</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card" style="background: linear-gradient(135deg,#4776e6,#8e54e9)">
          <el-icon class="stat-icon"><Timer /></el-icon>
          <div class="stat-value">{{ overview.pregnancy_rate }}</div>
          <div class="stat-label">妊娠率</div>
          <div class="stat-unit">%</div>
        </div>
      </el-col>
    </el-row>

    <!-- 繁殖档案概览 -->
    <el-row :gutter="16" class="mb-4">
      <!-- 妊娠状态分布 -->
      <el-col :xs="24" :md="12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><el-icon><PieChart /></el-icon> 繁殖状态分布（{{ targetDate }}）</h3>
          </div>
          <div class="card-body">
            <div class="status-grid">
              <div class="status-item open">
                <div class="s-val">{{ overview.status.open }}</div>
                <div class="s-lab">未孕/待配</div>
                <div class="s-pct">{{ openPct }}%</div>
              </div>
              <div class="status-item bred">
                <div class="s-val">{{ overview.status.bred }}</div>
                <div class="s-lab">已配种待确认</div>
                <div class="s-pct">{{ bredPct }}%</div>
              </div>
              <div class="status-item pregnant">
                <div class="s-val">{{ overview.status.pregnant }}</div>
                <div class="s-lab">已怀孕</div>
                <div class="s-pct">{{ pregnantPct }}%</div>
              </div>
              <div class="status-item calving">
                <div class="s-val">{{ overview.status.calving }}</div>
                <div class="s-lab">临产</div>
                <div class="s-pct">{{ calvingPct }}%</div>
              </div>
            </div>
            <div class="total-bar">
              <div class="bar-seg open"   :style="{ width: openPct     + '%' }" :title="'未配: ' + overview.status.open + '头'"></div>
              <div class="bar-seg bred"   :style="{ width: bredPct     + '%' }" :title="'待确认: ' + overview.status.bred + '头'"></div>
              <div class="bar-seg pregnant" :style="{ width: pregnantPct + '%' }" :title="'怀孕: ' + overview.status.pregnant + '头'"></div>
            </div>
            <div class="bar-legend">
              <span class="leg-item"><span class="dot open"></span>未配</span>
              <span class="leg-item"><span class="dot bred"></span>待确认</span>
              <span class="leg-item"><span class="dot pregnant"></span>怀孕</span>
            </div>
          </div>
        </div>
      </el-col>

      <!-- 近7天发情趋势 -->
      <el-col :xs="24" :md="12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><el-icon><TrendCharts /></el-icon> 近7天发情趋势</h3>
          </div>
          <div class="card-body">
            <div class="trend-chart">
              <div
                v-for="d in overview.estrus_trend"
                :key="d.date"
                class="trend-bar-wrap"
              >
                <div class="trend-bar-bg">
                  <div
                    class="trend-bar-fill"
                    :style="{ height: (d.count / maxTrendCount * 100) + '%' }"
                    :title="d.count + '头'"
                  ></div>
                </div>
                <div class="trend-val">{{ d.count }}</div>
                <div class="trend-date">{{ formatShortDate(d.date) }}</div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 发情牛只详情列表 -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <el-icon><Grid /></el-icon>
          发情牛只详情（{{ targetDate }}）— 共 {{ summary.count }} 头
        </h3>
        <el-button size="small" @click="fetchData">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
      </div>
      <div class="card-body">
        <el-table :data="estrusList" v-loading="loading.table" style="width:100%" stripe>
          <el-table-column prop="cattle_ear_tag" label="耳标号" width="100" />
          <el-table-column prop="pen_number"     label="栏位"   width="90" />
          <el-table-column prop="breed"          label="品种"   width="120" />
          <el-table-column label="发情强度" width="120" align="center">
            <template #default="{ row }">
              <el-progress
                :percentage="Math.round((row.estrus_intensity || 0) * 100)"
                :color="row.estrus_intensity >= 0.85 ? '#f56c6c' : row.estrus_intensity >= 0.7 ? '#e6a23c' : '#67c23a'"
                :stroke-width="8"
              />
            </template>
          </el-table-column>
          <el-table-column label="妊娠状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="pregnancyTagType(row.pregnancy_status)" size="small">
                {{ pregnancyLabel(row.pregnancy_status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="上次配种" width="110" align="center">
            <template #default="{ row }">
              {{ row.last_breeding_date ? formatDate(row.last_breeding_date) : '—' }}
            </template>
          </el-table-column>
          <el-table-column label="进食(分钟)" prop="eating_time"   width="100" align="center">
            <template #default="{ row }">
              <span class="low-val">{{ Math.round(row.eating_time) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="站立(分钟)" prop="standing_time" width="100" align="center">
            <template #default="{ row }">{{ Math.round(row.standing_time) }}</template>
          </el-table-column>
          <el-table-column label="行走(分钟)" prop="walking_time"  width="100" align="center">
            <template #default="{ row }">
              <span class="high-val">{{ Math.round(row.walking_time) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="卧躺(分钟)" prop="lying_time"   width="100" align="center">
            <template #default="{ row }">
              <span class="low-val">{{ Math.round(row.lying_time) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="饮水(分钟)" prop="drinking_time" width="100" align="center">
            <template #default="{ row }">{{ Math.round(row.drinking_time) }}</template>
          </el-table-column>
        </el-table>
        <div v-if="estrusList.length === 0 && !loading.table" class="empty-hint">
          当日无发情记录（仅母牛群监测数据）
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search, Refresh, Grid, DataAnalysis,
  CircleCheck, Timer, PieChart, TrendCharts
} from '@element-plus/icons-vue'
import api from '@/api/index'
import { getFarms, getFarmPens } from '@/api/farms'
import dayjs from 'dayjs'

defineOptions({ name: 'EstrusStatistics' })

const searchForm = reactive({ farm_id: null, pen_id: null })
const targetDate  = ref('2023-10-07')
const farms       = ref([])
const pens        = ref([])
const estrusList  = ref([])
const summary     = reactive({ count: 0, ratio: 0 })
const overview    = reactive({
  total_female:    0,
  pregnancy_rate:  0,
  breeding_rate:   0,
  open_rate:       0,
  status: { pregnant: 0, bred: 0, open: 0, calving: 0 },
  estrus_trend:    [],
})
const loading = reactive({ table: false })

// ── computed ────────────────────────────────
const totalFemale = computed(() => overview.total_female || 104)
const openPct     = computed(() => Math.round((overview.status.open     / totalFemale.value) * 100))
const bredPct     = computed(() => Math.round((overview.status.bred     / totalFemale.value) * 100))
const pregnantPct = computed(() => Math.round((overview.status.pregnant / totalFemale.value) * 100))
const calvingPct  = computed(() => Math.round((overview.status.calving  / totalFemale.value) * 100))
const maxTrendCount = computed(() => {
  const vals = (overview.estrus_trend || []).map(d => d.count || 0)
  return Math.max(1, ...vals)
})

// ── data loading ────────────────────────────
const fetchFarms = async () => {
  try {
    const res = await getFarms({ per_page: 100 })
    farms.value = res.farms || []
    if (farms.value.length && !searchForm.farm_id) {
      searchForm.farm_id = farms.value[0].id
      await fetchPens(searchForm.farm_id)
    }
  } catch { /* ignore */ }
}

const fetchPens = async (farmId) => {
  if (!farmId) { pens.value = []; return }
  try {
    const res = await getFarmPens(farmId)
    pens.value = res.pens || []
  } catch { pens.value = [] }
}

const handleFarmChange = (farmId) => {
  searchForm.pen_id = null
  pens.value = []
  fetchPens(farmId)
}

const fetchEstrus = async () => {
  loading.table = true
  try {
    const params = { date: targetDate.value }
    if (searchForm.farm_id) params.farmId = searchForm.farm_id
    if (searchForm.pen_id)  params.penId  = searchForm.pen_id
    const res = await api.get('/statistics/estrus', { params })
    estrusList.value  = res.items || []
    summary.count     = res.count  || 0
    summary.ratio     = res.ratio  || 0
  } catch (e) {
    ElMessage.error('获取发情列表失败')
    estrusList.value = []
  } finally {
    loading.table = false
  }
}

const fetchOverview = async () => {
  try {
    const res = await api.get('/statistics/breeding-overview', { params: { date: targetDate.value } })
    Object.assign(overview, res)
  } catch { /* ignore */ }
}

const fetchData = async () => {
  await Promise.allSettled([fetchEstrus(), fetchOverview()])
}

const resetSearch = async () => {
  searchForm.farm_id = null
  searchForm.pen_id  = null
  pens.value = []
  targetDate.value = '2023-10-07'
  await fetchData()
}

// ── helpers ─────────────────────────────────
const formatDate      = (d) => d ? dayjs(d).format('YYYY-MM-DD') : '—'
const formatShortDate = (d) => d ? dayjs(d).format('MM/DD') : ''

const pregnancyLabel = (s) => ({ open:'待配', bred:'已配种', pregnant:'怀孕', calving:'临产' })[s] || '未知'
const pregnancyTagType = (s) => ({ open:'info', bred:'warning', pregnant:'success', calving:'danger' })[s] || ''

onMounted(async () => {
  await fetchFarms()
  await fetchData()
})
</script>

<style scoped>
.estrus-page { padding: 0; }
.farm-select { width: 20em; min-width: 200px; }
.pen-select  { width: 10em; min-width: 120px; }
.mb-4 { margin-bottom: 16px; }

/* 统计卡片 */
.stat-card {
  color: #fff; border-radius: 12px; padding: 16px;
  display: flex; flex-direction: column; align-items: flex-start;
  min-height: 100px;
}
.stat-icon  { color: rgba(255,255,255,0.9); margin-bottom: 8px; font-size: 24px; }
.stat-value { font-size: 28px; font-weight: 700; }
.stat-label { font-size: 13px; opacity: 0.9; margin-top: 2px; }
.stat-unit  { font-size: 12px; opacity: 0.8; }

/* 卡片通用 */
.card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 0; }
.card-header { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; }
.card-title  { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 15px; }
.card-body   { padding: 16px; }

/* 繁殖状态网格 */
.status-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 12px; }
.status-item { text-align: center; padding: 10px; border-radius: 8px; }
.status-item.open     { background: #f0f9eb; }
.status-item.bred     { background: #fdf6ec; }
.status-item.pregnant { background: #f0f9ff; }
.status-item.calving  { background: #fef0f0; }
.s-val  { font-size: 22px; font-weight: 700; }
.s-lab  { font-size: 12px; color: #666; margin-top: 2px; }
.s-pct  { font-size: 11px; color: #999; }

/* 进度条 */
.total-bar { display: flex; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 8px; }
.bar-seg { height: 100%; transition: width 0.5s; }
.bar-seg.open     { background: #95de64; }
.bar-seg.bred     { background: #ffc069; }
.bar-seg.pregnant { background: #40a9ff; }
.bar-legend { display: flex; gap: 12px; font-size: 12px; }
.leg-item { display: flex; align-items: center; gap: 4px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
.dot.open     { background: #95de64; }
.dot.bred     { background: #ffc069; }
.dot.pregnant { background: #40a9ff; }

/* 趋势图 */
.trend-chart {
  display: flex; align-items: flex-end; justify-content: space-around;
  height: 120px; gap: 4px;
}
.trend-bar-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; }
.trend-bar-bg   { flex: 1; width: 28px; background: #f5f7fa; border-radius: 4px 4px 0 0; position: relative; overflow: hidden; }
.trend-bar-fill { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, #ff6b9d, #ffb3c6); border-radius: 4px 4px 0 0; transition: height 0.5s; }
.trend-val  { font-size: 12px; font-weight: 600; color: #f56c6c; margin-top: 2px; }
.trend-date { font-size: 10px; color: #909399; }

/* 表格特殊样式 */
.high-val { color: #f56c6c; font-weight: 600; }
.low-val  { color: #909399; }
.empty-hint { text-align: center; padding: 30px; color: #c0c4cc; font-size: 14px; }

@media (max-width: 768px) {
  .farm-select, .pen-select { width: 100%; min-width: auto; }
  .status-grid { grid-template-columns: repeat(2,1fr); }
}
</style>
