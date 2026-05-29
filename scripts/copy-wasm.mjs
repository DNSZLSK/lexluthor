// Copie les binaires .wasm (moteur tree-sitter + grammaires) dans public/wasm/
// afin qu'ils soient servis statiquement par Vite -> 100% offline, aucun fetch reseau.
//
// Robuste a dessein : on CHERCHE les fichiers dans node_modules au lieu de coder en
// dur des chemins fragiles, et on n'echoue PAS l'install si un fichier manque
// (le smoke-test wasm-load.spec verifiera le chargement reel des 4 grammaires).

import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dest = join(root, 'public', 'wasm');
const nm = join(root, 'node_modules');

/** Cherche recursivement un fichier par nom exact, retourne le 1er chemin trouve. */
function findFile(startDir, fileName, maxDepth = 6) {
  if (!existsSync(startDir)) return null;
  const stack = [{ dir: startDir, depth: 0 }];
  while (stack.length) {
    const { dir, depth } = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isFile() && e.name === fileName) return full;
      if (e.isDirectory() && depth < maxDepth && e.name !== '.bin') {
        stack.push({ dir: full, depth: depth + 1 });
      }
    }
  }
  return null;
}

// Moteur : la paire js+wasm de web-tree-sitter (doivent venir du MEME paquet).
// Grammaires : @vscode/tree-sitter-wasm, build recent compatible avec le moteur 0.26.
const targets = [
  { from: join(nm, 'web-tree-sitter'), file: 'web-tree-sitter.wasm' },
  { from: join(nm, '@vscode', 'tree-sitter-wasm'), file: 'tree-sitter-javascript.wasm' },
  { from: join(nm, '@vscode', 'tree-sitter-wasm'), file: 'tree-sitter-typescript.wasm' },
  { from: join(nm, '@vscode', 'tree-sitter-wasm'), file: 'tree-sitter-tsx.wasm' },
  { from: join(nm, '@vscode', 'tree-sitter-wasm'), file: 'tree-sitter-java.wasm' },
];

mkdirSync(dest, { recursive: true });

let copied = 0;
const missing = [];
for (const { from, file } of targets) {
  const src = findFile(from, file);
  if (!src) {
    missing.push(file);
    continue;
  }
  const out = join(dest, file);
  copyFileSync(src, out);
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`[copy-wasm] ${file.padEnd(30)} ${String(kb).padStart(5)} Ko`);
  copied++;
}

console.log(`[copy-wasm] ${copied}/${targets.length} fichiers copies dans public/wasm/`);
if (missing.length) {
  console.warn(`[copy-wasm] MANQUANTS (a verifier) : ${missing.join(', ')}`);
}
