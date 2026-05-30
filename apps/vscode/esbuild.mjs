import esbuild from 'esbuild';

// Bundle l'extension (TS + @lexluthor/core en source + web-tree-sitter) en un
// seul CJS pour l'extension host Node. `vscode` reste externe (fourni par l'hôte).
const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// web-tree-sitter (glue emscripten) appelle createRequire(import.meta.url). En CJS
// bundle, import.meta.url vaut undefined -> createRequire(undefined) jette
// ("filename must be ... Received undefined"). On le redefinit vers le fichier du
// bundle (valide en Node), ce qui debloque l'init du moteur WASM.
const FIX_IMPORT_META = {
  define: { 'import.meta.url': '__lex_import_meta_url' },
  banner: { js: "const __lex_import_meta_url = require('url').pathToFileURL(__filename).href;" },
};

const ctx = await esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outfile: 'dist/extension.cjs',
  external: ['vscode'],
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  ...FIX_IMPORT_META,
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
