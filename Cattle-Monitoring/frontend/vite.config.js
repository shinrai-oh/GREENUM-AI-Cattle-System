import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Windows 路径兼容性改进
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 备用路径解析
      '~': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 8080,
    // Windows 网络配置优化
    strictPort: false,
    cors: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // Windows 代理优化
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: process.env.NODE_ENV === 'development',
    // Windows 构建优化
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
    rollupOptions: {
      output: {
        // Windows 文件名兼容性
        sanitizeFileName(fileName) {
          // 移除 Windows 不支持的字符
          return fileName.replace(/[<>:"|?*]/g, '_');
        },
        manualChunks: {
          vendor: ['vue', 'vue-router'],
          elementPlus: ['element-plus'],
          echarts: ['echarts'],
        },
        // 资源文件命名优化
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name)) {
            return `media/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|gif|svg)(\?.*)?$/i.test(assetInfo.name)) {
            return `images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name)) {
            return `fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
    // Windows 大文件处理
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'element-plus', 'echarts'],
    // Windows 依赖预构建优化
    force: false,
  },
  // Windows 环境变量支持
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
  },
  // Windows 文件监听优化
  esbuild: {
    target: 'es2015',
  },
})