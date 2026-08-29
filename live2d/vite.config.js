import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@framework': path.resolve('./Framework/src'),
    },
  },

  server: {
    port: 5173,
  },
})