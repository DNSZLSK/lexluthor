// Catalogue FR : resout chaque cle de message en phrase francaise. Les entrees
// fonction composent la prose via les helpers (reader par-locale). COPIE 1:1 des
// phrases historiques du lexique (garantit la non-regression FR).
import type { Catalog, LocaleHelpers, MsgParams } from '../../engine/message';

const S = (v: unknown): string => String(v ?? '');
const srcFr = (src: unknown): string => (src === 'array' ? "d'un tableau" : "d'un objet");

function subject(p: MsgParams, h: LocaleHelpers): string {
  return p.glossed ? h.nounPhrase(S(p.subjectWords), 'def') : S(p.raw);
}

function condInner(p: MsgParams, h: LocaleHelpers, max: number): string {
  switch (p.kind) {
    case 'compare':
      return `${S(p.left)} ${h.comparison(S(p.op)) ?? S(p.op)} ${S(p.right)}`;
    case 'membership':
      return `la collection contient ${p.what ? h.demonstrative(S(p.what)) : 'cet élément'}`;
    case 'arrayPred':
      return h.sub(`cond.arrayPred.${S(p.pred)}`);
    case 'is':
      return `${h.nounPhrase(S(p.subj), 'def')} est ${h.adjective(S(p.adj)) ?? S(p.adj)}`;
    case 'has':
      return `${h.nounPhrase(S(p.subj), 'def')} a ${h.nounPhrase(S(p.rest), 'indef')}`;
    case 'canShould':
      return `${h.nounPhrase(S(p.subj), 'def')} ${p.mood === 'should' ? 'devrait' : 'peut'} ${h.infinitive(S(p.inf)) ?? S(p.inf)}`;
    default:
      return h.truncate(S(p.text), max);
  }
}

function exprRead(p: MsgParams, h: LocaleHelpers): string {
  switch (p.kind) {
    case 'subscriptLookup':
      return `récupère ${h.nounPhrase(S(p.obj), 'def', { singular: true })} pour ${h.demonstrative(S(p.index))}`;
    case 'new':
      return `crée ${h.nounPhrase(S(p.ctor), 'indef')}`;
    case 'collectionLookup': {
      const base = `${h.readVerb(S(p.name)) ?? ''} ${h.nounPhrase(S(p.obj), 'def', { singular: true })}`;
      return p.index ? `${base} pour ${h.demonstrative(S(p.index))}` : base;
    }
    case 'collectionStore':
      return `enregistre ${h.nounPhrase(S(p.obj), 'def', { singular: true })} pour ${h.demonstrative(S(p.index))}`;
    case 'verbLookupKey':
      return `${h.readVerb(S(p.name)) ?? ''} pour ${h.demonstrative(S(p.index))}`;
    case 'verbObject':
      return `${h.readVerb(S(p.name)) ?? ''} ${h.nounPhrase(S(p.arg), 'def')}`;
    case 'verbSubject':
      return `${h.readVerb(S(p.name)) ?? ''} ${h.nounPhrase(S(p.subject), 'def')}`;
    default:
      return h.readVerb(S(p.name)) ?? '';
  }
}

function complement(p: MsgParams, h: LocaleHelpers): string {
  switch (p.ck) {
    case 'name':
      return h.nounPhrase(S(p.cw), 'def');
    case 'text':
      return h.truncate(S(p.ct), 30);
    case 'object':
      return 'un objet';
    case 'array':
      return 'une liste';
    default:
      return 'une valeur';
  }
}

function shapeDefine(p: MsgParams, h: LocaleHelpers): string {
  const subj = subject(p, h);
  const text = S(p.text);
  switch (p.shape) {
    case 'literal':
    case 'member':
    case 'name':
      return `On définit ${subj} à ${text}`;
    case 'template':
      return `On compose ${subj}`;
    case 'ternary':
    case 'logical':
      return `On définit ${subj} selon une condition`;
    case 'nullish':
      return `On définit ${subj}, avec une valeur par défaut`;
    case 'compare':
      return `On définit ${subj} par une comparaison`;
    case 'arith':
      return `On calcule ${subj}`;
    case 'negation':
      return `On définit ${subj} par une négation`;
    default:
      return `On définit ${subj}`;
  }
}

function shapeReturn(p: MsgParams, h: LocaleHelpers): string {
  const text = S(p.text);
  switch (p.shape) {
    case 'literal':
    case 'member':
    case 'name':
      return `On renvoie ${text}`;
    case 'object':
      return 'On renvoie un objet';
    case 'array':
      return 'On renvoie une liste';
    case 'template':
      return 'On renvoie un texte composé';
    case 'ternary':
    case 'logical':
      return 'On renvoie une valeur selon une condition';
    case 'nullish':
      return 'On renvoie une valeur ou sa valeur par défaut';
    case 'compare':
      return "On renvoie le résultat d'une comparaison";
    case 'arith':
      return "On renvoie le résultat d'un calcul";
    case 'negation':
      return "On renvoie le résultat d'une négation";
    default:
      return 'On renvoie le résultat';
  }
}

