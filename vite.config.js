import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  
  build: {
    // Usa esbuild invece di terser (più veloce, già incluso)
    minify: 'esbuild',
    
    // Ottimizzazione chunk size
    chunkSizeWarningLimit: 600,
    
    // Configurazione Rollup per code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Leaflet in un chunk separato (è pesante!)
          'leaflet': ['leaflet'],
          
          // React e React-DOM insieme
          'react-vendor': ['react', 'react-dom'],
          
          // React Icons separato
          'icons': ['react-icons'],
          
          // Appwrite SDK separato
          'appwrite': ['appwrite'],
        },
        
        // Nomi file ottimizzati con hash
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      }
    },
    
    // Ottimizzazioni CSS
    cssCodeSplit: true,
    cssMinify: true,
    
    // NO sourcemaps in produzione
    sourcemap: false,
    
    // Target browser moderni
    target: 'es2015',
    
    // Report dimensioni compresse
    reportCompressedSize: true,
  },
  
  server: {
    port: 5173,
    strictPort: false,
  },
  
  preview: {
    port: 4173,
    strictPort: false,
  }
})