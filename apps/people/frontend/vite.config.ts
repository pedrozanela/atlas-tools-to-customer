import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname),
  base: '/people/',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 3006,
    proxy: { '/people/api': { target: 'http://localhost:8005', changeOrigin: true } },
  },
  build: { outDir: '../backend/static', emptyOutDir: true },
})
