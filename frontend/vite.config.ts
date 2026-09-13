import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Se usa tanto para embeber en el bundle (__BUILD_ID__) como para el
// archivo version.txt servido junto al resto — así el cliente puede
// comparar "con qué versión arranqué" vs "qué hay publicado ahora".
const buildId = Date.now().toString()

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'emit-version-file',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.txt', source: buildId })
      },
    },
  ],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
