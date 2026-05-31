// Socle PARTAGE du reader (locale-independant) : decoupage d'identifiants, nombre
// grammatical (sur le mot de code anglais), nettoyage/troncature, et surtout les
// ENSEMBLES CANONIQUES de lisibilite (tetes glossees, verbes, adjectifs, comparaisons)
// derives des donnees FR de reference. Ces ensembles servent aux DECISIONS structurelles
// (cle / null) : elles doivent etre identiques dans les 3 locales, donc jamais tirees
// du glossaire d'une locale particuliere.
import type { NounEntry, Valence, VerbPattern } from './types';
import { GLOSSARY_FR } from './fr/glossary';
import { VERBS_FR } from './fr/verbs';
import { WORDS_FR } from './fr/words';

const VOWEL = /^[aàâäeéèêëiîïoôöuùûühAÀÂÄEÉÈÊËIÎÏOÔÖUÙÛÜH]/;

/** Acces « propre » : evite les cles heritees (constructor, toString…). */
export function own<T>(dict: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(dict, key) ? dict[key] : undefined;
}

/** Decoupe camelCase / PascalCase / SCREAMING_SNAKE / snake_case en mots minuscules. */
export function splitIdentifier(id: string): string[] {
  return id
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-$]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/** Nombre du mot de CODE (anglais) : vaut pour toutes les locales. */
export function singularize(word: string): { sing: string; plural: boolean } {
  if (word.length > 3 && word.endsWith('ies')) return { sing: `${word.slice(0, -3)}y`, plural: true };
  if (word.length > 3 && word.endsWith('ses')) return { sing: word.slice(0, -2), plural: true };
  if (word.length > 2 && word.endsWith('s') && !word.endsWith('ss')) return { sing: word.slice(0, -1), plural: true };
  return { sing: word, plural: false };
}

/** Texte d'un litteral chaine sans une paire de guillemets englobants. */
export function lit(s: string): string {
  return s.trim().replace(/^(['"`])([\s\S]*)\1$/, '$2');
}

/** Tronque proprement : aplatit les blancs internes, coupe avec un caractere de suite. */
export function truncate(s: string, max = 90): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export const isVowelStart = (w: string): boolean => VOWEL.test(w);

/**
 * Lookup generique dans un glossaire de locale : direct, puis singularise, sinon
 * repli « mot inconnu garde tel quel, masculin par defaut » (lisible quand meme).
 */
export function lookupRaw(
  glossary: Readonly<Record<string, NounEntry>>,
  word: string,
): { entry: NounEntry; plural: boolean } {
  const direct = own(glossary, word);
  if (direct) return { entry: direct, plural: false };
  const { sing, plural } = singularize(word);
  const entry = own(glossary, sing);
  if (entry) return { entry, plural };
  return { entry: { word, gender: 'm' }, plural };
}

// --- Ensembles canoniques (decisions structurelles, derives de la reference FR) ---

/** Tetes connues du glossaire (decision isGlossed). */
export const GLOSSED_HEADS: ReadonlySet<string> = new Set(Object.keys(GLOSSARY_FR));

/** Meta semantique des verbes (valence + cas), partagee ; les locales ne fournissent que le mot. */
export const VERB_META: Readonly<Record<string, { valence: Valence; pattern: VerbPattern }>> =
  Object.fromEntries(Object.entries(VERBS_FR).map(([k, v]) => [k, { valence: v.valence, pattern: v.pattern ?? 'plain' }]));

export const VERB_TOKENS: ReadonlySet<string> = new Set(Object.keys(VERBS_FR));
export const ADJECTIVE_TOKENS: ReadonlySet<string> = new Set(Object.keys(WORDS_FR.adjectives));
export const INFINITIVE_TOKENS: ReadonlySet<string> = new Set(Object.keys(WORDS_FR.infinitives));
export const COMPARISON_OPS: ReadonlySet<string> = new Set(Object.keys(WORDS_FR.comparisons));
export const ARRAY_PREDICATE_TOKENS: ReadonlySet<string> = new Set(Object.keys(WORDS_FR.arrayPredicate));

/** Tete d'identifiant « connue » du glossaire (decision structurelle, locale-independante). */
export function isGlossedHead(id: string): boolean {
  const words = splitIdentifier(id);
  if (words.length === 0) return false;
  const w = words[words.length - 1]!;
  return GLOSSED_HEADS.has(w) || GLOSSED_HEADS.has(singularize(w).sing);
}

/** Vrai si l'identifiant se lit comme un verbe (prefixe verbe connu ou convention *Of). */
export function readsAsVerb(id: string): boolean {
  const words = splitIdentifier(id);
  if (words.length === 0) return false;
  if (VERB_TOKENS.has(words[0]!)) return true;
  return words.length >= 2 && words[words.length - 1] === 'of';
}

/** Choisit un token connu dans un ensemble : mot complet colle, sinon dernier mot, sinon null. */
export function pickToken(set: ReadonlySet<string>, rest: readonly string[]): string | null {
  const joined = rest.join('');
  if (set.has(joined)) return joined;
  const last = rest[rest.length - 1];
  return last && set.has(last) ? last : null;
}

/** Verbes de « recherche » sur une collection nommee (l'objet nomme la chose lue). */
export const LOOKUP_VERBS: ReadonlySet<string> = new Set(['get', 'fetch', 'find', 'read', 'load']);
/** Verbes de « rangement » par cle (obj.set(id, v)). */
export const STORE_VERBS: ReadonlySet<string> = new Set(['set', 'put']);
/** Methodes d'appartenance exactes (has exact = appartenance ; hasX = predicat). */
export const MEMBERSHIP: ReadonlySet<string> = new Set(['includes', 'contains', 'has']);
