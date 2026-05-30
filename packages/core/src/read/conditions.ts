// Lecture d'une CONDITION (if/while) quand c'est un appel lisible : prédicat
// (user.isValid() -> « l'utilisateur est valide ») ou appartenance (list.includes(x)
// -> « la collection contient cet élément »). Sinon `null` -> littéral fidèle.
// Déterministe : verbes/adjectifs CURÉS uniquement, jamais d'invention.
import type { SyntaxNode } from '../engine/types';
import { demonstrative, humanizeName, isGlossed, nounPhrase, splitIdentifier } from './names';

// Adjectifs des prédicats is{X} (curé, croît par exposition).
const ADJECTIVES: Record<string, string> = {
  valid: 'valide',
  invalid: 'invalide',
  empty: 'vide',
  ready: 'prêt',
  active: 'actif',
  inactive: 'inactif',
  done: 'terminé',
  complete: 'complet',
  present: 'présent',
  absent: 'absent',
  visible: 'visible',
  hidden: 'caché',
  enabled: 'activé',
  disabled: 'désactivé',
  open: 'ouvert',
  closed: 'fermé',
  full: 'plein',
  required: 'requis',
  optional: 'optionnel',
  dirty: 'modifié',
  loading: 'en cours de chargement',
  running: 'en cours',
  selected: 'sélectionné',
};

// Infinitifs des prédicats can{X} / should{X} (curé).
const INFINITIVES: Record<string, string> = {
  edit: 'modifier',
  delete: 'supprimer',
  remove: 'supprimer',
  read: 'lire',
  write: 'écrire',
  create: 'créer',
  update: 'mettre à jour',
  view: 'voir',
  see: 'voir',
  access: 'accéder',
  save: 'enregistrer',
  submit: 'soumettre',
  run: 'exécuter',
  retry: 'réessayer',
};

// Méthodes d'appartenance (exactes). `has` exact = appartenance ; `hasX` = prédicat.
const MEMBERSHIP = new Set(['includes', 'contains', 'has']);

// Prédicats de collection (callback) : arr.some(...) / every / find -> phrase générique.
const ARRAY_PREDICATE: Record<string, string> = {
  some: 'au moins un élément correspond',
  every: 'tous les éléments correspondent',
  find: 'un élément correspond',
};

function unwrap(node: SyntaxNode): SyntaxNode {
  return node.type === 'parenthesized_expression' ? unwrap(node.namedChildren[0] ?? node) : node;
}

/** Lit une condition-appel en français, ou `null` (l'appelant fait alors le littéral fidèle). */
export function readCondition(raw: SyntaxNode | null | undefined): string | null {
  if (!raw) return null;
  const node = unwrap(raw);
  if (node.type !== 'call_expression') return null;
  const fn = node.childForFieldName('function');
  if (fn?.type !== 'member_expression') return null;
  const obj = fn.childForFieldName('object');
  const method = fn.childForFieldName('property')?.text;
  if (!obj || obj.type !== 'identifier' || !method) return null;
  const arg = node.childForFieldName('arguments')?.namedChildren[0];

  // Appartenance : list.includes(item) -> « la collection contient cet élément ».
  if (MEMBERSHIP.has(method)) {
    const what = arg?.type === 'identifier' && isGlossed(arg.text) ? demonstrative(arg.text) : 'cet élément';
    return `la collection contient ${what}`;
  }
  // Prédicat de collection : claimed.some(c => …) -> « au moins un élément correspond ».
  if (ARRAY_PREDICATE[method]) return ARRAY_PREDICATE[method]!;

  const words = splitIdentifier(method);
  const head = words[0];
  const rest = words.slice(1);
  if (!head || rest.length === 0) return null;
  const subj = humanizeName(obj.text, 'le');

  // is{Adj} -> « … est valide » (adjectif curé, sinon littéral).
  if (head === 'is') {
    const adj = ADJECTIVES[rest.join('')] ?? ADJECTIVES[rest[rest.length - 1]!];
    return adj ? `${subj} est ${adj}` : null;
  }
  // has{Noun} -> « … a une erreur ».
  if (head === 'has') return `${subj} a ${nounPhrase(rest, 'un')}`;
  // can{Verb} / should{Verb} -> « … peut modifier » (infinitif curé, sinon littéral).
  if (head === 'can' || head === 'should') {
    const inf = INFINITIVES[rest.join('')] ?? INFINITIVES[rest[rest.length - 1]!];
    return inf ? `${subj} ${head === 'should' ? 'devrait' : 'peut'} ${inf}` : null;
  }
  return null;
}
