import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  // Unusual names so no local variable (h, H, Fragment…) can ever shadow the JSX factory.
  esbuild: { jsxFactory: '__jsxH', jsxFragment: '__jsxFrag', jsxInject: `import { h as __jsxH, Fragment as __jsxFrag } from 'preact'` },
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000, assetsInlineLimit: 0 },
});
