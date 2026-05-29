import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// @lexluthor/core est consommé en SOURCE (alias direct vers son index.ts) pour
// éviter une étape de build du coeur en dev. Les .wasm vivent dans public/wasm/
// (servis à /wasm/*.wasm). web-tree-sitter est exclu du pre-bundling (branches node).
export default defineConfig({
  resolve: {
    alias: {
      '@lexluthor/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
    },
  },
  build: { target: 'es2022' },
  optimizeDeps: { exclude: ['web-tree-sitter', '@lexluthor/core'] },
  worker: { format: 'es' },
});
