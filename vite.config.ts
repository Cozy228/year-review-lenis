import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'
import { fileURLToPath } from 'url'
import { resolve as resolvePath } from 'path'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react(), glsl()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': resolvePath(projectRoot, 'src'),
      '~': resolvePath(projectRoot, 'src'),
      react: resolvePath(projectRoot, 'node_modules/react'),
      'react-dom': resolvePath(projectRoot, 'node_modules/react-dom')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "sass:math";
          @use "@/styles/variables" as *;
          @use "@/styles/functions" as *;
        `
      }
    }
  },
  build: {
    target: 'esnext'
  }
})
