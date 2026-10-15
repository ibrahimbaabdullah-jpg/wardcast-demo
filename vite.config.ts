import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/wardcast-demo/',
  plugins: [react()],
  build: { outDir: 'docs', rollupOptions: { output: { manualChunks: { charts: ['recharts'] } } } },
});
