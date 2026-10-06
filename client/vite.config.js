import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API = process.env.VITE_API_TARGET ?? 'http://localhost:5000';

// Dev: the browser only ever talks to Vite (same origin); /api and /uploads are proxied to Express.
// `host: true` + `allowedHosts: true` let it work inside GitHub Codespaces / containers.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: { '/api': API, '/uploads': API },
  },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.js'], globals: false },
});
