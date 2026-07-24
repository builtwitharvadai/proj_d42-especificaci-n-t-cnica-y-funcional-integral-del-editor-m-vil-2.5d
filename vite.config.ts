import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
  },
  optimizeDeps: {
    include: ['pixi.js'],
  },
});
