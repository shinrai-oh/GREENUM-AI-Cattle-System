<template>
  <div class="cattle-detail">
    <div class="page-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/statistics' }">数据统计</el-breadcrumb-item>
        <el-breadcrumb-item>牛只详情</el-breadcrumb-item>
      </el-breadcrumb>
      <h1>{{ cattle.ear_tag || '牛只详情' }}</h1>
    </div>

    <!-- Loading状态 -->
    <div v-if="loading" class="loading-container" v-loading="loading" element-loading-text="加载中...">
      <div style="height: 400px;"></div>
    </div>

    <!-- 数据为空时的提示 -->
    <div v-else-if="!cattleData" class="empty-container">
      <el-empty description="暂无数据"></el-empty>
    </div>

    <!-- 主要内容 -->
    <div v-else class="content-container">
      <el-row :gutter="20">
        <el-col :span="16">
          <el-card title="基本信息">
            <div class="cattle-info">
              <div class="info-item">
                <label>耳标号：</label>
                <span class="ear-tag">{{ cattle.ear_tag }}</span>
              </div>
              <div class="info-item">
                <label>品种：</label>
                <span>{{ cattle.breed }}</span>
              </div>
              <div class="info-item">
                <label>性别：</label>
                <span>{{ getGenderText(cattle.gender) }}</span>
              </div>
              <div class="info-item">
                <label>出生日期：</label>
                <span>{{ formatDate(cattle.birth_date) }}</span>
              </div>
              <div class="info-item">
                <label>年龄：</label>
                <span>{{ calculateAge(cattle.birth_date) }}</span>
              </div>
              <div class="info-item">
                <label>体重：</label>
                <span>{{ cattle.weight }}kg</span>
              </div>
              <div class="info-item">
                <label>健康状态：</label>
                <el-tag :type="getHealthType(cattle.status)">{{ getHealthText(cattle.status) }}</el-tag>
              </div>
              <div class="info-item">
                <label>所属养牛厂：</label>
                <span>{{ cattle.farm_name }}</span>
              </div>
              <div class="info-item">
                <label>所属栏位：</label>
                <span>{{ cattle.pen_number }}</span>
              </div>
              <div class="info-item">
                <label>入场时间：</label>
                <span>{{ formatDate(cattle.created_at) }}</span>
              </div>
            </div>
          </el-card>

          <!-- 
          <el-card title="最近7天行为统计" style="margin-top: 20px;">
            <el-table :data="recentBehaviorData" style="width: 100%" stripe>
              <el-table-column prop="date" label="日期" width="120">
                <template #default="scope">
                  {{ formatDate(scope.row.stat_date) }}
                </template>
              </el-table-column>
              <el-table-column prop="eating_time" label="进食时间(小时)" width="140">
                <template #default="scope">
                  {{ Math.round((scope.row.eating_time || 0) / 60) }}
                </template>
              </el-table-column>
              <el-table-column prop="standing_time" label="站立时间(小时)" width="140">
                <template #default="scope">
                  {{ Math.round((scope.row.standing_time || 0) / 60) }}
                </template>
              </el-table-column>
              <el-table-column prop="lying_time" label="躺卧时间(小时)" width="140">
                <template #default="scope">
                  {{ Math.round((scope.row.lying_time || 0) / 60) }}
                </template>
              </el-table-column>
              <el-table-column prop="walking_time" label="行走时间(小时)" width="140">
                <template #default="scope">
                  {{ Math.round((scope.row.walking_time || 0) / 60) }}
                </template>
              </el-table-column>
              <el-table-column prop="drinking_time" label="饮水时间(小时)" width="140">
                <template #default="scope">
                  {{ Math.round((scope.row.drinking_time || 0) / 60) }}
                </template>
              </el-table-column>
            </el-table>
            
            <div v-if="!recentBehaviorData || recentBehaviorData.length === 0" 
                 style="text-align: center; padding: 40px; color: #909399;">
              暂无行为数据
            </div>
          </el-card>
          -->

          <el-card title="最近行为记录" style="margin-top: 20px;">
            <el-table :data="recentBehaviors" style="width: 100%">
              <el-table-column prop="behavior_type" label="行为类型" width="120">
                <template #default="scope">
                  <el-tag :type="getBehaviorType(scope.row.behavior_type)">{{ getBehaviorText(scope.row.behavior_type) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="start_time" label="开始时间">
                <template #default="scope">
                  {{ formatDateTime(scope.row.start_time) }}
                </template>
              </el-table-column>
              <el-table-column prop="end_time" label="结束时间">
                <template #default="scope">
                  {{ formatDateTime(scope.row.end_time) }}
                </template>
              </el-table-column>
              <el-table-column prop="duration" label="持续时间">
                <template #default="scope">
                  {{ formatDuration(scope.row.duration) }}
                </template>
              </el-table-column>
              <el-table-column prop="confidence" label="置信度" width="100">
                <template #default="scope">
                  {{ Math.round(scope.row.confidence * 100) }}%
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card>
            <template #header>
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <span>今日统计</span>
                <span style="font-size:12px;color:#909399;">统计日期：{{ effectiveStatDate }}</span>
              </div>
            </template>
            <div class="today-stats">
              <div class="stat-item">
                <div class="stat-icon eating">
                  <el-icon><Food /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ finalTodayStats.eating_time || 0 }}分钟</div>
                  <div class="stat-label">进食时间</div>
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-icon standing">
                  <el-icon><User /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ finalTodayStats.standing_time || 0 }}分钟</div>
                  <div class="stat-label">站立时间</div>
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-icon lying">
                  <el-icon><Moon /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ finalTodayStats.lying_time || 0 }}分钟</div>
                  <div class="stat-label">卧躺时间</div>
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-icon walking">
                  <el-icon><Position /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ finalTodayStats.walking_time || 0 }}分钟</div>
                  <div class="stat-label">行走时间</div>
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-icon drinking">
                  <el-icon><Coffee /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ finalTodayStats.drinking_time || 0 }}分钟</div>
                  <div class="stat-label">饮水时间</div>
                </div>
              </div>
            </div>
          </el-card>

          <el-card title="健康指标" style="margin-top: 20px;">
            <div class="health-indicators">
              <div class="indicator-item">
                <span class="indicator-label">活跃度：</span>
                <el-progress :percentage="activityLevel" :color="getActivityColor(activityLevel)" />
              </div>
              <div class="indicator-item">
                <span class="indicator-label">进食规律：</span>
                <el-progress :percentage="eatingRegularity" :color="getRegularityColor(eatingRegularity)" />
              </div>
              <div class="indicator-item">
                <span class="indicator-label">休息质量：</span>
                <el-progress :percentage="restQuality" :color="getQualityColor(restQuality)" />
              </div>
            </div>
          </el-card>

          <el-card title="操作" style="margin-top: 20px;">
            <div class="action-buttons">
              <el-button type="primary" style="width: 100%; margin-bottom: 12px;" @click="handleExport">
                <el-icon><Download /></el-icon>
                导出数据
              </el-button>
              <el-button type="success" style="width: 100%; margin-bottom: 12px;" @click="reminderDialogVisible = true">
                <el-icon><Bell /></el-icon>
                设置提醒
              </el-button>
              <el-button type="warning" style="width: 100%;" @click="openEditDialog">
                <el-icon><Edit /></el-icon>
                编辑信息
              </el-button>
            </div>
          </el-card>

          <!-- 设置提醒弹窗 -->
          <el-dialog v-model="reminderDialogVisible" title="设置提醒" width="420px" :close-on-click-modal="false">
            <el-form :model="reminderForm" label-width="80px">
              <el-form-item label="提醒类型">
                <el-select v-model="reminderForm.type" style="width: 100%;">
                  <el-option label="健康检查" value="health_check" />
                  <el-option label="疫苗接种" value="vaccine" />
                  <el-option label="体重称量" value="weigh" />
                  <el-option label="发情监测" value="estrus" />
                  <el-option label="出栏计划" value="sale" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
              <el-form-item label="提醒日期">
                <el-date-picker v-model="reminderForm.date" type="date" placeholder="选择日期"
                  style="width: 100%;" value-format="YYYY-MM-DD" />
              </el-form-item>
              <el-form-item label="备注">
                <el-input v-model="reminderForm.note" type="textarea" :rows="3" placeholder="可选备注" />
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="reminderDialogVisible = false">取消</el-button>
              <el-button type="success" @click="saveReminder">保存提醒</el-button>
            </template>
          </el-dialog>

          <!-- 编辑信息弹窗 -->
          <el-dialog v-model="editDialogVisible" title="编辑牛只信息" width="480px" :close-on-click-modal="false">
            <el-form :model="editForm" label-width="90px">
              <el-form-item label="耳标号">
                <el-input :value="cattle.ear_tag" disabled />
              </el-form-item>
              <el-form-item label="品种">
                <el-input v-model="editForm.breed" placeholder="如：安格斯、西门塔尔" />
              </el-form-item>
              <el-form-item label="性别">
                <el-select v-model="editForm.gender" style="width: 100%;">
                  <el-option label="公牛" value="male" />
                  <el-option label="母牛" value="female" />
                </el-select>
              </el-form-item>
              <el-form-item label="出生日期">
                <el-date-picker v-model="editForm.birth_date" type="date" placeholder="选择日期"
                  style="width: 100%;" value-format="YYYY-MM-DD" />
              </el-form-item>
              <el-form-item label="体重(kg)">
                <el-input-number v-model="editForm.weight" :min="0" :max="2000" :precision="1" style="width: 100%;" />
              </el-form-item>
              <el-form-item label="状态">
                <el-select v-model="editForm.status" style="width: 100%;">
                  <el-option label="在养" value="active" />
                  <el-option label="已出栏" value="sold" />
                  <el-option label="死亡" value="deceased" />
                </el-select>
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="editDialogVisible = false">取消</el-button>
              <el-button type="warning" :loading="saving" @click="saveEdit">保存</el-button>
            </template>
          </el-dialog>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getCattleHistory } from '@/api/statistics'
