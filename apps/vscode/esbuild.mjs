import esbuild from 'esbuild';

// Bundle l'extension (TS + @lexluthor/core en source + web-tree-sitter) en un
// seul CJS pour l'extension host Node. `vscode` reste externe (fourni par l'hôte).
const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

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
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
