// English prose : noun phrases (no gender, no elision, +s plural, EN word order),
// verbs, demonstratives. Mirrors the FR reader's structure behind LocaleHelpers.
import type { ArticleKind, LocaleHelpers, Valence, VerbPattern } from '../../../engine/message';
import { lit, lookupRaw, own, splitIdentifier, truncate, VERB_META } from '../shared';
import { GLOSSARY_EN } from './glossary';
import { DETERMINE_EN, VERBS_EN } from './verbs';
import { WORDS_EN } from './words';

function pluralOf(entry: { word: string; plural?: string }): string {
  if (entry.plural) return entry.plural;
  return /[sxz]$/i.test(entry.word) ? entry.word : `${entry.word}s`; // no double-s (« kpis » -> « kpis »)
}

/** English noun phrase : modifiers (singular) precede the head ; head pluralises. */
function nounPhrase(wordsStr: string, article: ArticleKind = 'none', opts: { singular?: boolean } = {}): string {
  const words = wordsStr ? wordsStr.split(' ').filter(Boolean) : [];
  if (words.length === 0) return '';
  const head = lookupRaw(GLOSSARY_EN, words[words.length - 1]!);
  const isPlural = (head.plural || head.entry.number === 'plural') && !opts.singular;
  const mods = words.slice(0, -1).map((wd) => lookupRaw(GLOSSARY_EN, wd).entry.word);
  const headPlural = [...mods, pluralOf(head.entry)].join(' ');
  const headSingular = [...mods, head.entry.word].join(' ');

  if (article === 'def') return `the ${isPlural ? headPlural : headSingular}`;
  if (article === 'indef') return `${/^[aeiou]/i.test(headSingular) ? 'an' : 'a'} ${headSingular}`;
  return isPlural ? headPlural : headSingular;
}

function demonstrative(wordsStr: string): string {
  if (!wordsStr) return wordsStr;
  return `this ${nounPhrase(wordsStr, 'none', { singular: true })}`;
}

function noneOf(wordsStr: string): string {
  if (!wordsStr) return wordsStr;
  return `no ${nounPhrase(wordsStr, 'none', { singular: true })}`;
}

function articleFor(valence: Valence): ArticleKind {
  return valence === 'indef' ? 'indef' : valence === 'none' ? 'none' : 'def';
}

function verbPhrase(verb: string, rest: string, valence: Valence, pattern: VerbPattern): string {
  const word = own(VERBS_EN, verb)?.word ?? verb;
  if (pattern === 'ensure') return `${word} ${nounPhrase(rest, 'indef')} exists`;
  if (pattern === 'subscribe') return `${word} to ${nounPhrase(rest, 'def')}`;
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
    if (rest[rest.length - 1] === 'sync' || rest[rest.length - 1] === 'async') rest = rest.slice(0, -1); // execSync -> « execute »
    return verbPhrase(words[0]!, rest.join(' '), meta.valence, meta.pattern).trim();
  }
  if (words.length >= 2 && words[words.length - 1] === 'of') {
    return `${DETERMINE_EN} ${nounPhrase(words.slice(0, -1).join(' '), 'def')}`;
  }
  return null;
}

/** Grammatical number of the head (1 or 2), to agree the verb (« exists »/« exist »). */
function numberOf(wordsStr: string): number {
  const words = wordsStr ? wordsStr.split(' ').filter(Boolean) : [];
  const last = words[words.length - 1];
  if (!last) return 1;
  const head = lookupRaw(GLOSSARY_EN, last);
  return head.plural || head.entry.number === 'plural' ? 2 : 1;
}

export function makeEnHelpers(sub: (key: string) => string): LocaleHelpers {
  return {
    locale: 'en',
    lit,
    truncate,
    elide: (article, word) => `${article} ${word}`, // no elision in English
    plural: (n, one, many) => (n <= 1 ? one : many),
    numberOf,
    nounPhrase,
    demonstrative,
    noneOf,
    readVerb,
    verbPhrase,
    adjective: (token) => own(WORDS_EN.adjectives, token) ?? null,
    infinitive: (token) => own(WORDS_EN.infinitives, token) ?? null,
    comparison: (op) => own(WORDS_EN.comparisons, op) ?? null,
    sub,
  };
}