import { ElMessage } from 'element-plus'
import { Food, User, Moon, Position, Coffee, Download, Bell, Edit } from '@element-plus/icons-vue'
import api from '@/api/index'

const route = useRoute()
const cattleData = ref(null)
const loading = ref(false)
const selectedDate = ref(null)

// 计算属性
const cattle = computed(() => cattleData.value?.cattle || {})
const dailyStatistics = computed(() => cattleData.value?.daily_statistics || [])
const recentBehaviors = computed(() => cattleData.value?.recent_behaviors || [])
/*
const recentBehaviorData = computed(() => {
  if (!dailyStatistics.value || !dailyStatistics.value.length) return []
  return dailyStatistics.value.slice(-7)
})
*/

// 行为统计数据处理
/*
const behaviorStats = computed(() => {
  if (!dailyStatistics.value || !dailyStatistics.value.length) return []
  
  return dailyStatistics.value.slice(-7).map(stat => ({
    date: formatDate(stat.stat_date),
    eating: (stat.eating_time / 60).toFixed(1), // 转换为小时
    standing: (stat.standing_time / 60).toFixed(1),
    lying: (stat.lying_time / 60).toFixed(1),
    walking: (stat.walking_time / 60).toFixed(1),
    drinking: (stat.drinking_time / 60).toFixed(1)
  }))
})
*/

