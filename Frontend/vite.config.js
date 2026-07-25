import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,        // Intenta usar este puerto primero
    strictPort: false, // Si está ocupado, Vite usará 5174, 5175, etc.
  },
})