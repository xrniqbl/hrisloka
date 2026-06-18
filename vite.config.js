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
  build: {
    // face-api is intentionally ~1.3 MB — raise limit to suppress spurious warning
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── 1. Heavy ML lib — loaded only on absensi page ─────────────
          if (id.includes('@vladmandic/face-api')) return 'face-api';

          // ── 2. TipTap editor — loaded only on contract pages ──────────
          if (id.includes('@tiptap')) return 'tiptap';

          // ── 3. DOMPurify sanitiser ────────────────────────────────────
          if (id.includes('dompurify') || id.includes('isomorphic-dompurify')) return 'purify';

          // ── 4. React Icons (icon set is large, isolate it) ────────────
          if (id.includes('react-icons')) return 'icons';

          // ── 5. Supabase client ────────────────────────────────────────
          if (id.includes('@supabase')) return 'supabase';

          // ── 6. React Router ───────────────────────────────────────────
          if (id.includes('react-router') || id.includes('@remix-run')) return 'router';

          // ── 7. React + ReactDOM (must come AFTER router to avoid circular) ─
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) return 'react-core';

          // Everything else in node_modules → vendor
          // (no separate vendor rule needed — Rollup handles the rest)
        },
      },
    },
  },
})