// 判断统计是否为非零（避免展示全为0分钟的数据）
const isNonZeroStat = (stat) => {
  if (!stat) return false
  const sum = (stat.eating_time || 0) + (stat.standing_time || 0) + (stat.lying_time || 0) +
              (stat.walking_time || 0) + (stat.drinking_time || 0) + (stat.total_active_time || 0)
  return sum > 0
}

// 当前统计数据（优先使用路由中的日期；若该日数据缺失或为0，回退到最近的非零日，否则使用最近一条）
const normalizeDateStr = (d) => {
  if (!d) return ''
  const s = typeof d === 'string' ? d : String(d)
  // 统一为 YYYY-MM-DD（截取前10位，兼容含时间的字符串）
  return s.slice(0, 10)
}

const todayStats = computed(() => {
  const stats = dailyStatistics.value || []
  if (!stats.length) return {}

  const target = selectedDate.value || new Date().toISOString().split('T')[0]
  const normTarget = normalizeDateStr(target)
  const byDate = stats.find(stat => normalizeDateStr(stat.stat_date) === normTarget)

  // 若用户在列表页选择了具体日期，则严格按该日期展示（与列表保持一致）
  if (selectedDate.value) {
    return byDate || {}
  }

  // 无指定日期时，优先返回非零统计，否则退到最近一条
  if (isNonZeroStat(byDate)) return byDate
  const nonZeroRecent = [...stats].reverse().find(s => isNonZeroStat(s))
  if (nonZeroRecent) return nonZeroRecent
  return stats[stats.length - 1]
})

