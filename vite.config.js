import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/jardim-dos-presentes/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 800
  }
});
