import type { Rule } from '../../engine/types';
import { javascriptRules } from '../js';
import { typescriptRules } from './types.rules';

// Le dictionnaire TypeScript = le lexique JS (reutilise integralement) + les
// regles de typage propres a TS.
export const typescriptLexicon: readonly Rule[] = [...typescriptRules, ...javascriptRules];