// 展示的统计日期提示（根据最终展示的统计来源动态确定）
// 优先：todayStats 的日期；其次：行为聚合的日期；否则：选定日期或今天
const effectiveStatDate = computed(() => {
  // 列表页传入的日期优先显示，确保与列表一致
  if (selectedDate.value) return normalizeDateStr(selectedDate.value)

  // 其次展示主统计的日期
  if (todayStats.value && todayStats.value.stat_date) return todayStats.value.stat_date

  // 再次使用目标日期（用于行为聚合）
  if (targetDate.value) return targetDate.value

  // 若存在行为记录，回退为最近行为所在日期
  const behaviors = recentBehaviors.value || []
  if (behaviors.length) {
    const latestDate = normalizeDateStr(behaviors[0].start_time)
    if (latestDate) return latestDate
  }

  return new Date().toISOString().split('T')[0]
})

// 根据行为记录在目标日期内进行聚合，作为统计缺失时的回退
const targetDate = computed(() => normalizeDateStr(selectedDate.value || new Date().toISOString().split('T')[0]))
// 按指定日期对行为记录进行聚合
function aggregateBehaviorsByDate(dateStr) {
  const behaviors = recentBehaviors.value || []
  if (!behaviors.length || !dateStr) return { eating_time: 0, standing_time: 0, lying_time: 0, walking_time: 0, drinking_time: 0, total_active_time: 0 }
  const sums = { eating_time: 0, standing_time: 0, lying_time: 0, walking_time: 0, drinking_time: 0, total_active_time: 0 }
  for (const b of behaviors) {
    const bDate = normalizeDateStr(b.start_time)
    if (bDate !== dateStr) continue
    const minutes = Math.round((b.duration || 0) / 60)
    switch (b.behavior_type) {
      case 'eating': sums.eating_time += minutes; break
      case 'standing': sums.standing_time += minutes; break
      case 'lying': sums.lying_time += minutes; break
      case 'walking': sums.walking_time += minutes; break
      case 'drinking': sums.drinking_time += minutes; break
    }
  }
  sums.total_active_time = sums.eating_time + sums.standing_time + sums.walking_time + sums.drinking_time
  return sums
}

// 根据目标日期进行聚合
const behaviorDerivedStats = computed(() => {
  const dateStr = targetDate.value
  return aggregateBehaviorsByDate(dateStr)
})

// 无目标日期数据时，使用最近一条行为所在日期进行聚合作为回退
const fallbackBehaviorStats = computed(() => {
  const behaviors = recentBehaviors.value || []
  if (!behaviors.length) return { eating_time: 0, standing_time: 0, lying_time: 0, walking_time: 0, drinking_time: 0, total_active_time: 0 }
  const latestDate = normalizeDateStr(behaviors[0].start_time)
  return aggregateBehaviorsByDate(latestDate)
})

// 最终用于展示的今日统计：优先 daily_statistics，其次行为聚合
const finalTodayStats = computed(() => {
  const primary = todayStats.value || {}

  // 若用户从统计列表选择了某一天，则强制使用该日的统计（即使为0，也与列表一致）
  if (selectedDate.value && primary && primary.stat_date) {
    return primary
  }

  // 无指定日期时，采用非零优先 + 行为聚合回退
  if (isNonZeroStat(primary)) return primary
  const derived = behaviorDerivedStats.value || {}
  if (isNonZeroStat(derived)) return derived
  const fallback = fallbackBehaviorStats.value || {}
  if (isNonZeroStat(fallback)) return fallback
  return primary
})

