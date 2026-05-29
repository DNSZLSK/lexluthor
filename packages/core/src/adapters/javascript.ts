import type { Language } from 'web-tree-sitter';
import type { LanguageAdapter } from '../engine/types';
import { javascriptRules } from '../lexicon/js';
import { createTreeSitterAdapter } from './factory';

/**
 * Adapter JavaScript. Pur : on lui injecte une Language deja chargee (le
 * chargement WASM vit dans loader.ts cote navigateur / dans les helpers de test
 * cote Node), donc l'adapter est testable partout.
 */
export function createJavaScriptAdapter(language: Language): LanguageAdapter {
  return createTreeSitterAdapter({ lang: 'javascript', language, rules: javascriptRules });
}
