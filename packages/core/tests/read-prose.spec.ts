// Regression du reader FR : accord en nombre des groupes nominaux. Teste les
// helpers de prose directement (sans moteur), via makeFrHelpers.
import { describe, expect, it } from 'vitest';
import { makeFrHelpers } from '../src/read/locale/fr/prose';

const h = makeFrHelpers(() => '');

describe('reader FR : accord en nombre', () => {
  it('ne double pas le -s d\'un mot déjà pluriel (« kpis », pas « kpiss »)', () => {
    expect(h.nounPhrase('feed kpis', 'def')).toBe('les kpis de feed');
  });

  it('rend un nom intrinsèquement pluriel avec « des » en indéfini (« des paramètres », pas « un paramètres »)', () => {
    expect(h.nounPhrase('http params', 'indef')).toBe("des paramètres d'HTTP");
  });

  it('rend « les … » en défini pour les noms pluriels/massifs (plus de « l\'options »)', () => {
    expect(h.nounPhrase('options', 'def')).toBe('les options');
    expect(h.nounPhrase('data', 'def')).toBe('les données');
    expect(h.nounPhrase('params', 'def')).toBe('les paramètres');
  });

  it('garde le singulier dans les contextes singuliers', () => {
    expect(h.nounPhrase('param', 'indef')).toBe('un paramètre');
    expect(h.demonstrative('params')).toBe('ce paramètre');
  });

  it('élide le suffixe Sync/Async du verbe (execSync ne donne plus « le sync »)', () => {
    expect(h.readVerb('execSync') ?? '').not.toContain('sync');
  });
});
