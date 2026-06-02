import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@components': resolve(__dirname, 'src/sidepanel/components'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        web: resolve(__dirname, 'index.html'),
      },
    },
  },
});
