import { describe, expect, it } from 'vitest';
import { javascriptRules } from '../src/lexicon/js';

// Garde-fou outille du mantra "intention, pas syntaxe" : aucun sous-titre ne doit
// re-decrire la syntaxe. On scanne les phrases de reference de chaque regle.
const BANNED = ['fonction fléchée', 'ternaire', 'callback', 'littéral', 'instruction', 'paramètre formel', 'opérateur'];
const MAX_LEN = 90;

describe('style du lexique (intention, pas syntaxe)', () => {
  for (const rule of javascriptRules) {
    for (const ex of rule.doc.examples) {
      const phrase = ex.subtitle;
      it(`[${rule.id}] "${phrase}"`, () => {
        expect(phrase.trim().length, 'sous-titre vide').toBeGreaterThan(0);
        expect(phrase.length, 'sous-titre trop long').toBeLessThanOrEqual(MAX_LEN);
        const lower = phrase.toLowerCase();
        for (const word of BANNED) {
          expect(lower.includes(word), `jargon syntaxique interdit : "${word}"`).toBe(false);
        }
        // commence par une majuscule, "On"/"Si"/… ou le marqueur d'alerte
        expect(/^[A-ZÀ-Ý⚠]/.test(phrase.trim()), 'doit commencer par une majuscule ou ⚠').toBe(true);
      });
    }
  }
});
