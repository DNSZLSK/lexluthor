import { beforeAll, describe, expect, it } from 'vitest';
import { getEngine } from './helpers';
import { javascriptRules } from '../src/lexicon/js';
import { typescriptRules } from '../src/lexicon/ts/types.rules';
import type { LangId, Rule, SubtitleEngine } from '../src/engine/types';
import type { LocaleId } from '../src/engine/message';

// Doc-as-test PAR LOCALE : chaque exemple porte une cle (intention) et des phrases
// attendues par locale. On verifie que le moteur produit, dans chaque locale, le bon
// ruleId et le bon texte. La cle stable est verifiee separement (render-key.spec).
const LOCALES: LocaleId[] = ['fr', 'en', 'es'];

function runDocTests(label: string, lang: LangId, rules: readonly Rule[]): void {
  describe(`doc-as-test (${label})`, () => {
    let engine: SubtitleEngine;
    beforeAll(async () => {
      engine = await getEngine();
    });

    for (const rule of rules) {
      for (const ex of rule.doc.examples) {
        for (const loc of LOCALES) {
          const expected = ex.expect[loc];
          if (expected == null) continue; // ES non traduit = VO : pas d'assertion
          it(`[${rule.id}] (${loc}) ${ex.code}`, () => {
            const subs = engine.subtitle(ex.code, lang, loc);
            const hit = subs.find((s) => s.ruleId === rule.id && s.text === expected);
            const got = subs.map((s) => `${s.ruleId} :: ${s.text}`).join('\n  ') || '(aucun sous-titre)';
            expect(hit, `attendu [${rule.id}] (${loc}) "${expected}"\nobtenu:\n  ${got}`).toBeDefined();
          });
        }
      }
    }
  });
}

runDocTests('lexique JS', 'javascript', javascriptRules);
runDocTests('lexique TS', 'typescript', typescriptRules);
