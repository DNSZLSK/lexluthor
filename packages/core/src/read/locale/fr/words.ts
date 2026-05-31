// Tables de mots FR (reference canonique) : adjectifs de predicats is{X},
// infinitifs de can{X}/should{X}, comparaisons (mots, pas symboles), predicats de
// collection. Les CLES (tokens de code anglais / operateurs) sont partagees ; seuls
// les MOTS changent par locale.
import type { WordTables } from '../types';

const adjectives: Record<string, string> = {
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

const infinitives: Record<string, string> = {
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

const comparisons: Record<string, string> = {
  '===': 'vaut',
  '==': 'vaut',
  '!==': 'ne vaut pas',
  '!=': 'ne vaut pas',
  '<': 'est inférieur à',
  '>': 'est supérieur à',
  '<=': 'est inférieur ou égal à',
  '>=': 'est supérieur ou égal à',
};

const arrayPredicate: Record<string, string> = {
  some: 'au moins un élément correspond',
  every: 'tous les éléments correspondent',
  find: 'un élément correspond',
};

export const WORDS_FR: WordTables = { adjectives, infinitives, comparisons, arrayPredicate };
