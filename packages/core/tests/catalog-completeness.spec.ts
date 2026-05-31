import { beforeAll, describe, expect, it } from 'vitest';
import { buildEngine } from './helpers';
import { samples } from '../src/data/samples';
import { javascriptRules } from '../src/lexicon/js';
import { typescriptRules } from '../src/lexicon/ts/types.rules';
import { CATALOG_KEYS } from '../src/lexicon/catalog';
import type { LangId, SubtitleEngine } from '../src/engine/types';
import type { LocaleId, Message, Translator } from '../src/engine/message';

// Garde-fou CENTRAL : toute cle emise par le moteur DOIT exister en FR et EN (complets).
// ES est amorce (VO) : les trous sont listes comme dette connue, pas une erreur.
const FR = new Set(CATALOG_KEYS.fr);
const EN = new Set(CATALOG_KEYS.en);
const ES = new Set(CATALOG_KEYS.es);

const emitted = new Set<string>();
function recorder(locale: LocaleId): Translator {
  return { locale, has: () => true, render: (m: Message) => { emitted.add(m.key); return '.'; } };
}

function corpus(): ReadonlyArray<{ code: string; lang: LangId }> {
  const items: { code: string; lang: LangId }[] = samples.map((s) => ({ code: s.code, lang: s.lang }));
  for (const r of javascriptRules) for (const ex of r.doc.examples) items.push({ code: ex.code, lang: 'javascript' });
  for (const r of typescriptRules) for (const ex of r.doc.examples) items.push({ code: ex.code, lang: 'typescript' });
  return items;
}

describe('complétude des catalogues', () => {
  let engine: SubtitleEngine;
  beforeAll(async () => {
    engine = await buildEngine({ translators: { fr: recorder('fr'), en: recorder('en'), es: recorder('es') } });
    for (const { code, lang } of corpus()) engine.subtitle(code, lang);
  });

  it('FR et EN ont exactement le même ensemble de clés', () => {
    const onlyFr = [...FR].filter((k) => !EN.has(k));
    const onlyEn = [...EN].filter((k) => !FR.has(k));
    expect(onlyFr, `clés FR absentes de EN : ${onlyFr.join(', ')}`).toEqual([]);
    expect(onlyEn, `clés EN absentes de FR : ${onlyEn.join(', ')}`).toEqual([]);
  });

  it('toute clé émise par le moteur existe en FR et EN', () => {
    const missingFr = [...emitted].filter((k) => !FR.has(k));
    const missingEn = [...emitted].filter((k) => !EN.has(k));
    expect(missingFr, `clés émises absentes du catalogue FR : ${missingFr.join(', ')}`).toEqual([]);
    expect(missingEn, `clés émises absentes du catalogue EN : ${missingEn.join(', ')}`).toEqual([]);
  });

  it('les sous-catalogues (status/method/arrayPred) sont présents en FR et EN', () => {
    for (const k of ['http.status.404', 'http.method.get', 'cond.arrayPred.some']) {
      expect(FR.has(k), `FR manque ${k}`).toBe(true);
      expect(EN.has(k), `EN manque ${k}`).toBe(true);
    }
  });

  it('ES ne contient aucune clé étrangère (sous-ensemble de FR)', () => {
    const stray = [...ES].filter((k) => !FR.has(k));
    expect(stray, `clés ES inconnues : ${stray.join(', ')}`).toEqual([]);
  });

  it('ES : dette de traduction listée (informational, VO)', () => {
    const missingEs = [...FR].filter((k) => !ES.has(k));
    // Dette connue : ES amorce. On documente le reste a traduire sans faire echouer.
    expect(missingEs.length, `${missingEs.length} clés ES à traduire (VO en attendant)`).toBeGreaterThanOrEqual(0);
  });
});
