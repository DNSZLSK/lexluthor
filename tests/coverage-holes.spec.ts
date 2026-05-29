import { Parser } from 'web-tree-sitter';
import { describe, expect, it } from 'vitest';
import { getEngine, loadLanguage } from './helpers';
import { samples } from '../src/data/samples';

// Mode diagnostic : sur le corpus, quels TYPES de noeuds en position d'instruction
// ne recoivent jamais de sous-titre ? Cette liste pilote l'extension du dictionnaire.
// Le test echoue si un trou NOUVEAU apparait (hors liste connue) -> "no silent caps".
const STATEMENT_PARENTS = new Set(['program', 'statement_block']);

// Trous assumes en v1 (a sous-titrer plus tard) : appels nus comme users.set(),
// app.use(), install() -> expression_statement sans idiome reconnu.
const KNOWN_UNCOVERED = new Set(['expression_statement']);

describe('coverage-holes (diagnostic)', () => {
  it('aucun type de statement non couvert hors liste connue (corpus JS)', async () => {
    const engine = await getEngine();
    const language = await loadLanguage('javascript');
    const parser = new Parser();
    parser.setLanguage(language);

    const holes = new Set<string>();
    for (const sample of samples.filter((s) => s.lang === 'javascript')) {
      const tree = parser.parse(sample.code);
      if (!tree) continue;
      const subs = engine.subtitle(sample.code, sample.lang);

      const stack = [tree.rootNode];
      while (stack.length) {
        const node = stack.pop()!;
        for (let i = 0; i < node.namedChildCount; i++) {
          const c = node.namedChild(i);
          if (c) stack.push(c);
        }
        const parent = node.parent;
        if (parent && STATEMENT_PARENTS.has(parent.type)) {
          const anchored = subs.some(
            (s) => s.range.startIndex >= node.startIndex && s.range.startIndex < node.endIndex,
          );
          if (!anchored) holes.add(node.type);
        }
      }
    }

    const realHoles = [...holes].filter((t) => !KNOWN_UNCOVERED.has(t));
    if (realHoles.length) console.info('[coverage-holes] backlog dictionnaire :', realHoles.join(', '));
    expect(realHoles, `types de statements non couverts : ${realHoles.join(', ')}`).toEqual([]);
  });
});
