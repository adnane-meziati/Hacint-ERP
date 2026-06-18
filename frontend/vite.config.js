import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Inside Docker the backend is reachable via the service name "backend".
// Outside Docker (plain npm run dev) it lives on localhost:8000.
const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],

  // ── Development server ────────────────────────────────────────────────
  server: {
    host: true,   // 0.0.0.0 → reachable on the LAN
    port: 5173,
    proxy: {
      // In dev mode Vite proxies API calls to Django.
      // /api must NOT use changeOrigin: Django's build_absolute_uri() (used for
      // thumbnailUrl/imageUrl/etc.) reflects the Host header back into the JSON
      // response. With changeOrigin the backend would see "backend:8000" (the
      // Docker service name) and return links the browser can't resolve. Keeping
      // the original "localhost:5173" Host lets those links round-trip back
      // through this same proxy (via the /media rule below).
      '/api':   { target: backendUrl },
      '/media': { target: backendUrl, changeOrigin: true },
    },
  },

  // ── Production build ──────────────────────────────────────────────────
  // Output directly into the Django project so Django can serve the app.
  // Run:  cd frontend && npm run build
  build: {
    outDir: '../backend/frontend_dist',
    emptyOutDir: true,
  },
})
