<template>
  <div id="app">
    <!-- ── 登录页 ─────────────────────────────────────────────── -->
    <div v-if="!authed" class="login-wrap">
      <div class="login-card">
        <div class="login-logo">
          <el-icon size="48" color="#409EFF"><Monitor /></el-icon>
          <h2>肉牛养殖监控系统</h2>
          <p>请使用管理员账号登录</p>
        </div>
        <el-form @submit.prevent="doLogin" class="login-form">
          <el-form-item>
            <el-input
              v-model="loginForm.username"
              placeholder="用户名（默认 admin）"
              prefix-icon="User"
              size="large"
              autofocus
            />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="密码（默认 admin123）"
              prefix-icon="Lock"
              size="large"
              show-password
              @keyup.enter="doLogin"
            />
          </el-form-item>
          <el-alert v-if="loginError" :title="loginError" type="error" show-icon :closable="false" style="margin-bottom:12px" />
          <el-button
            type="primary"
            size="large"
            :loading="loginLoading"
            style="width:100%"
            @click="doLogin"
          >
            {{ loginLoading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form>
      </div>
    </div>

    <!-- ── 主应用 ─────────────────────────────────────────────── -->
    <el-container v-else class="app-container">
      <el-header class="app-header">
        <div class="header-content">
          <div class="logo-section">
            <el-icon class="logo-icon" size="32"><Monitor /></el-icon>
            <h1 class="app-title">肉牛养殖监控系统</h1>
          </div>

          <div class="nav-section">
            <el-menu
              :default-active="activeIndex"
              mode="horizontal"
              @select="handleMenuSelect"
              background-color="transparent"
              text-color="#fff"
              active-text-color="#409EFF"
            >
              <el-menu-item index="/dashboard">
                <el-icon><DataBoard /></el-icon><span>仪表板</span>
              </el-menu-item>
              <el-menu-item index="/monitoring">
                <el-icon><VideoCamera /></el-icon><span>视频监控</span>
              </el-menu-item>
              <el-menu-item index="/statistics">
                <el-icon><DataAnalysis /></el-icon><span>数据统计</span>
              </el-menu-item>
              <el-menu-item index="/statistics/estrus">
                <el-icon><DataAnalysis /></el-icon><span>发情分析</span>
              </el-menu-item>
              <el-menu-item index="/cattle">
                <el-icon><Chicken /></el-icon><span>牛只管理</span>
              </el-menu-item>
              <el-menu-item index="/management">
                <el-icon><Setting /></el-icon><span>系统管理</span>
              </el-menu-item>
            </el-menu>
          </div>

          <div class="user-section">
            <el-dropdown @command="handleUserCmd">
              <span class="user-info">
                <el-icon><User /></el-icon>
                <span>管理员</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout">
                    <el-icon><SwitchButton /></el-icon>退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-header>

      <el-main class="app-main">
        <router-view v-slot="{ Component, route }">
          <transition name="fade" mode="out-in">
            <keep-alive :include="['Dashboard', 'Monitoring', 'Statistics', 'EstrusStatistics']">
              <component :is="Component" :key="route.fullPath" />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>

      <el-footer class="app-footer">
        <div class="footer-content">
          <span>© 2024 肉牛养殖监控系统 v1.0.0</span>
          <span>系统状态:
            <el-tag :type="systemStatus.type" size="small">{{ systemStatus.text }}</el-tag>
          </span>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Monitor, DataBoard, VideoCamera, DataAnalysis, Setting,
  User, ArrowDown, SwitchButton, Chicken,
} from '@element-plus/icons-vue'
import { login, logout, getToken } from '@/api/index'
import api from '@/api/index'

const router = useRouter()
const route  = useRoute()

// ── Auth state ───────────────────────────────────────────────────────────────
const authed = ref(!!getToken())

const loginForm   = ref({ username: 'admin', password: 'admin123' })
const loginError  = ref('')
const loginLoading = ref(false)

const doLogin = async () => {
  loginError.value  = ''
  loginLoading.value = true
  try {
    await login(loginForm.value.username, loginForm.value.password)
    authed.value = true
    getSystemStatus()
  } catch (err) {
    loginError.value = err.response?.data?.error || err.message || '登录失败'
  } finally {
    loginLoading.value = false
  }
}

const handleUserCmd = (cmd) => {
  if (cmd === 'logout') {
    logout()
    authed.value = false
  }
}

// Listen for 401 events (token expired)
const onAuthExpired = () => { authed.value = false }
onMounted(() => window.addEventListener('monitoring-auth-expired', onAuthExpired))
onUnmounted(() => window.removeEventListener('monitoring-auth-expired', onAuthExpired))

// ── Navigation ───────────────────────────────────────────────────────────────
const activeIndex = computed(() => {
  const path = route.path
  if (path.startsWith('/monitoring'))       return '/monitoring'
  if (path.startsWith('/statistics/estrus')) return '/statistics/estrus'
  if (path.startsWith('/statistics'))       return '/statistics'
  if (path.startsWith('/cattle'))           return '/cattle'
  if (path.startsWith('/management'))       return '/management'
  return '/dashboard'
})

const handleMenuSelect = (index) => router.push(index)

// ── System status ────────────────────────────────────────────────────────────
const systemStatus = ref({ type: 'success', text: '正常运行' })

const getSystemStatus = async () => {
  try {
    const response = await api.get('/system/status')
    if (response && response.database) {
      if (!response.database.connected) {
        systemStatus.value = { type: 'danger', text: '数据库连接异常' }
      } else if (response.cameras && response.cameras.health_percentage < 80) {
        systemStatus.value = { type: 'warning', text: '部分摄像头离线' }
      } else {
        systemStatus.value = { type: 'success', text: '正常运行' }
      }
    }
  } catch {
    systemStatus.value = { type: 'info', text: '运行中' }
  }
}

onMounted(() => {
  if (authed.value) {
    getSystemStatus()
    setInterval(getSystemStatus, 300000)
  }
})
</script>

<style scoped>
/* ── Login page ── */
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 48px 40px;
  width: 380px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.login-logo {
  text-align: center;
  margin-bottom: 32px;
}
.login-logo h2 { margin: 12px 0 4px; font-size: 22px; color: #303133; }
.login-logo p  { color: #909399; font-size: 14px; margin: 0; }

/* ── Main app ── */
.app-container { height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.app-header    { background: #87CEEB; border-bottom: 1px solid rgba(255,255,255,0.3); padding: 0; }
.header-content {
  display: flex; align-items: center; justify-content: space-between;
  height: 100%; padding: 0 20px;
}
.logo-section { display: flex; align-items: center; gap: 12px; }
.logo-icon    { color: #fff; }
.app-title    { color: #fff; font-size: 20px; font-weight: 600; margin: 0; }
.nav-section  { flex: 1; display: flex; justify-content: center; }
.nav-section .el-menu { border-bottom: none; }
.nav-section .el-menu-item { border-bottom: 2px solid transparent; font-weight: bold; }
.nav-section .el-menu-item:hover { background-color: rgba(255,255,255,0.1); }
.nav-section .el-menu-item.is-active { border-bottom-color: #409EFF; background-color: rgba(64,158,255,0.1); }
.user-section { color: #fff; }
.user-info {
  display: flex; align-items: center; gap: 8px;
  cursor: pointer; padding: 8px 12px; border-radius: 6px; font-weight: bold;
}
.user-info:hover { background-color: rgba(255,255,255,0.1); }
.app-main   { background: #f5f7fa; padding: 20px; overflow-y: auto; }
.app-footer {
  background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255,255,255,0.2); height: 50px; line-height: 50px;
}
.footer-content {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 20px; color: #fff; font-size: 14px;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
