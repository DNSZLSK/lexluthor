import { describe, expect, it } from 'vitest';
import { humanizeName, nounPhrase, readVerbName, splitIdentifier } from '../src/read/names';

describe('splitIdentifier', () => {
  it('découpe les conventions de nommage', () => {
    expect(splitIdentifier('ADAPTER_FACTORIES')).toEqual(['adapter', 'factories']);
    expect(splitIdentifier('ensureAdapter')).toEqual(['ensure', 'adapter']);
    expect(splitIdentifier('LanguageAdapter')).toEqual(['language', 'adapter']);
    expect(splitIdentifier('isFirstRun')).toEqual(['is', 'first', 'run']);
    expect(splitIdentifier('load_grammar')).toEqual(['load', 'grammar']);
  });
});

describe('humanizeName / nounPhrase (glossaire + genre + élision + pluriel)', () => {
  it('rend des groupes nominaux français', () => {
    expect(humanizeName('ADAPTER_FACTORIES')).toBe("les fabriques d'adapter");
    expect(humanizeName('lang')).toBe('le langage');
    expect(humanizeName('grammar')).toBe('la grammaire');
    expect(humanizeName('user')).toBe("l'utilisateur");
  });

  it('ordre EN->FR (tête = dernier mot, compléments avec « de »)', () => {
    expect(nounPhrase(['adapter', 'factories'])).toBe("fabriques d'adapter");
    expect(nounPhrase(['language', 'adapter'])).toBe('adapter de langage');
  });
});

describe('readVerbName (préfixes verbes)', () => {
  it('lit l’intention quand un verbe connu préfixe le nom', () => {
    expect(readVerbName('ensureAdapter')).toBe("s'assure qu'un adapter existe");
    expect(readVerbName('loadGrammar')).toBe('charge la grammaire');
    expect(readVerbName('createEngine')).toBe('crée un moteur');
    expect(readVerbName('getUserById')).toBe("récupère l'utilisateur");
    expect(readVerbName('saveFile')).toBe('enregistre le fichier');
  });

  it('null si aucun préfixe verbe connu', () => {
    expect(readVerbName('subtitle')).toBeNull();
    expect(readVerbName('factory')).toBeNull();
  });
});
