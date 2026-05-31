// Prosa ES (AMORCE) : sintagmas nominales con genero (el/la), verbos. Funcional pero
// alimentado por tablas seed ; las claves del catalogo ES no traducidas se omiten (VO).
import type { ArticleKind, LocaleHelpers, Valence, VerbPattern } from '../../../engine/message';
import { lit, lookupRaw, own, splitIdentifier, truncate, VERB_META } from '../shared';
import { GLOSSARY_ES } from './glossary';
import { DETERMINE_ES, VERBS_ES } from './verbs';
import { WORDS_ES } from './words';

function pluralOf(entry: { word: string; plural?: string }): string {
  if (entry.plural) return entry.plural;
  return /[aeiouáéíóú]$/i.test(entry.word) ? `${entry.word}s` : `${entry.word}es`;
}

function nounPhrase(wordsStr: string, article: ArticleKind = 'none', opts: { singular?: boolean } = {}): string {
  const words = wordsStr ? wordsStr.split(' ').filter(Boolean) : [];
  if (words.length === 0) return '';
  const head = lookupRaw(GLOSSARY_ES, words[words.length - 1]!);
  const isPlural = head.plural && !opts.singular;
  const fem = head.entry.gender === 'f';
  const headStr = isPlural ? pluralOf(head.entry) : head.entry.word;

  let phrase: string;
  if (article === 'def') {
    phrase = isPlural ? `${fem ? 'las' : 'los'} ${headStr}` : `${fem ? 'la' : 'el'} ${headStr}`;
  } else if (article === 'indef') {
    phrase = `${fem ? 'una' : 'un'} ${head.entry.word}`;
  } else {
    phrase = headStr;
  }
  for (let i = words.length - 2; i >= 0; i--) {
    phrase += ` de ${lookupRaw(GLOSSARY_ES, words[i]!).entry.word}`;
  }
  return phrase;
}

function demonstrative(wordsStr: string): string {
  const words = wordsStr ? wordsStr.split(' ').filter(Boolean) : [];
  if (words.length === 0) return wordsStr;
  const fem = lookupRaw(GLOSSARY_ES, words[words.length - 1]!).entry.gender === 'f';
  return `${fem ? 'esta' : 'este'} ${nounPhrase(wordsStr, 'none', { singular: true })}`;
}

function noneOf(wordsStr: string): string {
  const words = wordsStr ? wordsStr.split(' ').filter(Boolean) : [];
  if (words.length === 0) return wordsStr;
  const fem = lookupRaw(GLOSSARY_ES, words[words.length - 1]!).entry.gender === 'f';
  return `${fem ? 'ninguna' : 'ningún'} ${nounPhrase(wordsStr, 'none', { singular: true })}`;
}

function articleFor(valence: Valence): ArticleKind {
  return valence === 'indef' ? 'indef' : valence === 'none' ? 'none' : 'def';
}

function verbPhrase(verb: string, rest: string, valence: Valence, pattern: VerbPattern): string {
  const word = own(VERBS_ES, verb)?.word ?? verb;
  if (pattern === 'ensure') return `${word} de que exista ${nounPhrase(rest, 'indef')}`;
  if (pattern === 'subscribe') return `${word} a ${nounPhrase(rest, 'def')}`;
  return `${word} ${nounPhrase(rest, articleFor(valence))}`.trim();
}

function readVerb(id: string): string | null {
  const words = id ? splitIdentifier(id) : [];
  if (words.length === 0) return null;
  const meta = own(VERB_META, words[0]!);
  if (meta) {
    let rest = words.slice(1);
    const byIdx = rest.indexOf('by');
    if (byIdx >= 0) rest = rest.slice(0, byIdx);
    return verbPhrase(words[0]!, rest.join(' '), meta.valence, meta.pattern).trim();
  }
  if (words.length >= 2 && words[words.length - 1] === 'of') {
    return `${DETERMINE_ES} ${nounPhrase(words.slice(0, -1).join(' '), 'def')}`;
  }
  return null;
}

export function makeEsHelpers(sub: (key: string) => string): LocaleHelpers {
  return {
    locale: 'es',
    lit,
    truncate,
    elide: (article, word) => `${article} ${word}`,
    plural: (n, one, many) => (n <= 1 ? one : many),
    nounPhrase,
    demonstrative,
    noneOf,
    readVerb,
    verbPhrase,
    adjective: (token) => own(WORDS_ES.adjectives, token) ?? null,
    infinitive: (token) => own(WORDS_ES.infinitives, token) ?? null,
    comparison: (op) => own(WORDS_ES.comparisons, op) ?? null,
    sub,
  };
}