export const catalogFr: Catalog = {
  // --- Signal (alertes) ---
  'signal.eval': '⚠ Exécute du code arbitraire (eval), vecteur d’attaque courant',
  'signal.functionCtor': '⚠ Construit et exécute du code à la volée (Function)',
  'signal.base64': '⚠ Décode des données base64 (souvent pour dissimuler une charge utile)',
  'signal.dynamicCall': '⚠ Appel via accès dynamique en chaîne (obscurcissement possible)',
  'signal.childProcess': '⚠ Accès aux commandes système (child_process)',

  // --- Conditions / boucles / flux ---
  'cond.ifNotExistsGlossed': (p, h) => `Si ${h.noneOf(S(p.words))} n'existe :`,
  'cond.ifNotExists': (p, h) => `Si ${h.truncate(S(p.subject), 40)} n'existe pas :`,
  'cond.if': (p, h) => `Si ${condInner(p, h, 50)} :`,
  'cond.while': (p, h) => `Tant que ${condInner(p, h, 50)} :`,
  'cond.switch': (p, h) => `Selon ${condInner(p, h, 40)} :`,
  'cond.arrayPred.some': 'au moins un élément correspond',
  'cond.arrayPred.every': 'tous les éléments correspondent',
  'cond.arrayPred.find': 'un élément correspond',
  'loop.forOf': (p, h) =>
    `Pour chaque ${p.v ? h.truncate(S(p.v), 30) : 'élément'} de ${p.it ? h.truncate(S(p.it), 30) : 'la collection'} :`,
  'loop.forIn': (p, h) =>
    `Pour chaque clé ${p.v ? h.truncate(S(p.v), 30) : 'élément'} de ${p.it ? h.truncate(S(p.it), 30) : 'la collection'} :`,
  'loop.forClassic': 'On répète en boucle :',
  'flow.try': "On tente l'opération suivante :",
  'flow.catch': (p) => `En cas d'erreur${p.param ? ` (${S(p.param)})` : ''} :`,

  // --- Declarations / valeurs ---
  'decl.destructure': (p) =>
    p.names ? `On récupère ${S(p.names)} ${srcFr(p.src)}` : `On décompose les valeurs ${srcFr(p.src)}`,
  'decl.declare': (p, h) => `On déclare ${subject(p, h)}`,
  'expr.read': (p, h) => `On ${exprRead(p, h)}`,
  'shape.define': (p, h) => shapeDefine(p, h),
  'shape.return': (p, h) => shapeReturn(p, h),
  'assign.collection': (p, h) =>
    `On ${p.isCache ? `met ${complement(p, h)} en cache` : `enregistre ${complement(p, h)}`}${p.index ? ` pour ${h.demonstrative(S(p.index))}` : ''}`,
  'assign.field': (p, h) => `On définit ${h.nounPhrase(S(p.prop), 'def')} à ${complement(p, h)}`,
  'assign.fieldOf': (p, h) =>
    `On définit ${h.nounPhrase(S(p.prop), 'def')} de ${h.nounPhrase(S(p.obj), 'none')} à ${complement(p, h)}`,
  'return.void': 'On sort de la fonction',
  'return.value': (p, h) => `On renvoie ${subject(p, h)}`,
  'throw.error': 'On déclenche une erreur',
  'throw.errorShown': (p) => `On déclenche une erreur : ${S(p.text)}`,

  // --- Imports / exports ---
  'import.module': 'On importe le module {mod}',
  'import.namespace': (p) => `On importe tout le module ${S(p.mod)}${p.alias ? ` (sous ${S(p.alias)})` : ''}`,
  'import.named': 'On importe {names} depuis le module {mod}',
  'import.default': 'On importe {name} depuis le module {mod}',
  'export.named': 'On expose {names}',
  'export.reexport': 'On réexporte {names} depuis le module {mod}',
  'export.reexportAll': 'On réexporte tout le module {mod}',
  'export.defaultNamed': 'On expose {name} par défaut',
  'export.default': 'On expose la valeur par défaut',

  // --- Fonctions ---
  'func.intent': (p, h) => `On ${h.readVerb(S(p.name)) ?? ''}`,
  'func.define': (p) => `On définit la fonction${p.async ? ' asynchrone' : ''} ${S(p.name)}`,
  'func.methodIntent': (p, h) => `On ${h.readVerb(S(p.name)) ?? ''}`,
  'func.methodDefine': 'On définit la méthode {name}',
  'func.constructor': "À la création de l'objet :",
  'func.iife': (p) => `On exécute aussitôt une fonction${p.async ? ' asynchrone' : ''} :`,

  // --- Promesses / collections / console ---
  'promise.rejectError': 'On rejette avec une erreur',
  'promise.reject': 'On rejette la promesse',
  'array.map': 'On transforme chaque élément de la collection',
  'array.filter': 'On garde seulement les éléments qui remplissent une condition',
  'array.reduce': 'On combine tous les éléments en une seule valeur',
  'array.forEach': 'On parcourt chaque élément un par un',
  'array.find': 'On cherche le premier élément qui correspond',
  'array.some': 'On vérifie si au moins un élément correspond',
  'array.every': 'On vérifie si tous les éléments correspondent',
  'array.push': 'On ajoute un élément à la collection',
  'array.pop': 'On retire le dernier élément de la collection',
  'array.shift': 'On retire le premier élément de la collection',
  'array.unshift': 'On ajoute un élément au début de la collection',
  'array.includesCheck': 'On vérifie si la collection contient cet élément',
  'console.message': 'On affiche un message dans la console',
  'console.warn': 'On affiche un avertissement dans la console',
  'console.error': 'On affiche une erreur dans la console',

  // --- new ---
  'new.map': 'On crée un stockage en mémoire (clé vers valeur)',
  'new.set': 'On crée un ensemble (valeurs uniques)',
  'new.array': 'On crée un tableau',
  'new.date': 'On crée une date',
  'new.promise': 'On crée une promesse (opération asynchrone)',
  'new.regexp': 'On crée une expression régulière',

  // --- HTTP / Express ---
  'http.respondStatus': (p, h) => `On répond : ${h.sub(`http.status.${S(p.code)}`)} (${S(p.code)})`,
  'http.respondStatusRaw': (p) => `On répond avec le code ${S(p.code)}`,
  'http.respondJson': 'On renvoie les données au format JSON',
  'http.respondSend': 'On envoie la réponse',
  'http.route': (p, h) => `Quand on reçoit une requête ${h.sub(`http.method.${S(p.method)}`)} sur ${S(p.path)}`,
  'http.listen': 'On démarre le serveur sur le port {port}',
  'http.status.200': 'tout va bien',
  'http.status.201': 'créé',
  'http.status.202': 'accepté',
  'http.status.204': 'rien à renvoyer',
  'http.status.301': 'déplacé définitivement',
  'http.status.302': 'redirigé',
  'http.status.304': 'inchangé',
  'http.status.400': 'requête invalide',
  'http.status.401': 'non authentifié',
  'http.status.403': 'accès interdit',
  'http.status.404': 'pas trouvé',
  'http.status.409': 'conflit',
  'http.status.422': 'données invalides',
  'http.status.429': 'trop de requêtes',
  'http.status.500': 'erreur serveur',
  'http.status.502': 'passerelle invalide',
  'http.status.503': 'service indisponible',
  'http.method.get': 'GET (lecture)',
  'http.method.post': 'POST (création)',
  'http.method.put': 'PUT (remplacement)',
  'http.method.patch': 'PATCH (modification)',
  'http.method.delete': 'DELETE (suppression)',

  // --- Utilitaires ---
  'json.parse': 'On transforme du texte JSON en objet',
  'json.stringify': 'On transforme une valeur en texte JSON',
  'fs.read': "On lit le contenu d'un fichier",
  'fs.readDir': "On liste le contenu d'un dossier",
  'fs.write': 'On écrit dans un fichier',
  'fs.exists': 'On vérifie si un fichier existe',
  'fs.mkdir': 'On crée un dossier',
  'fs.unlink': 'On supprime un fichier',
  'path.assemble': 'On assemble un chemin de fichier',
  'object.keys': "On récupère les clés de l'objet",
  'object.values': "On récupère les valeurs de l'objet",
  'object.entries': "On récupère les paires clé-valeur de l'objet",
  'dom.event': (p) => `Quand l'évènement ${S(p.evt)} survient, on réagit`,
  'react.useState': 'On crée un état local réactif',
  'react.useEffect': 'On déclenche un effet (au rendu ou quand une dépendance change)',
  'react.useRef': 'On garde une référence persistante entre les rendus',
  'react.useMemo': 'On mémorise une valeur calculée',
  'react.useCallback': 'On mémorise une fonction stable entre les rendus',
  'react.useContext': 'On lit une valeur partagée (contexte React)',
  'commonjs.exports': "On exporte (rend disponible à l'extérieur du module)",

  // --- TypeScript ---
  'ts.interface': (p) => `On définit l'interface ${S(p.name)} (la forme d'un objet)`,
  'ts.typeAlias': 'On définit le type {name}',
  'ts.enum': (p) => `On définit l'énumération ${S(p.name)} (un ensemble de valeurs nommées)`,
};
