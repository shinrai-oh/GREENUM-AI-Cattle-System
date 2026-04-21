import { createRouter, createWebHistory } from 'vue-router'

// 路由组件
const Dashboard = () => import('@/views/Dashboard.vue')
const Monitoring = () => import('@/views/Monitoring.vue')
const Statistics = () => import('@/views/Statistics.vue')
const EstrusStatistics = () => import('@/views/EstrusStatistics.vue')
const Management = () => import('@/views/Management.vue')
const CattleManagement = () => import('@/views/CattleManagement.vue')
const FarmDetail = () => import('@/views/FarmDetail.vue')
const CameraDetail = () => import('@/views/CameraDetail.vue')
const CattleDetail = () => import('@/views/CattleDetail.vue')

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: '仪表板',
      icon: 'DataBoard'
    }
  },
  {
    path: '/monitoring',
    name: 'Monitoring',
    component: Monitoring,
    meta: {
      title: '视频监控',
      icon: 'VideoCamera'
    }
  },
  {
    path: '/monitoring/camera/:id',
    name: 'CameraDetail',
    component: CameraDetail,
    meta: {
      title: '摄像头详情',
      hidden: true
    }
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: Statistics,
    meta: {
      title: '数据统计',
      icon: 'DataAnalysis'
    }
  },
  {
    path: '/statistics/estrus',
    name: 'EstrusStatistics',
    component: EstrusStatistics,
    meta: {
      title: '发情数据',
      icon: 'DataAnalysis'
    }
  },
  {
    path: '/statistics/cattle/:id',
    name: 'CattleDetail',
    component: CattleDetail,
    meta: {
      title: '牛只详情',
      hidden: true
    }
  },
  {
    path: '/cattle',
    name: 'CattleManagement',
    component: CattleManagement,
    meta: {
      title: '牛只管理',
      icon: 'Cow'
    }
  },
  {
    path: '/management',
    name: 'Management',
    component: Management,
    meta: {
      title: '系统管理',
      icon: 'Setting'
    }
  },
  {
    path: '/management/farm/:id',
    name: 'FarmDetail',
    component: FarmDetail,
    meta: {
      title: '养牛厂详情',
      hidden: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面未找到',
      hidden: true
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 肉牛养殖监控系统`
  }
  
  // 这里可以添加权限验证逻辑
  // 目前直接放行
  next()
})

router.afterEach((to, from) => {
  // 路由切换后的处理
  console.log(`路由从 ${from.path} 切换到 ${to.path}`)
})

export default router
