import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    // relativeCSSInjection: cada página (flyer y /app) inyecta solo su propio CSS
    cssInjectedByJsPlugin({ relativeCSSInjection: true }),
    // Permite acceder a /app en desarrollo y servir app.html automáticamente
    {
      name: 'rewrite-app-path',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/app' || req.url === '/app/') {
            req.url = '/app.html';
          }
          next();
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html')
      }
    }
  },
  server: {
    proxy: {
      '/api/prefectura': {
        target: 'https://contenidosweb.prefecturanaval.gob.ar',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/prefectura/, '/alturas/?page=historico&tiempo=7&id=532'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        }
      }
    }
  }
})
