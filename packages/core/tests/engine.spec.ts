import { beforeAll, describe, expect, it } from 'vitest';
import { getEngine } from './helpers';
import { javascriptRules } from '../src/lexicon/js';
import { samples } from '../src/data/samples';
import type { Subtitle, SubtitleEngine } from '../src/engine/types';

const claimOf = new Map(javascriptRules.map((r) => [r.id, r.claims ?? 'subtree']));

function strictlyContains(a: Subtitle, b: Subtitle): boolean {
  const outer = a.range.startIndex <= b.range.startIndex && b.range.endIndex <= a.range.endIndex;
  const equal = a.range.startIndex === b.range.startIndex && a.range.endIndex === b.range.endIndex;
  return outer && !equal;
}

describe('moteur de sous-titrage', () => {
  let engine: SubtitleEngine;
  beforeAll(async () => {
    engine = await getEngine();
  });

  it('sous-titre la demo Express avec les phrases cles', () => {
    const code = samples.find((s) => s.id === 'express')!.code;
    const texts = engine.subtitle(code, 'javascript').map((s) => s.text);
    for (const expected of [
      'On importe le module express',
      'Quand on reçoit une requête GET (lecture) sur /users/:id',
      "Si user n'existe pas :",
      'On répond : pas trouvé (404)',
      'On renvoie les données au format JSON',
      'On récupère name, email d\'un objet',
      'On répond : créé (201)',
      'On démarre le serveur sur le port 3000',
      'On affiche un message dans la console',
    ]) {
      expect(texts, `manquant: "${expected}"\nobtenu:\n${texts.join('\n')}`).toContain(expected);
    }
  });

  it('invariant anti-double-sous-titrage : containment uniquement pour les regles "header"', () => {
    for (const sample of samples) {
      const subs = engine.subtitle(sample.code, sample.lang);
      for (const a of subs) {
        for (const b of subs) {
          if (a === b) continue;
          if (strictlyContains(a, b)) {
            expect(
              claimOf.get(a.ruleId),
              `[${sample.id}] "${a.text}" (${a.ruleId}) contient "${b.text}" mais ne reclame pas un en-tete`,
            ).toBe('header');
          }
        }
      }
      // aucun doublon exact de plage
      const seen = new Set<string>();
      for (const s of subs) {
        const key = `${s.range.startIndex}:${s.range.endIndex}`;
        expect(seen.has(key), `[${sample.id}] doublon de plage pour "${s.text}"`).toBe(false);
        seen.add(key);
      }
    }
  });

  it('leve des alertes rouges sur le package suspect', () => {
    const code = samples.find((s) => s.id === 'suspicious')!.code;
    const subs = engine.subtitle(code, 'javascript');
    const alerts = subs.filter((s) => s.severity === 'alert').map((s) => s.text);
    expect(alerts.some((t) => t.includes('child_process'))).toBe(true);
    expect(alerts.some((t) => t.includes('base64'))).toBe(true);
    expect(alerts.some((t) => t.includes('eval'))).toBe(true);
  });

  it('ne devine jamais : du code non couvert ne produit aucun sous-titre', () => {
    const subs = engine.subtitle('zorglub.frobnicate(42);', 'javascript');
    expect(subs).toHaveLength(0);
  });
});
