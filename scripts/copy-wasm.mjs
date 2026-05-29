// Copie les binaires .wasm (moteur tree-sitter + grammaires) vers les emplacements
// consommés par chaque workspace -> 100% offline, aucun fetch reseau.
//  - packages/core/wasm/      : pour les tests Node du coeur (helpers.ts).
//  - apps/web/public/wasm/     : servis statiquement par Vite (/wasm/*.wasm).
// (L'extension VS Code aura son propre media/wasm/, copie ajoutee quand elle existe.)
//
// Robuste a dessein : on CHERCHE les fichiers dans node_modules (hoiste a la racine
// du monorepo) au lieu de coder en dur des chemins fragiles, et on n'echoue PAS
// l'install si un fichier manque (les smoke-tests verifient le chargement reel).

import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const nm = join(root, 'node_modules');

const dests = [
  join(root, 'packages', 'core', 'wasm'),
  join(root, 'apps', 'web', 'public', 'wasm'),
];

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

// Moteur : la paire js+wasm de web-tree-sitter. Grammaires : @vscode/tree-sitter-wasm
// (build recent compatible ABI avec le moteur 0.26).
const targets = [
  { from: join(nm, 'web-tree-sitter'), file: 'web-tree-sitter.wasm' },
  { from: join(nm, '@vscode', 'tree-sitter-wasm'), file: 'tree-sitter-javascript.wasm' },
  { from: join(nm, '@vscode', 'tree-sitter-wasm'), file: 'tree-sitter-typescript.wasm' },
  { from: join(nm, '@vscode', 'tree-sitter-wasm'), file: 'tree-sitter-tsx.wasm' },
  { from: join(nm, '@vscode', 'tree-sitter-wasm'), file: 'tree-sitter-java.wasm' },
];

for (const dest of dests) mkdirSync(dest, { recursive: true });

let copied = 0;
const missing = [];
for (const { from, file } of targets) {
  const src = findFile(from, file);
  if (!src) {
    missing.push(file);
    continue;
  }
  let kb = 0;
  for (const dest of dests) {
    const out = join(dest, file);
    copyFileSync(src, out);
    kb = Math.round(statSync(out).size / 1024);
  }
  console.log(`[copy-wasm] ${file.padEnd(30)} ${String(kb).padStart(5)} Ko`);
  copied++;
}

console.log(`[copy-wasm] ${copied}/${targets.length} fichiers copies vers ${dests.length} emplacements`);
if (missing.length) {
  console.warn(`[copy-wasm] MANQUANTS (a verifier) : ${missing.join(', ')}`);
}
