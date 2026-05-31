import { beforeAll, describe, expect, it } from 'vitest';
import { buildEngine } from './helpers';
import { javascriptRules } from '../src/lexicon/js';
import { typescriptRules } from '../src/lexicon/ts/types.rules';
import type { LangId, Rule, SubtitleEngine } from '../src/engine/types';
import type { LocaleId, Message, Translator } from '../src/engine/message';

// Separe l'INTENTION (la cle, stable) de la TRADUCTION (variable). Un translator espion
// retourne le Message brut (JSON) au lieu d'une phrase -> on verifie ruleId + cle (+ params)
// produits par render, independamment de toute langue.
function spy(locale: LocaleId): Translator {
  return { locale, has: () => true, render: (m: Message) => JSON.stringify({ key: m.key, params: m.params ?? {} }) };
}

function runKeyTests(label: string, lang: LangId, rules: readonly Rule[]): void {
  describe(`render-key (${label})`, () => {
    let engine: SubtitleEngine;
    beforeAll(async () => {
      engine = await buildEngine({ translators: { fr: spy('fr'), en: spy('en'), es: spy('es') } });
    });

    for (const rule of rules) {
      for (const ex of rule.doc.examples) {
        it(`[${rule.id}] ${ex.code} -> ${ex.key}`, () => {
          const subs = engine.subtitle(ex.code, lang);
          const hit = subs.find((s) => s.ruleId === rule.id);
          const got = subs.map((s) => `${s.ruleId} :: ${s.text}`).join('\n  ') || '(aucun)';
          expect(hit, `aucun sous-titre [${rule.id}] pour ${ex.code}\nobtenu:\n  ${got}`).toBeDefined();
          const parsed = JSON.parse(hit!.text) as { key: string; params: Record<string, unknown> };
          expect(parsed.key, `cle attendue "${ex.key}"`).toBe(ex.key);
          if (ex.params) {
            for (const [k, v] of Object.entries(ex.params)) {
              expect(parsed.params[k], `param ${k}`).toBe(v);
            }
          }
        });
      }
    }
  });
}

runKeyTests('lexique JS', 'javascript', javascriptRules);
runKeyTests('lexique TS', 'typescript', typescriptRules);
