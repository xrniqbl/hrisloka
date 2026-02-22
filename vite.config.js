import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api-bank': {
        target: 'https://use.api.co.id',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-bank/, '/validation'),
      },
    },
  },
})
