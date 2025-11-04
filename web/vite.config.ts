import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Garante que o Vite utilize a versão JavaScript do Rollup em vez do binário nativo.
// Isso evita falhas em sistemas Windows onde o pacote opcional "@rollup/rollup-win32-x64-msvc"
// pode não ser baixado corretamente devido a bugs conhecidos do npm.
if (!process.env.ROLLUP_SKIP_NODE_NATIVE) {
  process.env.ROLLUP_SKIP_NODE_NATIVE = 'true';
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});
