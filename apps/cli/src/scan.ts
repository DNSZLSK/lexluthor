import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

// Dossiers jamais utiles à scanner (artefacts, deps, sorties).
const EXCLUDE_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', 'public', 'wasm', 'media',
  'target', 'bin', 'obj', '.cache', '.turbo',
]);
const INCLUDE_EXT = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);

export interface WalkOptions {
  readonly maxBytes: number;
  readonly maxLines: number;
}

export interface ScanFile {
  readonly path: string;
  readonly ext: string;
  readonly code: string;
}

/** Marche récursive bornée : fichiers JS/TS lisibles, hors deps/artefacts/symlinks. */
export async function* walk(root: string, opts: WalkOptions): AsyncGenerator<ScanFile> {
  const visited = new Set<string>();

  async function* rec(dir: string): AsyncGenerator<ScanFile> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // dossier illisible (permissions) -> on saute
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isSymbolicLink()) continue; // pas de symlinks (boucles)
      if (e.isDirectory()) {
        if (EXCLUDE_DIRS.has(e.name) || e.name.startsWith('.')) continue;
        let rp: string;
        try {
          rp = await realpath(full);
        } catch {
          continue;
        }
        if (visited.has(rp)) continue;
        visited.add(rp);
        yield* rec(full);
      } else if (e.isFile()) {
        const ext = extname(e.name);
        if (!INCLUDE_EXT.has(ext) || e.name.endsWith('.d.ts')) continue;
        let size: number;
        try {
          size = (await stat(full)).size;
        } catch {
          continue;
        }
        if (size > opts.maxBytes) continue;
        let code: string;
        try {
          code = await readFile(full, 'utf8');
        } catch {
          continue;
        }
        const lines = code.split('\n').length;
        if (lines > opts.maxLines) continue;
        if (code.length / Math.max(lines, 1) > 2000) continue; // minifié -> on saute
        yield { path: full, ext, code };
      }
    }
  }

  yield* rec(root);
}
