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
  claim: { fr: 'revendication', g: 'f' },
  depth: { fr: 'profondeur', g: 'f' },
  spec: { fr: 'spécificité', g: 'f' },
  specificity: { fr: 'spécificité', g: 'f' },
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
  // Curation r1 : termes remontés par `lexluthor scan` sur les repos locaux (par fréquence).
  source: { fr: 'source', g: 'f' },
  target: { fr: 'cible', g: 'f' },
  content: { fr: 'contenu', g: 'm' },
  input: { fr: 'entrée', g: 'f' },
  output: { fr: 'sortie', g: 'f' },
  method: { fr: 'méthode', g: 'f' },
  expression: { fr: 'expression', g: 'f' },
  package: { fr: 'paquet', g: 'm' },
  class: { fr: 'classe', g: 'f' },
  base: { fr: 'base', g: 'f' },
  prop: { fr: 'propriété', g: 'f' },
  props: { fr: 'propriétés', g: 'f', pl: 'propriétés' },
  property: { fr: 'propriété', g: 'f' },
  ref: { fr: 'référence', g: 'f' },
  reference: { fr: 'référence', g: 'f' },
  obj: { fr: 'objet', g: 'm' },
  call: { fr: 'appel', g: 'm' },
  threat: { fr: 'menace', g: 'f' },
  word: { fr: 'mot', g: 'm' },
  arg: { fr: 'argument', g: 'm' },
  argument: { fr: 'argument', g: 'm' },
  report: { fr: 'rapport', g: 'm' },
  subject: { fr: 'sujet', g: 'm' },
  model: { fr: 'modèle', g: 'm' },
  view: { fr: 'vue', g: 'f' },
  service: { fr: 'service', g: 'm' },
  module: { fr: 'module', g: 'm' },
  event: { fr: 'évènement', g: 'm' },
  // Curation r2 : vocabulaire UNIVERSEL de l'écosystème (scan express/fastify/nest/prisma).
  app: { fr: 'application', g: 'f' },
  application: { fr: 'application', g: 'f' },
  router: { fr: 'routeur', g: 'm' },
  route: { fr: 'route', g: 'f' },
  reply: { fr: 'réponse', g: 'f' },
  payload: { fr: 'charge utile', g: 'f', pl: 'charges utiles' },
  stream: { fr: 'flux', g: 'm', pl: 'flux' },
  schema: { fr: 'schéma', g: 'm' },
  plugin: { fr: 'plugin', g: 'm' },
  middleware: { fr: 'middleware', g: 'm' },
  hook: { fr: 'hook', g: 'm' },
  logger: { fr: 'journal', g: 'm' },
  log: { fr: 'journal', g: 'm' },
  controller: { fr: 'contrôleur', g: 'm' },
  instance: { fr: 'instance', g: 'f' },
  callback: { fr: 'rappel', g: 'm' },
  wrapper: { fr: 'enveloppe', g: 'f' },
  exception: { fr: 'exception', g: 'f' },
  container: { fr: 'conteneur', g: 'm' },
  consumer: { fr: 'consommateur', g: 'm' },
  socket: { fr: 'socket', g: 'm' },
  metadata: { fr: 'métadonnées', g: 'f', pl: 'métadonnées' },
  pattern: { fr: 'motif', g: 'm' },
  packet: { fr: 'paquet', g: 'm' },
  client: { fr: 'client', g: 'm' },
  transaction: { fr: 'transaction', g: 'f' },
  connection: { fr: 'connexion', g: 'f' },
  sql: { fr: 'SQL', g: 'm' },
  comment: { fr: 'commentaire', g: 'm' },
  version: { fr: 'version', g: 'f' },
  migration: { fr: 'migration', g: 'f' },
  generator: { fr: 'générateur', g: 'm' },
  serializer: { fr: 'sérialiseur', g: 'm' },
  validator: { fr: 'validateur', g: 'm' },
  http: { fr: 'HTTP', g: 'm' },
  json: { fr: 'JSON', g: 'm' },
  address: { fr: 'adresse', g: 'f' },
  info: { fr: 'information', g: 'f', pl: 'informations' },
  host: { fr: 'hôte', g: 'm' },
  env: { fr: 'environnement', g: 'm' },
  cookie: { fr: 'cookie', g: 'm' },
  html: { fr: 'HTML', g: 'm' },
  storage: { fr: 'stockage', g: 'm' },
};

