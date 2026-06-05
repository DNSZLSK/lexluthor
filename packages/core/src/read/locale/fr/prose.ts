// Prose FR : reimplemente le reader profond (ex-read/names.ts + lookups de
// read/conditions.ts) derriere LocaleHelpers. Le materiau (mots de code) arrive en
// params ; ici on accorde, elide, conjugue. 100% deterministe.
import type { ArticleKind, LocaleHelpers, Valence, VerbPattern } from '../../../engine/message';
import { isVowelStart, lit, lookupRaw, own, splitIdentifier, truncate } from '../shared';
import { GLOSSARY_FR } from './glossary';
import { DETERMINE_FR, VERBS_FR } from './verbs';
import { WORDS_FR } from './words';

function elide(article: string, word: string): string {
  return isVowelStart(word) ? `${article[0]}'${word}` : `${article} ${word}`;
}

function elideQue(s: string): string {
  return isVowelStart(s) ? `qu'${s}` : `que ${s}`;
}

function pluralOf(entry: { word: string; plural?: string }): string {
  if (entry.plural) return entry.plural;
  return /[sxz]$/i.test(entry.word) ? entry.word : `${entry.word}s`; // pas de double-s (« kpis » -> « kpis »)
}

/** Groupe nominal : tete = dernier mot, complements en « de » (ordre EN->FR). */
function nounPhrase(wordsStr: string, article: ArticleKind = 'none', opts: { singular?: boolean } = {}): string {
  const words = wordsStr ? wordsStr.split(' ').filter(Boolean) : [];
  if (words.length === 0) return '';
  const head = lookupRaw(GLOSSARY_FR, words[words.length - 1]!);
  const isPlural = (head.plural || head.entry.number === 'plural') && !opts.singular;
  const headStr = isPlural ? pluralOf(head.entry) : head.entry.word;

  let phrase: string;
  if (article === 'def') {
    phrase = isPlural ? `les ${headStr}` : elide(head.entry.gender === 'f' ? 'la' : 'le', headStr);
  } else if (article === 'indef') {
    phrase = isPlural ? `des ${headStr}` : `${head.entry.gender === 'f' ? 'une' : 'un'} ${head.entry.word}`;
  } else {
    phrase = headStr;
  }
  for (let i = words.length - 2; i >= 0; i--) {
    phrase += ` ${elide('de', lookupRaw(GLOSSARY_FR, words[i]!).entry.word)}`;
  }
  return phrase;
}

function demonstrative(wordsStr: string): string {
  const words = wordsStr ? wordsStr.split(' ').filter(Boolean) : [];
  if (words.length === 0) return wordsStr;
  const head = lookupRaw(GLOSSARY_FR, words[words.length - 1]!).entry;
  const det = head.gender === 'f' ? 'cette' : isVowelStart(head.word) ? 'cet' : 'ce';
  return `${det} ${nounPhrase(wordsStr, 'none', { singular: true })}`;
}

function noneOf(wordsStr: string): string {
  const words = wordsStr ? wordsStr.split(' ').filter(Boolean) : [];
  if (words.length === 0) return wordsStr;
  const head = lookupRaw(GLOSSARY_FR, words[words.length - 1]!).entry;
  return `${head.gender === 'f' ? 'aucune' : 'aucun'} ${nounPhrase(wordsStr, 'none', { singular: true })}`;
}

function articleFor(valence: Valence): ArticleKind {
  return valence === 'indef' ? 'indef' : valence === 'none' ? 'none' : 'def';
}

/** Verbe + complement, avec valence/cas decides par le classifieur (jamais ici). */
function verbPhrase(verb: string, rest: string, valence: Valence, pattern: VerbPattern): string {
  const word = own(VERBS_FR, verb)?.word ?? verb;
  if (pattern === 'ensure') return `${word} ${elideQue(nounPhrase(rest, 'indef'))} existe`;
  if (pattern === 'subscribe') return `${word} à ${nounPhrase(rest, 'def')}`;
  return `${word} ${nounPhrase(rest, articleFor(valence))}`.trim();
}

/** Lit un nom de verbe complet (ex: "getUserById" -> « recupere l'utilisateur »), ou null. */
function readVerb(id: string): string | null {
  const words = id ? splitIdentifier(id) : [];
  if (words.length === 0) return null;
  const meta = own(VERBS_FR, words[0]!);
  if (meta) {
    let rest = words.slice(1);
    const byIdx = rest.indexOf('by'); // getUserById -> « recupere l'utilisateur »
    if (byIdx >= 0) rest = rest.slice(0, byIdx);
    if (rest[rest.length - 1] === 'sync' || rest[rest.length - 1] === 'async') rest = rest.slice(0, -1); // execSync -> « execute »
    return verbPhrase(words[0]!, rest.join(' '), meta.valence, meta.pattern ?? 'plain').trim();
  }
  // Convention *Of : claimOf -> « determine la revendication ».
  if (words.length >= 2 && words[words.length - 1] === 'of') {
    return `${DETERMINE_FR} ${nounPhrase(words.slice(0, -1).join(' '), 'def')}`;
  }
  return null;
}

export function makeFrHelpers(sub: (key: string) => string): LocaleHelpers {
  return {
    locale: 'fr',
    lit,
    truncate,
    elide,
    plural: (n, one, many) => (n <= 1 ? one : many),
    nounPhrase,
    demonstrative,
    noneOf,
    readVerb,
    verbPhrase,
    adjective: (token) => own(WORDS_FR.adjectives, token) ?? null,
    infinitive: (token) => own(WORDS_FR.infinitives, token) ?? null,
    comparison: (op) => own(WORDS_FR.comparisons, op) ?? null,
    sub,
  };
}
