import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import {
  analyzeCoverage,
  createEngine,
  createJavaScriptAdapter,
  createTypeScriptAdapter,
  emptyRepoReport,
  mergeReport,
  type LangId,
  type LanguageAdapter,
  type LocaleId,
  type SubtitleEngine,
} from '@lexluthor/core';
import { createNodeWasmProvider, loadGrammarFile } from './wasm-node-provider';
import { walk } from './scan';
import { printJson, printReport } from './report';
import { renderRead } from './read-view';

interface Flags {
  json: boolean;
  top: number;
  wasmDir?: string;
  maxBytes: number;
  maxLines: number;
  locale: LocaleId;
}

function parseFlags(args: readonly string[]): Flags {
  const f: Flags = { json: false, top: 15, maxBytes: 512 * 1024, maxLines: 5000, locale: 'fr' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') f.json = true;
    else if (a === '--top') f.top = Math.max(1, Number(args[++i]) || 15);
    else if (a === '--max-bytes') f.maxBytes = Number(args[++i]) || f.maxBytes;
    else if (a === '--max-lines') f.maxLines = Number(args[++i]) || f.maxLines;
    else if (a === '--locale') {
      const v = args[++i];
      if (v === 'fr' || v === 'en' || v === 'es') f.locale = v;
    } else if (a === '--wasm-dir') {
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

const USAGE = `lexluthor — sous-titreur de code déterministe (VOSTFR du code)

Usage :
  lexluthor read <fichier> [--locale fr|en|es]   lit un fichier : code + sous-titres entrelacés
  lexluthor scan <dossier> [options]             diagnostic de couverture (curation)

Options :
  --locale fr|en|es   langue des sous-titres (défaut fr)
  --json              scan : sortie JSON (clés stables)
  --top <N>           scan : taille des listes (défaut 15)
  --wasm-dir <chemin> dossier des grammaires .wasm
  --max-bytes <N>     scan : ignore les fichiers plus gros (défaut 524288)
  --max-lines <N>     scan : ignore les fichiers plus longs (défaut 5000)

Moteur DÉTERMINISTE, offline, sans IA.`;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (cmd !== 'scan' && cmd !== 'read') {
    process.stdout.write(USAGE + '\n');
    process.exit(cmd ? 1 : 0);
  }
  const targetArg = argv[1];
  if (!targetArg || targetArg.startsWith('--')) {
    process.stdout.write(USAGE + '\n');
    process.exit(1);
  }
  const flags = parseFlags(argv.slice(2));
  const wasmDir = resolveWasmDir(flags.wasmDir);

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

  if (cmd === 'read') {
    const file = resolve(targetArg);
    const ext = extname(file);
    const lang: LangId = ext === '.ts' || ext === '.tsx' ? 'typescript' : 'javascript';
    const code = readFileSync(file, 'utf8');
    const subs = pick(ext).engine.subtitle(code, lang, flags.locale);
    process.stdout.write(renderRead(code, subs, { file: targetArg, locale: flags.locale }));
    return;
  }

  const dir = resolve(targetArg);
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
