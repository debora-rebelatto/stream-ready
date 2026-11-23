import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      host: true,
      watch: {
        usePolling: true,
      },
      proxy: {
        '/api': 'http://127.0.0.1:7000',
        '/manifest.json': 'http://127.0.0.1:7000',
        '/catalog': 'http://127.0.0.1:7000',
        '/meta': 'http://127.0.0.1:7000',
      },
    },
  };
});
