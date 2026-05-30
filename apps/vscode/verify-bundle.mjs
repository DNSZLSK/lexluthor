// Bundle tools/bundle-check.ts avec LES MEMES options critiques que l'extension
// (CJS Node + fix import.meta.url + web-tree-sitter bundle), puis l'execute. C'est
// la seule facon de valider en CI le chemin WASM en condition bundlee.
import esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';

await esbuild.build({
  entryPoints: ['tools/bundle-check.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outfile: 'tools/bundle-check.cjs',
  logLevel: 'warning',
  define: { 'import.meta.url': '__lex_import_meta_url' },
  banner: { js: "const __lex_import_meta_url = require('url').pathToFileURL(__filename).href;" },
});

const r = spawnSync(process.execPath, ['tools/bundle-check.cjs'], { encoding: 'utf8' });
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
