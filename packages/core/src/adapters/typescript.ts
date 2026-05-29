import type { Language } from 'web-tree-sitter';
import type { LanguageAdapter } from '../engine/types';
import { typescriptLexicon } from '../lexicon/ts';
import { SHARED_BLOCK_TYPES, SHARED_BODY_FIELDS, createTreeSitterAdapter } from './factory';

// TS partage le tronc JS ; on ajoute juste les corps des constructions de typage
// pour les claims 'header' (interface/enum) et la profondeur d'indentation.
const TS_BLOCK_TYPES: ReadonlySet<string> = new Set([...SHARED_BLOCK_TYPES, 'interface_body', 'enum_body']);
const TS_BODY_FIELDS: Readonly<Record<string, string>> = {
  ...SHARED_BODY_FIELDS,
  interface_declaration: 'body',
  enum_declaration: 'body',
};

export function createTypeScriptAdapter(language: Language): LanguageAdapter {
  return createTreeSitterAdapter({
    lang: 'typescript',
    language,
    rules: typescriptLexicon,
    blockTypes: TS_BLOCK_TYPES,
    bodyFieldByType: TS_BODY_FIELDS,
  });
}
