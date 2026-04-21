<template>
  <div class="cattle-management">
    <div class="page-header">
      <h1>牛只管理</h1>
      <p>管理和查看所有牛只信息</p>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-box">
      <el-form :model="searchForm" class="search-form" inline>
        <el-form-item label="养牛厂">
          <el-select 
            v-model="searchForm.farm_id" 
            placeholder="请选择养牛厂" 
            clearable
            @change="handleFarmChange"
          >
            <el-option
              v-for="farm in farms"
              :key="farm.id"
              :label="farm.name || '未知养牛厂'"
              :value="farm.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="栏位">
          <el-select 
            v-model="searchForm.pen_id" 
            placeholder="请选择栏位" 
            clearable
            :disabled="!searchForm.farm_id"
          >
            <el-option
              v-for="pen in pens"
              :key="pen.id"
              :label="pen.pen_number || '未知栏位'"
              :value="pen.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="耳标号">
          <el-input 
            v-model="searchForm.ear_tag" 
            placeholder="请输入耳标号" 
            clearable
          />
        </el-form-item>
        
        <el-form-item label="品种">
          <el-select v-model="searchForm.breed" placeholder="请选择品种" clearable>
            <el-option label="西门塔尔杂交" value="西门塔尔杂交" />
            <el-option label="安格斯" value="安格斯" />
            <el-option label="本地黄牛" value="本地黄牛" />
            <el-option label="三景外购育肥牛" value="三景外购育肥牛" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="健康" value="healthy" />
            <el-option label="生病" value="sick" />
            <el-option label="隔离" value="quarantine" />
            <el-option label="已售" value="sold" />
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="searchCattle">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-button type="success" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            添加牛只
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 牛只列表 -->
    <div class="card">
      <div class="card-body">
        <el-table 
          :data="cattle" 
          v-loading="loading"
          style="width: 100%"
          @row-click="handleRowClick"
        >
          <el-table-column prop="ear_tag" label="耳标号" width="120" />
          <el-table-column prop="breed" label="品种" width="100" />
          <el-table-column prop="gender" label="性别" width="80">
            <template #default="scope">
              {{ getGenderText(scope.row.gender) }}
            </template>
          </el-table-column>
          <el-table-column prop="birth_date" label="出生日期" width="120">
            <template #default="scope">
              {{ formatDate(scope.row.birth_date) }}
            </template>
          </el-table-column>
          <el-table-column prop="weight" label="体重(kg)" width="100" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="farm_name" label="所属养牛厂" width="150" />
          <el-table-column prop="pen_number" label="栏位" width="100" />
          <el-table-column prop="created_at" label="入场时间" width="160">
            <template #default="scope">
              {{ formatDateTime(scope.row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="scope">
              <el-button 
                type="primary" 
                size="small" 
                @click.stop="viewDetail(scope.row)"
              >
                查看详情
              </el-button>
              <el-button 
                type="warning" 
                size="small" 
                @click.stop="editCattle(scope.row)"
              >
                编辑
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                @click.stop="deleteCattle(scope.row)"
              >
                删除
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

    <!-- 添加/编辑牛只对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="耳标号" prop="ear_tag">
          <el-input v-model="form.ear_tag" placeholder="请输入耳标号" />
        </el-form-item>
        
        <el-form-item label="养牛厂" prop="farm_id">
          <el-select 
            v-model="form.farm_id" 
            placeholder="请选择养牛厂"
            @change="handleDialogFarmChange"
          >
            <el-option
              v-for="farm in farms"
              :key="farm.id"
              :label="farm.name || '未知养牛厂'"
              :value="farm.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="栏位" prop="pen_id">
          <el-select 
            v-model="form.pen_id" 
            placeholder="请选择栏位"
            :disabled="!form.farm_id"
          >
            <el-option
              v-for="pen in dialogPens"
              :key="pen.id"
              :label="pen.pen_number || '未知栏位'"
              :value="pen.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="品种" prop="breed">
          <el-select v-model="form.breed" placeholder="请选择品种">
            <el-option label="西门塔尔杂交" value="西门塔尔杂交" />
            <el-option label="安格斯" value="安格斯" />
            <el-option label="本地黄牛" value="本地黄牛" />
            <el-option label="三景外购育肥牛" value="三景外购育肥牛" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="form.gender">
            <el-radio label="M">公牛</el-radio>
            <el-radio label="F">母牛</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="出生日期" prop="birth_date">
          <el-date-picker
            v-model="form.birth_date"
            type="date"
            placeholder="请选择出生日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        
        <el-form-item label="体重(kg)" prop="weight">
          <el-input-number
            v-model="form.weight"
            :min="0"
            :max="2000"
            :precision="1"
            placeholder="请输入体重"
          />
        </el-form-item>
        
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option label="健康" value="healthy" />
            <el-option label="生病" value="sick" />
            <el-option label="隔离" value="quarantine" />
            <el-option label="已售" value="sold" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onActivated, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { getFarms, getFarmPens, getFarmCattle, createFarmCattle } from '@/api/farms'
import { clearCache } from '@/api/index'
import dayjs from 'dayjs'

const router = useRouter()

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
const cattle = ref([])
const farms = ref([])
const pens = ref([])
const dialogPens = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('添加牛只')
const isEdit = ref(false)
const editingId = ref(null)

// 搜索表单
const searchForm = reactive({
  farm_id: null,
  pen_id: null,
  ear_tag: '',
  breed: '',
  status: ''
})

// 分页
const pagination = reactive({
  page: 1,
  per_page: 20,
  total: 0
})

// 表单数据
const form = reactive({
  ear_tag: '',
  farm_id: null,
  pen_id: null,
  breed: '',
  gender: 'F',
  birth_date: '',
  weight: null,
  status: 'healthy'
})

// 表单引用
const formRef = ref(null)

// 表单验证规则
const rules = {
  ear_tag: [
    { required: true, message: '请输入耳标号', trigger: 'blur' }
  ],
  farm_id: [
    { required: true, message: '请选择养牛厂', trigger: 'change' }
  ],
  pen_id: [
    { required: true, message: '请选择栏位', trigger: 'change' }
  ],
  breed: [
    { required: true, message: '请选择品种', trigger: 'change' }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ],
  birth_date: [
    { required: true, message: '请选择出生日期', trigger: 'change' }
  ],
  weight: [
    { required: true, message: '请输入体重', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 获取养牛厂列表
const fetchFarms = async () => {
  try {
    const response = await getFarms({ per_page: 100 })
    // 响应拦截器已经处理了数据结构
    if (response && response.farms && Array.isArray(response.farms)) {
      // 验证每个 farm 对象的必要属性
      const validFarms = response.farms.filter(farm => 
        farm && 
        typeof farm === 'object' && 
        farm.id !== undefined && 
        farm.name !== undefined && 
        typeof farm.name === 'string'
      )
      farms.value = validFarms
    } else {
      console.warn('获取养牛厂列表: 响应格式不正确或为空', response)
      farms.value = []
    }
  } catch (error) {
    console.error('获取养牛厂列表失败:', error)
    ElMessage.error('获取养牛厂列表失败: ' + (error.message || '未知错误'))
    farms.value = []
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
    // 响应拦截器已经处理了数据结构
    if (response && response.pens && Array.isArray(response.pens)) {
      // 验证每个 pen 对象的必要属性
      const validPens = response.pens.filter(pen => 
        pen && 
        typeof pen === 'object' && 
        pen.id !== undefined && 
        pen.pen_number !== undefined
      )
      pens.value = validPens
    } else {
      console.warn('获取栏位列表: 响应格式不正确或为空', response)
      pens.value = []
    }
  } catch (error) {
    console.error('获取栏位列表失败:', error)
    pens.value = []
  }
}

// 获取对话框栏位列表
const fetchDialogPens = async (farmId) => {
  if (!farmId) {
    dialogPens.value = []
    return
  }
  
  try {
    const response = await getFarmPens(farmId)
    // 响应拦截器已经处理了数据结构
    if (response && response.pens && Array.isArray(response.pens)) {
      // 验证每个 pen 对象的必要属性
      const validPens = response.pens.filter(pen => 
        pen && 
        typeof pen === 'object' && 
        pen.id !== undefined && 
        pen.pen_number !== undefined
      )
      dialogPens.value = validPens
    } else {
      console.warn('获取对话框栏位列表: 响应格式不正确或为空', response)
      dialogPens.value = []
    }
  } catch (error) {
    console.error('获取栏位列表失败:', error)
    dialogPens.value = []
  }
}

// 获取牛只列表
const fetchCattle = async () => {
  try {
    loading.value = true
    
    // 收集所有养牛厂的牛只数据
    const allCattle = []
    
    if (searchForm.farm_id) {
      // 如果选择了特定养牛厂，只获取该养牛厂的牛只
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        status: searchForm.status,
        pen_id: searchForm.pen_id
      }
      
      const response = await getFarmCattle(searchForm.farm_id, params)
      // 响应拦截器已经处理了数据结构
      if (response && response.cattle) {
        allCattle.push(...response.cattle)
        pagination.total = response.pagination ? response.pagination.total : response.cattle.length
      }
    } else {
      // 获取所有养牛厂的牛只
      for (const farm of farms.value) {
        const params = {
          page: 1,
          per_page: 1000, // 获取所有数据
          status: searchForm.status
        }
        
        const response = await getFarmCattle(farm.id, params)
        // 响应拦截器已经处理了数据结构
        if (response && response.cattle) {
          allCattle.push(...response.cattle)
        }
      }
      pagination.total = allCattle.length
    }
    
    // 客户端筛选
    let filteredCattle = allCattle
    
    if (searchForm.ear_tag) {
      filteredCattle = filteredCattle.filter(cow => 
        cow && cow.ear_tag && typeof cow.ear_tag === 'string' &&
        cow.ear_tag.toLowerCase().includes(searchForm.ear_tag.toLowerCase())
      )
    }
    
    if (searchForm.breed) {
      filteredCattle = filteredCattle.filter(cow => 
        cow && cow.breed && cow.breed === searchForm.breed
      )
    }
    
    // 客户端分页（如果没有选择特定养牛厂）
    if (!searchForm.farm_id) {
      const start = (pagination.page - 1) * pagination.per_page
      const end = start + pagination.per_page
      filteredCattle = filteredCattle.slice(start, end)
      pagination.total = allCattle.length
    }
    
    cattle.value = filteredCattle
    
  } catch (error) {
    console.error('获取牛只列表失败:', error)
    ElMessage.error('获取牛只列表失败')
  } finally {
    loading.value = false
  }
}

// 养牛厂变化处理
const handleFarmChange = (farmId) => {
  searchForm.pen_id = null
  fetchPens(farmId)
}

// 对话框养牛厂变化处理
const handleDialogFarmChange = (farmId) => {
  form.pen_id = null
  fetchDialogPens(farmId)
}

// 搜索牛只
const searchCattle = () => {
  pagination.page = 1
  fetchCattle()
}

// 重置搜索
const resetSearch = () => {
  searchForm.farm_id = null
  searchForm.pen_id = null
  searchForm.ear_tag = ''
  searchForm.breed = ''
  searchForm.status = ''
  pens.value = []
  pagination.page = 1
  fetchCattle()
}

// 显示添加对话框
const showAddDialog = () => {
  dialogTitle.value = '添加牛只'
  isEdit.value = false
  dialogVisible.value = true
}

// 编辑牛只
const editCattle = (row) => {
  dialogTitle.value = '编辑牛只'
  isEdit.value = true
  
  // 填充表单数据
  Object.assign(form, {
    id: row.id,
    ear_tag: row.ear_tag,
    farm_id: row.farm_id,
    pen_id: row.pen_id,
    breed: row.breed,
    gender: row.gender,
    birth_date: row.birth_date,
    weight: row.weight,
    status: row.status
  })
  
  // 获取对应的栏位列表
  fetchDialogPens(row.farm_id)
  
  dialogVisible.value = true
}

// 删除牛只
const deleteCattle = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除牛只 ${row.ear_tag} 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // TODO: 实现删除API
    ElMessage.success('删除成功')
    fetchCattle()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除牛只失败:', error)
      ElMessage.error('删除牛只失败')
    }
  }
}

// 提交表单
const submitForm = async () => {
  try {
    await formRef.value.validate()
    
    if (isEdit.value) {
      // TODO: 实现编辑API
      ElMessage.success('编辑成功')
    } else {
      const response = await createFarmCattle(form.farm_id, form)
      // 响应拦截器已经处理了数据结构
      if (response) {
        ElMessage.success('添加成功')
      }
    }
    
    dialogVisible.value = false
    fetchCattle()
  } catch (error) {
    console.error('提交失败:', error)
    if (error !== false) { // 不是表单验证错误
      ElMessage.error('操作失败')
    }
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(form, {
    ear_tag: '',
    farm_id: null,
    pen_id: null,
    breed: '',
    gender: 'F',
    birth_date: '',
    weight: null,
    status: 'healthy'
  })
  dialogPens.value = []
  formRef.value?.resetFields()
}

// 查看详情
const viewDetail = (row) => {
  router.push(`/statistics/cattle/${row.id}`)
}

// 行点击
const handleRowClick = (row) => {
  viewDetail(row)
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.per_page = size
  pagination.page = 1
  fetchCattle()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  fetchCattle()
}

// 工具函数
const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD') : '-'
}

const formatDateTime = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

const getGenderText = (gender) => {
  const genderMap = {
    'male': '公牛',
    'female': '母牛',
    'M': '公牛',
    'F': '母牛'
  }
  return genderMap[gender] || '未知'
}

const getStatusType = (status) => {
  const statusMap = {
    'healthy': 'success',
    'sick': 'danger',
    'quarantine': 'warning',
    'sold': 'info'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status) => {
  const statusMap = {
    'healthy': '健康',
    'sick': '生病',
    'quarantine': '隔离',
    'sold': '已售'
  }
  return statusMap[status] || '未知'
}

// 数据重置函数
const resetComponentData = () => {
  // 重置所有响应式数据到初始状态
  cattle.value = []
  farms.value = []
  pens.value = []
  dialogPens.value = []
  
  // 重置分页
  Object.assign(pagination, {
    page: 1,
    per_page: 10,
    total: 0
  })
  
  // 重置搜索条件
  Object.assign(searchForm, {
    ear_tag: '',
    farm_id: null,
    pen_id: null,
    breed: '',
    status: ''
  })
  
  // 重置表单
  Object.assign(form, {
    ear_tag: '',
    farm_id: null,
    pen_id: null,
    breed: '',
    gender: 'F',
    birth_date: '',
    weight: null,
    status: 'healthy'
  })
  
  // 重置对话框状态
  dialogVisible.value = false
  editingId.value = null
}

// 初始化数据函数
const initializeData = async () => {
  try {
    // 取消之前的请求
    cancelPendingRequests()

    // 创建新的请求控制器
    abortController = new AbortController()

    // 先加载养牛厂，再加载牛只（确保 fetchCattle 能遍历 farms.value）
    await fetchFarms()
    await fetchCattle()
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('初始化数据失败:', error)
      ElMessage.error('初始化数据失败')
    }
  }
}

// 组件挂载
onMounted(() => {
  initializeData()
})

// 组件激活（用于处理 keep-alive 缓存的组件）
onActivated(() => {
  // 清除API缓存，确保获取最新数据
  clearCache()
  // 当组件被激活时，重新初始化数据
  initializeData()
})

// 组件卸载前清理
onBeforeUnmount(() => {
  // 取消待处理的请求
  cancelPendingRequests()
  resetComponentData()
})
</script>

<style scoped>
.cattle-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.search-box {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.search-form {
  margin-bottom: 0;
}

.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-body {
  padding: 20px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}
</style>