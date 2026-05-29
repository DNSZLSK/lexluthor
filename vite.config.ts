import { defineConfig } from 'vite';

// Les .wasm vivent dans public/wasm/ et sont servis tels quels a /wasm/*.wasm
// (aucun fetch reseau externe -> 100% offline). web-tree-sitter est exclu du
// pre-bundling : son glue emscripten contient des branches node (fs/path) qui
// ne doivent pas etre resolues pour le navigateur.
export default defineConfig({
  build: { target: 'es2022' },
  optimizeDeps: { exclude: ['web-tree-sitter'] },
  worker: { format: 'es' },
});
