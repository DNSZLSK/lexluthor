// English word tables : adjectives for is{X}, infinitives for can{X}/should{X},
// comparison operators, collection predicates. Same KEYS as FR ; English words.
import type { WordTables } from '../types';

const adjectives: Record<string, string> = {
  valid: 'valid',
  invalid: 'invalid',
  empty: 'empty',
  ready: 'ready',
  active: 'active',
  inactive: 'inactive',
  done: 'done',
  complete: 'complete',
  present: 'present',
  absent: 'absent',
  visible: 'visible',
  hidden: 'hidden',
  enabled: 'enabled',
  disabled: 'disabled',
  open: 'open',
  closed: 'closed',
  full: 'full',
  required: 'required',
  optional: 'optional',
  dirty: 'dirty',
  loading: 'loading',
  running: 'running',
  selected: 'selected',
};

const infinitives: Record<string, string> = {
  edit: 'edit',
  delete: 'delete',
  remove: 'remove',
  read: 'read',
  write: 'write',
  create: 'create',
  update: 'update',
  view: 'view',
  see: 'see',
  access: 'access',
  save: 'save',
  submit: 'submit',
  run: 'run',
  retry: 'retry',
};

const comparisons: Record<string, string> = {
  '===': 'equals',
  '==': 'equals',
  '!==': 'does not equal',
  '!=': 'does not equal',
  '<': 'is less than',
  '>': 'is greater than',
  '<=': 'is less than or equal to',
  '>=': 'is greater than or equal to',
};

const arrayPredicate: Record<string, string> = {
  some: 'at least one item matches',
  every: 'all items match',
  find: 'an item matches',
};

export const WORDS_EN: WordTables = { adjectives, infinitives, comparisons, arrayPredicate };
