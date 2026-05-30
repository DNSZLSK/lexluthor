import esbuild from 'esbuild';

// Deux bundles :
//  1) HOST : l'extension (CJS Node, vscode externe). web-tree-sitter bundlé ; fix
//     import.meta.url (createRequire(undefined) sinon -> throw).
//  2) WEBVIEW : le lecteur VOSTFR (navigateur, ESM). Bundle core + reader + Shiki +
//     web-tree-sitter(navigateur). Les .wasm sont chargés au runtime par URL (pas bundlés).
const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const host = {
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
  define: { 'import.meta.url': '__lex_import_meta_url' },
  banner: { js: "const __lex_import_meta_url = require('url').pathToFileURL(__filename).href;" },
};

const webview = {
  entryPoints: ['webview/main.ts'],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  outfile: 'media/webview/reader.js',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  // web-tree-sitter contient des branches Node (import dynamique de fs/module…)
  // jamais exécutées en navigateur. On les externalise (comme Vite le fait) pour
  // que le bundle navigateur se construise ; ces imports ne sont jamais atteints.
  external: [
    'fs', 'fs/promises', 'path', 'module', 'url', 'crypto', 'os', 'worker_threads', 'perf_hooks', 'v8',
    'node:fs', 'node:fs/promises', 'node:path', 'node:module', 'node:url', 'node:crypto', 'node:os',
  ],
};

if (watch) {
  const hc = await esbuild.context(host);
  const wc = await esbuild.context(webview);
  await Promise.all([hc.watch(), wc.watch()]);
} else {
  await esbuild.build(host);
  await esbuild.build(webview);
}
