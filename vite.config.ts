import { createHash } from 'node:crypto'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const DEFAULT_UNLOCK_SHA256 = 'b20a456461aee8bc5b2163ecfb52cec4ecf8bf6551a98810d355e29d4d46af21'

function unlockHash(): string {
  const code = process.env.UNLOCK_CODE?.trim()
  if (!code) return DEFAULT_UNLOCK_SHA256
  return createHash('sha256').update(code, 'utf8').digest('hex')
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __UNLOCK_SHA256__: JSON.stringify(unlockHash()),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 43123,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:43124',
        changeOrigin: true,
      },
    },
  },
})
