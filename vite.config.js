import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // relative paths so it works on GitHub Pages and locally
  plugins: [react()],
  // the AI avatar chat calls /api; in dev that goes to the FastAPI backend (backend/main.py)
  server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:8000' } },
})
