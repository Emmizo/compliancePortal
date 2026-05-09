import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Default 127.0.0.1:8088 = docker-compose API on host (::1/localhost mismatch has sent traffic to wrong Jetty stacks before).
export default defineConfig(({ mode }) => {
  const envFromFiles = loadEnv(mode, path.resolve(__dirname), '');
  const complianceApiDevProxyTarget =
    envFromFiles.COMPLIANCE_API_PROXY ?? process.env.COMPLIANCE_API_PROXY ?? 'http://127.0.0.1:8088';

  if (mode === 'development') {
    // eslint-disable-next-line no-console -- visible proof of resolved proxy target on `npm run dev`
    console.info(`[vite] licensing API proxy (/api,/ws): ${complianceApiDevProxyTarget}`);
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: complianceApiDevProxyTarget,
          changeOrigin: true,
        },
        '/ws': {
          target: complianceApiDevProxyTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
