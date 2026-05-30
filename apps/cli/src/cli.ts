import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  analyzeCoverage,
  createEngine,
  createJavaScriptAdapter,
  createTypeScriptAdapter,
  emptyRepoReport,
  mergeReport,
  type LanguageAdapter,
  type SubtitleEngine,
} from '@lexluthor/core';
import { createNodeWasmProvider, loadGrammarFile } from './wasm-node-provider';
import { walk } from './scan';
import { printJson, printReport } from './report';

interface Flags {
  json: boolean;
  top: number;
  wasmDir?: string;
  maxBytes: number;
  maxLines: number;
}

function parseFlags(args: readonly string[]): Flags {
  const f: Flags = { json: false, top: 15, maxBytes: 512 * 1024, maxLines: 5000 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') f.json = true;
    else if (a === '--top') f.top = Math.max(1, Number(args[++i]) || 15);
    else if (a === '--max-bytes') f.maxBytes = Number(args[++i]) || f.maxBytes;
    else if (a === '--max-lines') f.maxLines = Number(args[++i]) || f.maxLines;
    else if (a === '--wasm-dir') {
      const v = args[++i];
      if (v) f.wasmDir = v;
    }
  }
  return f;
}

function resolveWasmDir(flag: string | undefined): string {
  const candidates = [
    flag,
    process.env['LEXLUTHOR_WASM_DIR'],
    join(__dirname, '..', '..', '..', 'packages', 'core', 'wasm'), // dist/ -> repo/packages/core/wasm
    join(__dirname, 'wasm'),
  ].filter((x): x is string => Boolean(x));
  for (const c of candidates) if (existsSync(join(c, 'web-tree-sitter.wasm'))) return c;
  throw new Error(
    `[lexluthor] WASM introuvable. Chemins tentés :\n${candidates.map((c) => '  ' + c).join('\n')}\n` +
      'Indique --wasm-dir <chemin> ou la variable LEXLUTHOR_WASM_DIR.',
  );
}

const USAGE = `lexluthor — sous-titreur de code (mode curation)

Usage :
  lexluthor scan <dossier> [options]

Options :
  --json              sortie JSON (clés stables)
  --top <N>           taille des listes (défaut 15)
  --wasm-dir <chemin> dossier des grammaires .wasm
  --max-bytes <N>     ignore les fichiers plus gros (défaut 524288)
  --max-lines <N>     ignore les fichiers plus longs (défaut 5000)

Le scan fait tourner le moteur DÉTERMINISTE en diagnostic et classe, par impact,
ce qu'il faut ajouter au dictionnaire (mots, verbes, règles). Aucune IA, offline.`;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv[0] !== 'scan') {
    process.stdout.write(USAGE + '\n');
    process.exit(argv[0] ? 1 : 0);
  }
  const dirArg = argv[1];
  if (!dirArg || dirArg.startsWith('--')) {
    process.stdout.write(USAGE + '\n');
    process.exit(1);
  }
  const flags = parseFlags(argv.slice(2));
  const wasmDir = resolveWasmDir(flags.wasmDir);
  const dir = resolve(dirArg);

  const provider = createNodeWasmProvider(wasmDir);
  await provider.initEngine();
  const [jsLang, tsLang] = await Promise.all([
    provider.loadGrammar('javascript'),
    provider.loadGrammar('typescript'),
  ]);
  const tsxLang = await loadGrammarFile(wasmDir, 'tree-sitter-tsx.wasm');

  const jsAdapter = createJavaScriptAdapter(jsLang);
  const tsAdapter = createTypeScriptAdapter(tsLang);
  const tsxAdapter = createTypeScriptAdapter(tsxLang); // le lexique TS lit aussi le TSX

  const sel: Record<'js' | 'ts' | 'tsx', { adapter: LanguageAdapter; engine: SubtitleEngine }> = {
    js: { adapter: jsAdapter, engine: createEngine({ javascript: jsAdapter }) },
    ts: { adapter: tsAdapter, engine: createEngine({ typescript: tsAdapter }) },
    tsx: { adapter: tsxAdapter, engine: createEngine({ typescript: tsxAdapter }) },
  };
  const pick = (ext: string) => (ext === '.ts' ? sel.ts : ext === '.tsx' ? sel.tsx : sel.js);

  const repo = emptyRepoReport();
  let skipped = 0;
  for await (const f of walk(dir, { maxBytes: flags.maxBytes, maxLines: flags.maxLines })) {
    const s = pick(f.ext);
    try {
      mergeReport(repo, analyzeCoverage(s.adapter, s.engine, f.code));
    } catch {
      skipped += 1; // fichier qui casse le moteur -> on saute, jamais d'abandon
    }
  }

  if (flags.json) printJson(repo, flags.top);
  else printReport(repo, { dir, scanned: repo.files, skipped, top: flags.top });
}

main().catch((err: unknown) => {
  process.stderr.write((err instanceof Error ? err.message : String(err)) + '\n');
  process.exit(1);
});
