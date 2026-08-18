import { defineConfig } from 'vite';

export default defineConfig({
  // The site is one hand-written HTML page; Vite is here for hashing,
  // minification and a dev server, not for a framework.
  build: {
    // Vite's own output goes to /build so it never collides with the
    // verbatim-copied /assets coming out of public/.
    assetsDir: 'build',
    cssMinify: true,
    // Nothing here is big enough to justify splitting.
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        entryFileNames: 'build/[name].[hash].js',
        chunkFileNames: 'build/[name].[hash].js',
        assetFileNames: 'build/[name].[hash][extname]',
      },
    },
  },
  server: { port: 8123, open: false },
  preview: { port: 8123 },
});
