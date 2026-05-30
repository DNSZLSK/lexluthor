import { beforeAll, describe, expect, it } from 'vitest';
import { getEngine } from './helpers';
import { samples } from '../src/data/samples';
import { javascriptRules } from '../src/lexicon/js';
import { typescriptRules } from '../src/lexicon/ts/types.rules';
import type { LangId, SubtitleEngine } from '../src/engine/types';

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

// Garde anti-recopie : sur la VRAIE sortie du moteur (samples + tous les codes des
// doc.examples), aucun sous-titre ne doit etre multi-ligne, surdimensionne, ou
// contenir une fleche de fonction recopiee (=>). Attrape toute regression "code
// recopie" dans un sous-titre (ternaires/templates/arrows dumpes).
describe('garde anti-recopie (sortie réelle du moteur)', () => {
  let engine: SubtitleEngine;
  beforeAll(async () => {
    engine = await getEngine();
  });

  function corpus(): ReadonlyArray<{ code: string; lang: LangId }> {
    const items: { code: string; lang: LangId }[] = samples.map((s) => ({ code: s.code, lang: s.lang }));
    for (const r of javascriptRules) for (const ex of r.doc.examples) items.push({ code: ex.code, lang: 'javascript' });
    for (const r of typescriptRules) for (const ex of r.doc.examples) items.push({ code: ex.code, lang: 'typescript' });
    return items;
  }

  it('aucun sous-titre multi-ligne, surdimensionné, ou contenant une flèche recopiée', () => {
    for (const { code, lang } of corpus()) {
      for (const s of engine.subtitle(code, lang)) {
        expect(s.text.includes('\n'), `saut de ligne dans : "${s.text}"`).toBe(false);
        expect(s.text.length, `sous-titre trop long : "${s.text}"`).toBeLessThanOrEqual(MAX_LEN);
        expect(s.text.includes('=>'), `flèche de code recopiée dans : "${s.text}"`).toBe(false);
      }
    }
  });
});
