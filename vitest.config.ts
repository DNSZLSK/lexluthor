import { defineConfig } from 'vitest/config';

// Le coeur (engine + lexicon + adapters) tourne en Node : web-tree-sitter cible
// navigateur ET Node, donc pas besoin de jsdom. interleave est pur (teste sans DOM).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    testTimeout: 20000,
  },
});
