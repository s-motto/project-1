import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isLocal = command === 'serve' || command === 'preview' || mode === 'development'

  return {
    base: isLocal ? './' : '/',
    plugins: [react()],

    // ==========================================
    // CONFIGURAZIONE TEST
    // ==========================================
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/setupTests.js',
        ]
      }
    },

    build: {
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            leaflet: ['leaflet'],
            'react-vendor': ['react', 'react-dom'],
            icons: ['react-icons'],
            appwrite: ['appwrite'],
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      cssCodeSplit: true,
      cssMinify: true,
      sourcemap: false,
      target: 'es2015',
      reportCompressedSize: true,
    },

    server: {
      port: 5173,
      strictPort: false,
    },

    preview: {
      port: 4173,
      strictPort: false,
    },
  }
})