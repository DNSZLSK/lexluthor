import { beforeAll, describe, expect, it } from 'vitest';
import { loadLanguage } from './helpers';
import { createTypeScriptAdapter } from '../src/adapters/typescript';
import { createEngine } from '../src/engine/engine';
import { analyzeCoverage, emptyRepoReport, mergeReport, topN } from '../src/diagnostics/coverage';
import { isCodeRecopied } from '../src/diagnostics/recopy';
import type { LanguageAdapter, SubtitleEngine } from '../src/engine/types';

let adapter: LanguageAdapter;
let engine: SubtitleEngine;
beforeAll(async () => {
  const lang = await loadLanguage('typescript');
  adapter = createTypeScriptAdapter(lang);
  engine = createEngine({ typescript: adapter });
});

const report = (code: string) => analyzeCoverage(adapter, engine, code);

describe('analyzeCoverage : classement des instructions', () => {
  it('littéral court -> rich', () => {
    const r = report('const port = 3000;');
    expect(r.statements).toBe(1);
    expect(r.counts.rich).toBe(1);
  });

  it('ternaire -> shape (phrase de forme)', () => {
    expect(report('const x = a ? b : c;').counts.shape).toBe(1);
  });

  it('chaînage de méthodes -> recopied', () => {
    const r = report("const t = s.replace(/x/g, ' ').trim();");
    expect(r.counts.recopied).toBe(1);
    expect(Object.keys(r.recopied).length).toBeGreaterThan(0);
  });

  it('appel inconnu -> silent + uncoveredTypes', () => {
    const r = report('doStuff();');
    expect(r.counts.silent).toBe(1);
    expect(r.uncoveredTypes['expression_statement']).toBe(1);
  });
});

describe('analyzeCoverage : cibles de curation', () => {
  it('fonction sans verbe connu -> missingVerbs (1er mot)', () => {
    expect(report('function frobnicate() {}').missingVerbs['frobnicate']).toBe(1);
  });

  it('const = fonction fléchée sans verbe -> missingVerbs', () => {
    expect(report('const dispatchThing = () => 1;').missingVerbs['dispatch']).toBe(1);
  });

  it('mots non glosés -> unknownWords', () => {
    const r = report('const widgetThing = 1;');
    expect(r.unknownWords['widget']).toBe(1);
    expect(r.unknownWords['thing']).toBe(1);
  });

  it('mot glosé ou verbe connu -> jamais signalé', () => {
    const r = report('const userAdapter = makeIt();'); // user+adapter glosés
    expect(r.unknownWords['user']).toBeUndefined();
    expect(r.unknownWords['adapter']).toBeUndefined();
  });
});

describe('isCodeRecopied', () => {
  it('vrai sur du code', () => {
    expect(isCodeRecopied('On renvoie a => b')).toBe(true);
    expect(isCodeRecopied('On définit x à a === b')).toBe(true);
    expect(isCodeRecopied("On définit t à s.replace(/x/g, ' ').trim()")).toBe(true);
  });
  it('faux sur du français (dont la flèche unicode →)', () => {
    expect(isCodeRecopied('On crée un stockage en mémoire (clé → valeur)')).toBe(false);
    expect(isCodeRecopied('On définit le port à 3000')).toBe(false);
    expect(isCodeRecopied('On récupère la fabrique pour ce langage')).toBe(false);
  });
});

describe('agrégation (mergeReport / topN)', () => {
  it('mergeReport somme les compteurs et les fréquences', () => {
    const acc = emptyRepoReport();
    mergeReport(acc, report('const widgetThing = 1;'));
    mergeReport(acc, report('const widgetBox = 2;'));
    expect(acc.files).toBe(2);
    expect(acc.statements).toBe(2);
    expect(acc.unknownWords['widget']).toBe(2);
    expect(acc.byLang['typescript']?.files).toBe(2);
  });

  it('topN trie par fréquence décroissante puis clé croissante', () => {
    expect(topN({ a: 1, c: 3, b: 3 }, 2)).toEqual([
      { key: 'b', count: 3 },
      { key: 'c', count: 3 },
    ]);
  });
});
