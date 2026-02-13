import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 越简单的配置，兼容性越强
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  }
})
