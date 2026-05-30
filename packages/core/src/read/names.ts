// Lecture des IDENTIFIANTS : décompose un nom de code en mots, le rend en français
// (glossaire curé + genre), et reconnaît les préfixes verbes (ensure/get/load…).
// 100% déterministe : on ne lit que ce qui est DANS le nom, on n'invente rien.
// La qualité vient du GLOSSAIRE (croît par exposition), pas d'une grammaire générique.

export type Gender = 'm' | 'f';
interface Noun {
  readonly fr: string;
  readonly g: Gender;
  readonly pl?: string; // pluriel irrégulier (sinon fr + "s")
}

const VOWEL = /^[aàâäeéèêëiîïoôöuùûühAÀÂÄEÉÈÊËIÎÏOÔÖUÙÛÜH]/;

/** Découpe camelCase / PascalCase / SCREAMING_SNAKE / snake_case en mots minuscules. */
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

// Glossaire curé : mot-de-code -> nom français (+ genre). C'EST le levier de qualité.
const GLOSSARY: Record<string, Noun> = {
  adapter: { fr: 'adapter', g: 'm' },
  grammar: { fr: 'grammaire', g: 'f' },
  factory: { fr: 'fabrique', g: 'f' },
  provider: { fr: 'fournisseur', g: 'm' },
  language: { fr: 'langage', g: 'm' },
  lang: { fr: 'langage', g: 'm' },
  config: { fr: 'configuration', g: 'f' },
  configuration: { fr: 'configuration', g: 'f' },
  request: { fr: 'requête', g: 'f' },
  req: { fr: 'requête', g: 'f' },
  response: { fr: 'réponse', g: 'f' },
  res: { fr: 'réponse', g: 'f' },
  user: { fr: 'utilisateur', g: 'm' },
  id: { fr: 'identifiant', g: 'm' },
  token: { fr: 'jeton', g: 'm' },
  error: { fr: 'erreur', g: 'f' },
  err: { fr: 'erreur', g: 'f' },
  cache: { fr: 'cache', g: 'm' },
  key: { fr: 'clé', g: 'f' },
  value: { fr: 'valeur', g: 'f' },
  val: { fr: 'valeur', g: 'f' },
  item: { fr: 'élément', g: 'm' },
  element: { fr: 'élément', g: 'm' },
  path: { fr: 'chemin', g: 'm' },
  file: { fr: 'fichier', g: 'm' },
  dir: { fr: 'dossier', g: 'm' },
  directory: { fr: 'dossier', g: 'm' },
  name: { fr: 'nom', g: 'm' },
  email: { fr: 'email', g: 'm' },
  port: { fr: 'port', g: 'm' },
  server: { fr: 'serveur', g: 'm' },
  engine: { fr: 'moteur', g: 'm' },
  rule: { fr: 'règle', g: 'f' },
  node: { fr: 'nœud', g: 'm' },
  tree: { fr: 'arbre', g: 'm' },
  block: { fr: 'bloc', g: 'm' },
  subtitle: { fr: 'sous-titre', g: 'm' },
  subtitler: { fr: 'sous-titreur', g: 'm' },
  highlighter: { fr: 'coloriseur', g: 'm' },
  loader: { fr: 'chargeur', g: 'm' },
  parser: { fr: 'analyseur', g: 'm' },
  renderer: { fr: 'moteur de rendu', g: 'm' },
  index: { fr: 'index', g: 'm' },
  count: { fr: 'nombre', g: 'm' },
  list: { fr: 'liste', g: 'f' },
  result: { fr: 'résultat', g: 'm' },
  handler: { fr: 'gestionnaire', g: 'm' },
  message: { fr: 'message', g: 'm' },
  msg: { fr: 'message', g: 'm' },
  promise: { fr: 'promesse', g: 'f' },
  pending: { fr: 'promesse en attente', g: 'f', pl: 'promesses en attente' },
  data: { fr: 'données', g: 'f', pl: 'données' },
  options: { fr: 'options', g: 'f', pl: 'options' },
  opts: { fr: 'options', g: 'f', pl: 'options' },
  context: { fr: 'contexte', g: 'm' },
  ctx: { fr: 'contexte', g: 'm' },
  state: { fr: 'état', g: 'm' },
  type: { fr: 'type', g: 'm' },
  url: { fr: 'URL', g: 'f' },
  date: { fr: 'date', g: 'f' },
  number: { fr: 'nombre', g: 'm' },
  string: { fr: 'chaîne', g: 'f' },
  array: { fr: 'tableau', g: 'm' },
  object: { fr: 'objet', g: 'm' },
  map: { fr: 'table', g: 'f' },
  set: { fr: 'ensemble', g: 'm' },
  status: { fr: 'statut', g: 'm' },
  code: { fr: 'code', g: 'm' },
  text: { fr: 'texte', g: 'm' },
  line: { fr: 'ligne', g: 'f' },
  range: { fr: 'plage', g: 'f' },
  query: { fr: 'requête', g: 'f' },
  field: { fr: 'champ', g: 'm' },
  body: { fr: 'corps', g: 'm' },
  header: { fr: 'en-tête', g: 'm' },
  param: { fr: 'paramètre', g: 'm' },
  params: { fr: 'paramètres', g: 'm', pl: 'paramètres' },
};

