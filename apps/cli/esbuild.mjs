import esbuild from 'esbuild';

// CLI Node (CJS). On bundle @lexluthor/core + web-tree-sitter. Même fix que le host
// vscode : web-tree-sitter bundlé fait createRequire(import.meta.url) -> undefined en
// CJS, donc on remplace import.meta.url par une URL de fichier calculée. Shebang pour
// rendre le bin exécutable.
const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outfile: 'dist/cli.cjs',
  external: [],
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  define: { 'import.meta.url': '__lex_import_meta_url' },
  banner: {
    js: "#!/usr/bin/env node\nconst __lex_import_meta_url = require('url').pathToFileURL(__filename).href;",
  },
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
} else {
  await esbuild.build(config);
}
