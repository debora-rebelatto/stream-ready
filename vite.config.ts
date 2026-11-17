import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.VITE_POSTHOG_KEY': JSON.stringify(env.VITE_POSTHOG_KEY || process.env.VITE_POSTHOG_KEY || ''),
      'process.env.VITE_POSTHOG_HOST': JSON.stringify(env.VITE_POSTHOG_HOST || process.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'),
      'process.env.VITE_EXCLUDED_TRACKING_EMAILS': JSON.stringify(env.VITE_EXCLUDED_TRACKING_EMAILS || process.env.VITE_EXCLUDED_TRACKING_EMAILS || ''),
      'process.env.VITE_EXCLUDED_TRACKING_USER_IDS': JSON.stringify(env.VITE_EXCLUDED_TRACKING_USER_IDS || process.env.VITE_EXCLUDED_TRACKING_USER_IDS || ''),
    },
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
        '/api': 'http://localhost:7000',
        '/manifest.json': 'http://localhost:7000',
        '/catalog': 'http://localhost:7000',
        '/meta': 'http://localhost:7000',
      },
    },
  };
});
