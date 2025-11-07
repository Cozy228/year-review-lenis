import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'
import { fileURLToPath } from 'url'
import { resolve as resolvePath } from 'path'
import tailwindcss from '@tailwindcss/vite'
const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react(), glsl(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': resolvePath(projectRoot, 'src'),
      '~': resolvePath(projectRoot, 'src'),
      react: resolvePath(projectRoot, 'node_modules/react'),
      'react-dom': resolvePath(projectRoot, 'node_modules/react-dom')
    }
  },
  build: {
    target: 'esnext'
  }
})