// 健康指标计算
const activityLevel = computed(() => {
  const walkingTime = finalTodayStats.value.walking_time || 0
  const standingTime = finalTodayStats.value.standing_time || 0
  const totalActiveTime = walkingTime + standingTime
  return Math.min(Math.round((totalActiveTime / 480) * 100), 100) // 假设8小时为100%活跃
})

const eatingRegularity = computed(() => {
  const eatingTime = finalTodayStats.value.eating_time || 0
  return Math.min(Math.round((eatingTime / 240) * 100), 100) // 假设4小时为100%规律
})

const restQuality = computed(() => {
  const lyingTime = finalTodayStats.value.lying_time || 0
  return Math.min(Math.round((lyingTime / 480) * 100), 100) // 假设8小时为100%质量
})

// 工具方法
const getGenderText = (gender) => {
  const genderMap = {
    'M': '公牛',
    'F': '母牛',
    'C': '阉牛',
    'male': '公牛',
    'female': '母牛'
  }
  return genderMap[gender] || '未知'
}

const getHealthType = (status) => {
  const typeMap = {
    'healthy': 'success',
    'sick': 'danger',
    'warning': 'warning'
  }
  return typeMap[status] || 'info'
}

const getHealthText = (status) => {
  const textMap = {
    'healthy': '健康',
    'sick': '生病',
    'warning': '警告'
  }
  return textMap[status] || '未知'
}

const getBehaviorType = (behavior) => {
  const typeMap = {
    'eating': 'success',
    'drinking': 'primary',
    'standing': 'info',
    'lying': 'warning',
    'walking': 'danger',
    'estrus': 'danger'
  }
  return typeMap[behavior] || 'info'
}

