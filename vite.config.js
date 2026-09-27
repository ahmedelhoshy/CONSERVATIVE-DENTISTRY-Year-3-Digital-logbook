import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  esbuild: { jsxFactory: 'h', jsxFragment: 'Fragment', jsxInject: `import { h, Fragment } from 'preact'` },
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000, assetsInlineLimit: 0 },
});
