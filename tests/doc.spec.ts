import { beforeAll, describe, expect, it } from 'vitest';
import { getEngine } from './helpers';
import { javascriptRules } from '../src/lexicon/js';
import { typescriptRules } from '../src/lexicon/ts/types.rules';
import type { LangId, Rule, SubtitleEngine } from '../src/engine/types';

// Doc-as-test : chaque exemple de chaque regle DOIT produire le sous-titre annonce
// (meme ruleId, meme texte). La doc du dictionnaire est sa propre suite de tests.
function runDocTests(label: string, lang: LangId, rules: readonly Rule[]): void {
  describe(`doc-as-test (${label})`, () => {
    let engine: SubtitleEngine;
    beforeAll(async () => {
      engine = await getEngine();
    });

    for (const rule of rules) {
      for (const ex of rule.doc.examples) {
        it(`[${rule.id}] ${ex.code}`, () => {
          const subs = engine.subtitle(ex.code, lang);
          const hit = subs.find((s) => s.ruleId === rule.id && s.text === ex.subtitle);
          const got = subs.map((s) => `${s.ruleId} :: ${s.text}`).join('\n  ') || '(aucun sous-titre)';
          expect(hit, `attendu [${rule.id}] "${ex.subtitle}"\nobtenu:\n  ${got}`).toBeDefined();
        });
      }
    }
  });
}

runDocTests('lexique JS', 'javascript', javascriptRules);
runDocTests('lexique TS', 'typescript', typescriptRules);
