import { beforeAll, describe, expect, it } from 'vitest';
import { getEngine } from './helpers';
import { samples } from '../src/data/samples';
import { javascriptRules } from '../src/lexicon/js';
import { typescriptRules } from '../src/lexicon/ts/types.rules';
import { isCodeRecopied } from '../src/diagnostics/recopy';
import type { LangId, SubtitleEngine } from '../src/engine/types';
import type { LocaleId } from '../src/engine/message';

// Garde-fou outille du mantra "intention, pas syntaxe" : aucune phrase de catalogue
// (via les exemples) ne doit re-decrire la syntaxe. Banni PAR LOCALE.
const BANNED: Record<LocaleId, string[]> = {
  fr: ['fonction fléchée', 'ternaire', 'callback', 'littéral', 'instruction', 'paramètre formel', 'opérateur'],
  en: ['arrow function', 'ternary', 'callback', 'literal', 'statement', 'operator'],
  es: ['función flecha', 'ternario', 'literal', 'sentencia', 'operador'],
};
const MAX_LEN = 90;
const LOCALES: LocaleId[] = ['fr', 'en', 'es'];

describe('style du lexique (intention, pas syntaxe) — par locale', () => {
  for (const rule of [...javascriptRules, ...typescriptRules]) {
    for (const ex of rule.doc.examples) {
      for (const loc of LOCALES) {
        const phrase = ex.expect[loc];
        if (phrase == null) continue;
        it(`[${rule.id}] (${loc}) "${phrase}"`, () => {
          expect(phrase.trim().length, 'sous-titre vide').toBeGreaterThan(0);
          expect(phrase.length, 'sous-titre trop long').toBeLessThanOrEqual(MAX_LEN);
          const lower = phrase.toLowerCase();
          for (const word of BANNED[loc]) {
            expect(lower.includes(word), `jargon syntaxique interdit (${loc}) : "${word}"`).toBe(false);
          }
          // commence par une majuscule (accents FR/ES inclus via À-Ý) ou le marqueur d'alerte
          expect(/^[A-ZÀ-Ý⚠]/.test(phrase.trim()), 'doit commencer par une majuscule ou ⚠').toBe(true);
        });
      }
    }
  }
});

// Garde anti-recopie : sur la VRAIE sortie du moteur (samples + tous les codes des
// doc.examples), en FR et EN, aucun sous-titre ne doit etre multi-ligne, surdimensionne,
// ou contenir du code recopie.
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

  it('aucun sous-titre multi-ligne, surdimensionné, ou contenant du code recopié (fr/en)', () => {
    for (const loc of ['fr', 'en'] as LocaleId[]) {
      for (const { code, lang } of corpus()) {
        for (const s of engine.subtitle(code, lang, loc)) {
          if (s.severity === 'alert') continue; // les alertes citent volontairement le code suspect
          expect(s.text.includes('\n'), `[${loc}] saut de ligne dans : "${s.text}"`).toBe(false);
          expect(s.text.length, `[${loc}] sous-titre trop long : "${s.text}"`).toBeLessThanOrEqual(MAX_LEN);
          expect(isCodeRecopied(s.text), `[${loc}] code recopié dans : "${s.text}"`).toBe(false);
        }
      }
    }
  });
});
