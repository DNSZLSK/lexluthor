// Tablas de palabras ES (AMORCE / seed). Mismas claves que FR ; palabras espanolas.
// Parcial : las claves no traducidas recurren al texto del codigo. Crece con la curacion.
import type { WordTables } from '../types';

const adjectives: Record<string, string> = {
  valid: 'válido',
  invalid: 'inválido',
  empty: 'vacío',
  ready: 'listo',
  active: 'activo',
  inactive: 'inactivo',
  done: 'terminado',
  complete: 'completo',
  present: 'presente',
  absent: 'ausente',
  visible: 'visible',
  hidden: 'oculto',
  enabled: 'activado',
  disabled: 'desactivado',
  open: 'abierto',
  closed: 'cerrado',
  full: 'lleno',
  required: 'requerido',
  optional: 'opcional',
};

const infinitives: Record<string, string> = {
  edit: 'editar',
  delete: 'eliminar',
  remove: 'eliminar',
  read: 'leer',
  write: 'escribir',
  create: 'crear',
  update: 'actualizar',
  view: 'ver',
  see: 'ver',
  access: 'acceder',
  save: 'guardar',
};

const comparisons: Record<string, string> = {
  '===': 'es igual a',
  '==': 'es igual a',
  '!==': 'no es igual a',
  '!=': 'no es igual a',
  '<': 'es menor que',
  '>': 'es mayor que',
  '<=': 'es menor o igual que',
  '>=': 'es mayor o igual que',
};

const arrayPredicate: Record<string, string> = {
  some: 'al menos un elemento coincide',
  every: 'todos los elementos coinciden',
  find: 'un elemento coincide',
};

export const WORDS_ES: WordTables = { adjectives, infinitives, comparisons, arrayPredicate };
