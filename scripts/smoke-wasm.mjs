// Smoke-test ABI : charge le moteur + les 4 grammaires et parse un snippet dans
// chacune. Si l'ABI des .wasm (construits avec tree-sitter-cli 0.20.x) etait
// incompatible avec web-tree-sitter 0.26, Language.load echouerait ICI -- avant
// qu'on ecrive la moindre regle. C'est le verrou bloquant F3 du plan.

import { Parser, Language, Query } from 'web-tree-sitter';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const wasmDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'wasm');

await Parser.init();
console.log('[smoke] moteur web-tree-sitter initialise');

const cases = [
  { lang: 'javascript', file: 'tree-sitter-javascript.wasm', code: "const x = require('express');" },
  { lang: 'typescript', file: 'tree-sitter-typescript.wasm', code: 'function f(a: number): string { return String(a); }' },
  { lang: 'tsx',        file: 'tree-sitter-tsx.wasm',        code: 'const C = () => <div className="x">hi</div>;' },
  { lang: 'java',       file: 'tree-sitter-java.wasm',       code: 'class A { void m() { System.out.println("hi"); } }' },
];

let ok = 0;
for (const c of cases) {
  const lang = await Language.load(join(wasmDir, c.file));
  const parser = new Parser();
  parser.setLanguage(lang);
  const tree = parser.parse(c.code);
  const root = tree.rootNode;
  const errs = root.descendantsOfType('ERROR').length;
  console.log(`[smoke] ${c.lang.padEnd(11)} ABI=${lang.abiVersion}  racine=${root.type}  erreurs=${errs}`);
  if (root && errs === 0) ok++;
}

// Bonus : verifier qu'une QUERY S-expr (le futur DSL du lexique) fonctionne.
const js = await Language.load(join(wasmDir, 'tree-sitter-javascript.wasm'));
const p = new Parser();
p.setLanguage(js);
const tree = p.parse("const x = require('express');");
const q = new Query(js, '(call_expression function: (identifier) @fn (#eq? @fn "require") arguments: (arguments (string) @mod))');
const matches = q.matches(tree.rootNode);
const mod = matches[0]?.captures.find((c) => c.name === 'mod')?.node.text;
console.log(`[smoke] query require -> module capture = ${mod}`);

console.log(`\n[smoke] RESULTAT : ${ok}/${cases.length} grammaires chargees+parsees sans erreur, query=${mod ? 'OK' : 'KO'}`);
process.exit(ok === cases.length && mod ? 0 : 1);
