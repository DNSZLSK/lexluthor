import type { Rule } from '../../engine/types';
import { lexicalRules } from './lexical.rules';
import { idiomaticRules } from './idiomatic.rules';
import { compositionalRules } from './compositional.rules';
import { signalRules } from './signal.rules';

/** Le dictionnaire JavaScript : toutes les regles, toutes couches confondues. */
export const javascriptRules: readonly Rule[] = [
  ...signalRules,
  ...compositionalRules,
  ...idiomaticRules,
  ...lexicalRules,
];
