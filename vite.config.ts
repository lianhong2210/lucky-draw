import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Link previews (og:image etc.) need absolute URLs. Replaces __SITE_URL__ in
 * index.html with the site's origin, picked in this order:
 *   1. SITE_URL            - set this yourself, e.g. https://lucky-draw.pages.dev
 *   2. VERCEL_PROJECT_PRODUCTION_URL - provided automatically by Vercel
 *   3. CF_PAGES_URL        - provided automatically by Cloudflare Pages
 *                            (per-deployment URL; set SITE_URL for a stable one)
 *   4. ""                  - falls back to root-relative paths
 */
function siteUrlPlugin(env: Record<string, string>): Plugin {
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL;
  const siteUrl = (
    env.SITE_URL ||
    (vercel ? `https://${vercel}` : '') ||
    env.CF_PAGES_URL ||
    ''
  ).replace(/\/+$/, '');

  return {
    name: 'site-url',
    transformIndexHtml(html) {
      return html.replaceAll('__SITE_URL__', siteUrl);
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/',
      server: {
        port: 3010,
        host: '0.0.0.0',
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: 'esbuild',
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
              'postprocessing-vendor': ['@react-three/postprocessing', 'postprocessing'],
            }
          }
        }
      },
      plugins: [react(), siteUrlPlugin(env)],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