function singularize(word: string): { sing: string; plural: boolean } {
  if (word.length > 3 && word.endsWith('ies')) return { sing: `${word.slice(0, -3)}y`, plural: true };
  if (word.length > 3 && word.endsWith('ses')) return { sing: word.slice(0, -2), plural: true };
  if (word.length > 2 && word.endsWith('s') && !word.endsWith('ss')) return { sing: word.slice(0, -1), plural: true };
  return { sing: word, plural: false };
}

function lookup(word: string): { noun: Noun; plural: boolean } {
  const direct = GLOSSARY[word];
  if (direct) return { noun: direct, plural: false };
  const { sing, plural } = singularize(word);
  const entry = GLOSSARY[sing];
  if (entry) return { noun: entry, plural };
  // Inconnu : on garde le mot tel quel (lisible quand même), masculin par défaut.
  return { noun: { fr: word, g: 'm' }, plural };
}

function pluralOf(noun: Noun): string {
  return noun.pl ?? `${noun.fr}s`;
}

/** "le"/"la"/"de" -> "l'"/"d'" devant voyelle ou h. (un/une ne s'élident pas.) */
function elide(article: 'le' | 'la' | 'de', word: string): string {
  return VOWEL.test(word) ? `${article[0]}'${word}` : `${article} ${word}`;
}

export type Article = 'le' | 'un' | 'none';

/**
 * Rend une liste de mots en groupe nominal français : tête = dernier mot,
 * compléments avec « de » (ordre EN→FR). Ex : ['adapter','factories'] ->
 * « fabriques d'adapter » ; ['language','adapter'] -> « adapter de langage ».
 */
export function nounPhrase(
  words: readonly string[],
  article: Article = 'none',
  opts: { singular?: boolean } = {},
): string {
  if (words.length === 0) return '';
  const headWord = words[words.length - 1]!;
  const head = lookup(headWord);
  const isPlural = head.plural && !opts.singular;
  const headStr = isPlural ? pluralOf(head.noun) : head.noun.fr;

  let phrase: string;
  if (article === 'le') {
    phrase = isPlural ? `les ${headStr}` : elide(head.noun.g === 'f' ? 'la' : 'le', headStr);
  } else if (article === 'un') {
    phrase = `${head.noun.g === 'f' ? 'une' : 'un'} ${head.noun.fr}`; // indéfini = singulier
  } else {
    phrase = headStr;
  }

  for (let i = words.length - 2; i >= 0; i--) {
    phrase += ` ${elide('de', lookup(words[i]!).noun.fr)}`;
  }
  return phrase;
}

/** Forme lisible d'un identifiant (groupe nominal). Ex : ADAPTER_FACTORIES -> « les fabriques d'adapter ». */
export function humanizeName(id: string, article: Article = 'le', opts: { singular?: boolean } = {}): string {
  return nounPhrase(splitIdentifier(id), article, opts);
}

/** Forme démonstrative singulière. Ex : lang -> « ce langage » ; key -> « cette clé ». */
export function demonstrative(id: string): string {
  const words = splitIdentifier(id);
  if (words.length === 0) return id;
  const head = lookup(words[words.length - 1]!).noun;
  const det = head.g === 'f' ? 'cette' : VOWEL.test(head.fr) ? 'cet' : 'ce';
  return `${det} ${nounPhrase(words, 'none', { singular: true })}`;
}

/** Vrai si la tête de l'identifiant est dans le glossaire (mot « connu », pas cryptique). */
export function isGlossed(id: string): boolean {
  const words = splitIdentifier(id);
  if (words.length === 0) return false;
  const w = words[words.length - 1]!;
  return Boolean(GLOSSARY[w] ?? GLOSSARY[singularize(w).sing]);
}

/** Forme « aucun/aucune {nom} » accordée. Ex : factory -> « aucune fabrique » ; adapter -> « aucun adapter ». */
export function noneOf(id: string): string {
  const words = splitIdentifier(id);
  if (words.length === 0) return id;
  const head = lookup(words[words.length - 1]!).noun;
  return `${head.g === 'f' ? 'aucune' : 'aucun'} ${nounPhrase(words, 'none', { singular: true })}`;
}