// Accès « propre » à un dictionnaire littéral : évite les clés HÉRITÉES (constructor,
// toString, hasOwnProperty…) qui renverraient une fonction d'Object.prototype.
function own<T>(dict: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(dict, key) ? dict[key] : undefined;
}

function singularize(word: string): { sing: string; plural: boolean } {
  if (word.length > 3 && word.endsWith('ies')) return { sing: `${word.slice(0, -3)}y`, plural: true };
  if (word.length > 3 && word.endsWith('ses')) return { sing: word.slice(0, -2), plural: true };
  if (word.length > 2 && word.endsWith('s') && !word.endsWith('ss')) return { sing: word.slice(0, -1), plural: true };
  return { sing: word, plural: false };
}

function lookup(word: string): { noun: Noun; plural: boolean } {
  const direct = own(GLOSSARY, word);
  if (direct) return { noun: direct, plural: false };
  const { sing, plural } = singularize(word);
  const entry = own(GLOSSARY, sing);
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
  return Boolean(own(GLOSSARY, w) ?? own(GLOSSARY, singularize(w).sing));
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
  // Curation r1 : verbes remontés par `lexluthor scan` (par fréquence).
  normalize: (r) => `normalise ${nounPhrase(r, 'le')}`,
  generate: (r) => `génère ${nounPhrase(r, 'un')}`,
  extract: (r) => `extrait ${nounPhrase(r, 'le')}`,
  setup: (r) => `prépare ${nounPhrase(r, 'le')}`,
  reset: (r) => `réinitialise ${nounPhrase(r, 'le')}`,
  collect: (r) => `rassemble ${nounPhrase(r, 'le')}`,
  classify: (r) => `classe ${nounPhrase(r, 'le')}`,
  analyze: (r) => `analyse ${nounPhrase(r, 'le')}`,
  dispatch: (r) => `distribue ${nounPhrase(r, 'le')}`,
  register: (r) => `enregistre ${nounPhrase(r, 'le')}`,
  convert: (r) => `convertit ${nounPhrase(r, 'le')}`,
  wrap: (r) => `enveloppe ${nounPhrase(r, 'le')}`,
  unwrap: (r) => `déballe ${nounPhrase(r, 'le')}`,
  // Curation r2 : verbes de l'écosystème (scan express/fastify/nest/prisma).
  accept: (r) => `accepte ${nounPhrase(r, 'le')}`,
  escape: (r) => `échappe ${nounPhrase(r, 'le')}`,
  serialize: (r) => `sérialise ${nounPhrase(r, 'le')}`,
  deserialize: (r) => `désérialise ${nounPhrase(r, 'le')}`,
  publish: (r) => `publie ${nounPhrase(r, 'le')}`,
  bind: (r) => `lie ${nounPhrase(r, 'le')}`,
  inject: (r) => `injecte ${nounPhrase(r, 'le')}`,
  inspect: (r) => `inspecte ${nounPhrase(r, 'le')}`,
  compile: (r) => `compile ${nounPhrase(r, 'le')}`,
  connect: (r) => `connecte ${nounPhrase(r, 'le')}`,
  disconnect: (r) => `déconnecte ${nounPhrase(r, 'le')}`,
  migrate: (r) => `migre ${nounPhrase(r, 'le')}`,
  traverse: (r) => `parcourt ${nounPhrase(r, 'le')}`,
  subscribe: (r) => `s'abonne à ${nounPhrase(r, 'le')}`,
};

function elideQue(s: string): string {
  return VOWEL.test(s) ? `qu'${s}` : `que ${s}`;
}

/** Phrase d'intention si l'identifiant commence par un verbe connu, sinon null. */
export function readVerbName(id: string): string | null {
  const words = splitIdentifier(id);
  if (words.length === 0) return null;
  const verb = own(VERB_PREFIXES, words[0]!);
  if (verb) {
    let rest = words.slice(1);
    const byIdx = rest.indexOf('by'); // getUserById -> "récupère l'utilisateur"
    if (byIdx >= 0) rest = rest.slice(0, byIdx);
    return verb(rest).trim();
  }
  // Convention *Of : claimOf/rangeOf/specOf = « obtenir le X de … » -> « détermine {X} ».
  if (words.length >= 2 && words[words.length - 1] === 'of') {
    return `détermine ${nounPhrase(words.slice(0, -1), 'le')}`;
  }
  return null;
}