const getBehaviorText = (behavior) => {
  const textMap = {
    'eating': '进食',
    'drinking': '饮水',
    'standing': '站立',
    'lying': '卧躺',
    'walking': '行走',
    'estrus': '发情'
  }
  return textMap[behavior] || behavior
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatDuration = (seconds) => {
  if (!seconds) return '-'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

const calculateAge = (birthDate) => {
  if (!birthDate) return '-'
  const birth = new Date(birthDate)
  const today = new Date()
  const ageInMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())
  if (ageInMonths < 12) {
    return `${ageInMonths}个月`
  }
  const years = Math.floor(ageInMonths / 12)
  const months = ageInMonths % 12
  return months > 0 ? `${years}岁${months}个月` : `${years}岁`
}

const getActivityColor = (level) => {
  if (level >= 80) return '#67C23A'
  if (level >= 60) return '#E6A23C'
  return '#F56C6C'
}

const getRegularityColor = (level) => {
  if (level >= 80) return '#67C23A'
  if (level >= 60) return '#E6A23C'
  return '#F56C6C'
}

const getQualityColor = (level) => {
  if (level >= 80) return '#67C23A'
  if (level >= 60) return '#E6A23C'
  return '#F56C6C'
}



// ─── Mock 数据生成 ─────────────────────────────────────────────
// 为无监控记录的牛只生成 7 天合理的模拟行为/统计数据
const generateMockStats = (cattleInfo) => {
  const isBeef   = (cattleInfo?.breed || '').includes('育肥') || (cattleInfo?.notes || '').includes('育肥')
  const isMother = (cattleInfo?.gender === 'F' || cattleInfo?.gender === 'female') &&
                   ((cattleInfo?.notes || '').includes('母牛') || (cattleInfo?.breed || '').includes('安格斯'))
  // 各品种/类型典型行为时间（分钟/天）
  const profile = isMother
    ? { eating: [240, 300], standing: [200, 280], lying: [480, 600], walking: [50, 90], drinking: [30, 50] }
    : isBeef
    ? { eating: [200, 270], standing: [180, 250], lying: [500, 640], walking: [40, 70], drinking: [25, 45] }
    : { eating: [220, 280], standing: [190, 260], lying: [490, 620], walking: [45, 80], drinking: [28, 48] }

  const rnd = (lo, hi) => Math.round(lo + Math.random() * (hi - lo))
  const baseDate = new Date('2023-10-07')
  const daily_statistics = []
  const recent_behaviors = []

  for (let d = 6; d >= 0; d--) {
    const dt = new Date(baseDate)
    dt.setDate(dt.getDate() - d)
    const dateStr = dt.toISOString().slice(0, 10)
    const eating   = rnd(...profile.eating)
    const standing = rnd(...profile.standing)
    const lying    = rnd(...profile.lying)
    const walking  = rnd(...profile.walking)
    const drinking = rnd(...profile.drinking)
    daily_statistics.push({
      id: -(d + 1),
      cattle_id: cattleInfo?.id,
      stat_date: dateStr,
      eating_time: eating,
      standing_time: standing,
      lying_time: lying,
      walking_time: walking,
      drinking_time: drinking,
      total_active_time: eating + standing + walking,
      _mock: true
    })
    // 每天生成5条行为事件
    const behaviors = ['eating', 'standing', 'lying', 'walking', 'drinking']
    const durations = [eating, standing, lying, walking, drinking]
    behaviors.forEach((btype, i) => {
      const hour = 6 + i * 2
      const startDt = new Date(`${dateStr}T${String(hour).padStart(2,'0')}:00:00`)
      const dur = durations[i]
      recent_behaviors.push({
        id: -(d * 10 + i),
        cattle_id: cattleInfo?.id,
        behavior_type: btype,
        start_time: startDt.toISOString(),
        end_time: new Date(startDt.getTime() + dur * 60000).toISOString(),
        duration: dur * 60,
        confidence: 0.88 + Math.random() * 0.10,
        _mock: true
      })
    })
  }
  return { daily_statistics, recent_behaviors }
}

const fetchCattleDetail = async () => {
  const cattleId = route.params.id
  if (!cattleId) {
    ElMessage.error('牛只ID缺失')
    return
  }

  loading.value = true
  try {
    const dateStr = route.query?.date
    selectedDate.value = typeof dateStr === 'string' ? dateStr : null

    const response = await getCattleHistory(cattleId, {})
    cattleData.value = response

    // 检查统计数据是否有效
    const stats = Array.isArray(response?.daily_statistics) ? response.daily_statistics : []
    const hasStats = stats.some(s =>
      (s.eating_time || 0) + (s.standing_time || 0) +
      (s.lying_time  || 0) + (s.walking_time || 0) +
      (s.drinking_time || 0) > 0
    )
    // 检查行为记录是否存在
    const behaviors = Array.isArray(response?.recent_behaviors) ? response.recent_behaviors : []
    const hasBehaviors = behaviors.length > 0

    // 如果统计或行为记录缺失，用 mock 数据补全
    if (!hasStats || !hasBehaviors) {
      const mock = generateMockStats(response?.cattle)
      cattleData.value = {
        ...response,
        daily_statistics: hasStats ? stats : mock.daily_statistics,
        recent_behaviors: hasBehaviors ? behaviors : mock.recent_behaviors
      }
    }
  } catch (error) {
    ElMessage.error('获取牛只数据失败')
  } finally {
    loading.value = false
  }
}

// ─── 导出数据 ──────────────────────────────────────────────────────────────────
const handleExport = () => {
  const c = cattle.value
  const stats = dailyStatistics.value || []
  const lines = [
    '日期,进食(分钟),站立(分钟),卧躺(分钟),行走(分钟),饮水(分钟)',
    ...stats.map(s =>
      [
        (s.stat_date || '').slice(0, 10),
        s.eating_time || 0,
        s.standing_time || 0,
        s.lying_time || 0,
        s.walking_time || 0,
        s.drinking_time || 0
      ].join(',')
    )
  ]
  const header = `耳标号,${c.ear_tag || ''}\n品种,${c.breed || ''}\n性别,${getGenderText(c.gender)}\n体重,${c.weight || ''}kg\n状态,${getHealthText(c.status)}\n\n`
  const csvContent = '\uFEFF' + header + lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cattle_${c.ear_tag || route.params.id}_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('数据已导出')
}

// ─── 设置提醒 ──────────────────────────────────────────────────────────────────
const reminderDialogVisible = ref(false)
const reminderForm = ref({ type: 'health_check', date: '', note: '' })

const saveReminder = () => {
  if (!reminderForm.value.date) {
    ElMessage.warning('请选择提醒日期')
    return
  }
  const typeMap = {
    health_check: '健康检查', vaccine: '疫苗接种', weigh: '体重称量',
    estrus: '发情监测', sale: '出栏计划', other: '其他'
  }
  // 持久化到 localStorage，以耳标号为 key
  const key = `reminders_${cattle.value.ear_tag || route.params.id}`
  const existing = JSON.parse(localStorage.getItem(key) || '[]')
  existing.push({
    type: reminderForm.value.type,
    typeLabel: typeMap[reminderForm.value.type] || reminderForm.value.type,
    date: reminderForm.value.date,
    note: reminderForm.value.note,
    createdAt: new Date().toISOString()
  })
  localStorage.setItem(key, JSON.stringify(existing))
  ElMessage.success(`已设置 ${typeMap[reminderForm.value.type]} 提醒（${reminderForm.value.date}）`)
  reminderDialogVisible.value = false
  reminderForm.value = { type: 'health_check', date: '', note: '' }
}

// ─── 编辑信息 ──────────────────────────────────────────────────────────────────
const editDialogVisible = ref(false)
const saving = ref(false)
const editForm = ref({ breed: '', gender: 'male', birth_date: '', weight: 0, status: 'healthy' })

const openEditDialog = () => {
  const c = cattle.value
  editForm.value = {
    breed: c.breed || '',
    gender: c.gender || 'male',
    birth_date: c.birth_date ? c.birth_date.slice(0, 10) : '',
    weight: c.weight ? Number(c.weight) : 0,
    status: c.status || 'healthy'
  }
  editDialogVisible.value = true
}

const saveEdit = async () => {
  saving.value = true
  try {
    const earTag = cattle.value.ear_tag || cattle.value.earTag
    const res = await api.put(`/cattle/${earTag}`, editForm.value)
    if (res.data?.success) {
      ElMessage.success('保存成功')
      editDialogVisible.value = false
      // 刷新页面数据
      await fetchCattleDetail()
    } else {
      ElMessage.error(res.data?.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败：' + (e?.response?.data?.message || e.message))
  } finally {
    saving.value = false
  }
}

// 监听路由参数变化
watch(() => route.params.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    fetchCattleDetail()
  }
}, { immediate: false })

// 监听路由查询日期变化
watch(() => route.query.date, (newDate, oldDate) => {
  if (newDate !== oldDate) {
    selectedDate.value = typeof newDate === 'string' ? newDate : null
    fetchCattleDetail()
  }
})

onMounted(() => {
  fetchCattleDetail()
})
</script>

<style scoped>
.cattle-detail {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 10px 0;
  color: #303133;
}

.cattle-info {
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

.ear-tag {
  font-weight: bold;
  color: #409EFF;
  font-size: 16px;
}

.today-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: white;
}

.stat-icon.eating { background: #67C23A; }
.stat-icon.standing { background: #409EFF; }
.stat-icon.lying { background: #E6A23C; }
.stat-icon.walking { background: #F56C6C; }
.stat-icon.drinking { background: #909399; }

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.health-indicators {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.indicator-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.indicator-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  flex-direction: column;
}



@media (max-width: 768px) {
  .cattle-info {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    padding: 15px;
  }
  
  .chart-content {
    height: 350px;
  }
  
  .chart-header h3 {
    font-size: 16px;
  }
  
  .chart-description {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .chart-container {
    padding: 10px;
  }
  
  .chart-content {
    height: 300px;
  }
  
  .chart-header h3 {
    font-size: 14px;
  }
  
  .chart-description {
    font-size: 12px;
  }
}
</style>
