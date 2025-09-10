import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/swiss-jass-app/',
  plugins: [react()],
  server: { port: 3001 }
})
