import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 越简单的配置，兼容性越强
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  // 确保环境变量被正确注入
  define: {
    __VITE_API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:8000')
  }
})
