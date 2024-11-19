import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import autoprefixer from 'autoprefixer';
import eslint from 'vite-plugin-eslint2';
import stylelint from 'vite-plugin-stylelint';
import { VitePWA } from 'vite-plugin-pwa';
import browserslistToEsbuild from 'browserslist-to-esbuild';

function manualChunks(id: string) {
  if (id.includes('workbox')) {
    return 'workbox-window.prod.es5';
  }
  if (id.includes('node_modules')) {
    if (id.includes("node_modules/react-dom")) {
      return 'react-dom';
    }
    return 'vendor';
  }

  const match = /i18n\/(.+?)\//.exec(id);
  if (match) {
    return `i18n-${match[1].split('-')[0]}`;
  }

  // Needed for initial load
  else if (id.includes("index.tsx") || id.includes("App.tsx") || id.includes("modulepreload-polyfill.js")) {
    return 'index';
  }

  // Needed for search view
  else if (id.includes("files.ts") || id.includes("Search.tsx") || id.includes("Options.tsx")) {
    return 'search';
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/poke-corpus/',
  plugins: [
    react(),
    eslint(),
    stylelint(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/{!(i18n*),i18n-en*}.{js,css,html,ico,png,json}'] }, // only pre-cache the English i18n file
      manifest: false,
    }),
  ],
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    reporters: ['verbose'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: [],
    },
  },
  optimizeDeps: {
    include: ['compression-streams-polyfill'],
  },
  build: {
    target: browserslistToEsbuild(),
    rollupOptions: {
      output: {
        manualChunks: manualChunks,
      },
    },
  },
});
