import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  //  in sviluppo (vite serve) o in anteprima (vite preview)
  const isDev = command === 'serve' || mode === 'development'

  return {
    // In locale usa percorsi relativi, su Netlify percorsi assoluti
    base: isDev ? './' : '/',

    plugins: [react()],

    build: {
      minify: 'esbuild',
      chunkSizeWarningLimit: 600,
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
