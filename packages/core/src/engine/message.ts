// Contrats de l'i18n. Une regle ne renvoie plus une phrase, mais un MESSAGE
// structure { key, params } : QUOI dire (locale-independant). Un catalogue par
// locale resout la cle en phrase : COMMENT le dire. Le translator (engine) fait
// le pont. Cle absente dans une locale -> sous-titre omis (VO), jamais de repli FR.

export type LocaleId = 'fr' | 'en' | 'es';

/** Valeur de param : du CODE (nom, nombre, sous-cle) ou, pour les structures
 * composees (conditions booleennes), des sous-params imbriques (arbre). Jamais de prose. */
export type MsgValue = string | number | MsgParams | readonly MsgParams[];

/** Params d'un message : TOUJOURS du code, jamais de prose. Plat ou imbrique. */
export interface MsgParams {
  readonly [key: string]: MsgValue;
}

export interface Message {
  readonly key: string;
  readonly params?: MsgParams;
}

/** Fabrique un message. Omet `params` quand il n'y en a pas (comparaisons d'egalite simples). */
export function msg(key: string, params?: MsgParams): Message {
  return params ? { key, params } : { key };
}

/**
 * Helpers de PROSE par-locale, exposes aux entrees de catalogue. C'est ici que vit
 * tout ce qui depend de la langue (genre, elision, accord, glossaire, conjugaison).
 * Le reader profond (ex-read/names.ts, read/conditions.ts) est reimplemente par
 * locale derriere cette interface ; le materiau passe en params reste du CODE.
 */
export interface LocaleHelpers {
  readonly locale: LocaleId;
  // Primitives partagees (memes impl pour les 3 locales).
  lit(s: string): string;
  truncate(s: string, max?: number): string;
  // Grammaire par-locale.
  elide(article: string, word: string): string;
  plural(n: number, one: string, many: string): string;
  // Reader de prose par-locale. `words` = mots de code joints par une espace
  // (sortie de splitIdentifier), `id` = identifiant brut, `op`/`token` = jeton de code.
  nounPhrase(words: string, article?: ArticleKind, opts?: { singular?: boolean }): string;
  demonstrative(words: string): string;
  noneOf(words: string): string;
  /** Lit un nom de verbe (ex: "loadGrammar") en intention SANS le pronom ("charge la grammaire"). */
  readVerb(id: string): string | null;
  /** Verbe + complement avec valence/cas explicites (decides par le classifieur). */
  verbPhrase(verb: string, rest: string, valence: Valence, pattern: VerbPattern): string;
  adjective(token: string): string | null;
  infinitive(token: string): string | null;
  comparison(op: string): string | null;
  /** Resout une autre cle DU MEME catalogue (sous-catalogues http.status.*, http.method.*). */
  sub(key: string): string;
}

/** Determinant d'un groupe nominal (discriminant SEMANTIQUE, pas du texte affiche). */
export type ArticleKind = 'def' | 'indef' | 'none';

/** Valence d'un verbe : objet direct defini, indefini, sans complement, ou complement singulier. */
export type Valence = 'def' | 'indef' | 'none' | 'singular';

/** Cas de conjugaison irreguliers, decides par le classifieur (jamais par la locale). */
export type VerbPattern = 'plain' | 'ensure' | 'subscribe' | 'determineOf';

/**
 * Une entree de catalogue : soit un gabarit `{param}`, soit une fonction pure
 * (params, helpers) -> string. La fonction porte l'accord/elision/troncature.
 * Reste deterministe et offline (pas d'ICU).
 */
export type CatalogEntry = string | ((p: MsgParams, h: LocaleHelpers) => string);
export type Catalog = Readonly<Record<string, CatalogEntry>>;

export interface Translator {
  readonly locale: LocaleId;
  has(key: string): boolean;
  /** Resout un message. Leve si la cle est absente (cas ES = VO, attrape par l'engine). */
  render(m: Message): string;
}
