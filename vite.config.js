import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  css: {
    postcss: './postcss.config.js'
  },
  // AWS SDK optimization for better performance
  optimizeDeps: {
    include: [
      '@aws-sdk/client-dynamodb',
      '@aws-sdk/lib-dynamodb',
      '@aws-sdk/client-s3'
    ],
    exclude: ['aws-sdk'] // Exclude the old v2 SDK if present
  },
  // Define global for AWS SDK compatibility
  define: {
    global: 'globalThis',
  },
  // Build optimizations for AWS SDK
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          'aws-sdk-core': ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb'],
          'aws-sdk-s3': ['@aws-sdk/client-s3']
        }
      }
    }
  }
})