// Préfixes verbes -> phrase d'intention, verbe au PRÉSENT 3e personne (forme « On … »).
// Le reste des mots = le complément. L'appelant préfixe « On ».
const VERB_PREFIXES: Record<string, (rest: string[]) => string> = {
  get: (r) => `récupère ${nounPhrase(r, 'le')}`,
  fetch: (r) => `récupère ${nounPhrase(r, 'le')}`,
  read: (r) => `lit ${nounPhrase(r, 'le')}`,
  load: (r) => `charge ${nounPhrase(r, 'le')}`,
  write: (r) => `écrit ${nounPhrase(r, 'le')}`,
  save: (r) => `enregistre ${nounPhrase(r, 'le')}`,
  store: (r) => `enregistre ${nounPhrase(r, 'le')}`,
  persist: (r) => `enregistre ${nounPhrase(r, 'le')}`,
  create: (r) => `crée ${nounPhrase(r, 'un')}`,
  make: (r) => `crée ${nounPhrase(r, 'un')}`,
  build: (r) => `construit ${nounPhrase(r, 'le')}`,
  init: (r) => `initialise ${nounPhrase(r, 'le')}`,
  ensure: (r) => `s'assure ${elideQue(nounPhrase(r, 'un'))} existe`,
  set: (r) => `définit ${nounPhrase(r, 'le')}`,
  update: (r) => `met à jour ${nounPhrase(r, 'le')}`,
  find: (r) => `cherche ${nounPhrase(r, 'le')}`,
  search: (r) => `cherche ${nounPhrase(r, 'le')}`,
  handle: (r) => `gère ${nounPhrase(r, 'le')}`,
  validate: (r) => `valide ${nounPhrase(r, 'le')}`,
  check: (r) => `vérifie ${nounPhrase(r, 'le')}`,
  verify: (r) => `vérifie ${nounPhrase(r, 'le')}`,
  parse: (r) => `analyse ${nounPhrase(r, 'le')}`,
  send: (r) => `envoie ${nounPhrase(r, 'le')}`,
  post: (r) => `envoie ${nounPhrase(r, 'le')}`,
  emit: (r) => `émet ${nounPhrase(r, 'le')}`,
  delete: (r) => `supprime ${nounPhrase(r, 'le')}`,
  remove: (r) => `supprime ${nounPhrase(r, 'le')}`,
  clear: (r) => `vide ${nounPhrase(r, 'le')}`,
  compute: (r) => `calcule ${nounPhrase(r, 'le')}`,
  calculate: (r) => `calcule ${nounPhrase(r, 'le')}`,
  format: (r) => `formate ${nounPhrase(r, 'le')}`,
  render: (r) => `affiche ${nounPhrase(r, 'le')}`,
  draw: (r) => `dessine ${nounPhrase(r, 'le')}`,
  show: (r) => `affiche ${nounPhrase(r, 'le')}`,
  resolve: (r) => `résout ${nounPhrase(r, 'le')}`,
  reject: (r) => `rejette ${nounPhrase(r, 'le')}`,
  toggle: (r) => `bascule ${nounPhrase(r, 'le')}`,
  add: (r) => `ajoute ${nounPhrase(r, 'un')}`,
  append: (r) => `ajoute ${nounPhrase(r, 'un')}`,
  open: (r) => `ouvre ${nounPhrase(r, 'le')}`,
  close: (r) => `ferme ${nounPhrase(r, 'le')}`,
  start: (r) => `démarre ${nounPhrase(r, 'le')}`,
  stop: (r) => `arrête ${nounPhrase(r, 'le')}`,
  run: (r) => `exécute ${nounPhrase(r, 'le')}`,
  exec: (r) => `exécute ${nounPhrase(r, 'le')}`,
  execute: (r) => `exécute ${nounPhrase(r, 'le')}`,
  apply: (r) => `applique ${nounPhrase(r, 'le')}`,
  transform: (r) => `transforme ${nounPhrase(r, 'le')}`,
  filter: (r) => `filtre ${nounPhrase(r, 'le')}`,
  sort: (r) => `trie ${nounPhrase(r, 'le')}`,
  merge: (r) => `fusionne ${nounPhrase(r, 'le')}`,
  copy: (r) => `copie ${nounPhrase(r, 'le')}`,
  move: (r) => `déplace ${nounPhrase(r, 'le')}`,
};

function elideQue(s: string): string {
  return VOWEL.test(s) ? `qu'${s}` : `que ${s}`;
}

/** Phrase d'intention si l'identifiant commence par un verbe connu, sinon null. */
export function readVerbName(id: string): string | null {
  const words = splitIdentifier(id);
  if (words.length === 0) return null;
  const verb = VERB_PREFIXES[words[0]!];
  if (!verb) return null;
  let rest = words.slice(1);
  const byIdx = rest.indexOf('by'); // getUserById -> "récupérer l'utilisateur"
  if (byIdx >= 0) rest = rest.slice(0, byIdx);
  return verb(rest).trim();
}
