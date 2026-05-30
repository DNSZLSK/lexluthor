import { Parser } from 'web-tree-sitter';
import type { Language } from 'web-tree-sitter';
import type { LangId, LanguageAdapter, Rule, SyntaxNode } from '../engine/types';

// Constantes partagees JS/TS (tree-sitter-typescript est un sur-ensemble de la
// grammaire JS : memes types de noeuds pour le tronc commun).
export const SHARED_BLOCK_TYPES: ReadonlySet<string> = new Set([
  'statement_block',
  'class_body',
]);

export const SHARED_BODY_FIELDS: Readonly<Record<string, string>> = {
  function_declaration: 'body',
  function_expression: 'body',
  arrow_function: 'body',
  method_definition: 'body',
  generator_function_declaration: 'body',
  if_statement: 'consequence',
  for_statement: 'body',
  for_in_statement: 'body',
  while_statement: 'body',
  do_statement: 'body',
  try_statement: 'body',
  catch_clause: 'body',
  finally_clause: 'body',
};

export const SHARED_FUNCTION_ARG_TYPES: ReadonlySet<string> = new Set([
  'arrow_function',
  'function_expression',
]);

export interface AdapterConfig {
  readonly lang: LangId;
  readonly language: Language;
  readonly rules: readonly Rule[];
  readonly blockTypes?: ReadonlySet<string>;
  readonly bodyFieldByType?: Readonly<Record<string, string>>;
  readonly functionArgTypes?: ReadonlySet<string>;
}

/** Fabrique d'adapter tree-sitter, partagee par tous les langages de la famille JS. */
export function createTreeSitterAdapter(cfg: AdapterConfig): LanguageAdapter {
  const blockTypes = cfg.blockTypes ?? SHARED_BLOCK_TYPES;
  const bodyFields = cfg.bodyFieldByType ?? SHARED_BODY_FIELDS;
  const functionArgTypes = cfg.functionArgTypes ?? SHARED_FUNCTION_ARG_TYPES;

  const parser = new Parser();
  parser.setLanguage(cfg.language);

  function bodyStartIndex(node: SyntaxNode): number | null {
    const field = bodyFields[node.type];
    if (field) {
      const body = node.childForFieldName(field);
      if (body) return body.startIndex;
    }
    // Cas Express : app.get(path, (req, res) => { ... }) -> l'en-tete s'arrete au
    // debut du corps du handler, pour que le corps re-rentre dans le matching.
    if (node.type === 'call_expression') {
      const args = node.childForFieldName('arguments');
      if (args) {
        for (const arg of args.namedChildren) {
          if (functionArgTypes.has(arg.type)) {
            const fnBody = arg.childForFieldName('body');
            if (fnBody) return fnBody.startIndex;
          }
        }
      }
      // Cas IIFE : (async () => { ... })() -> en-tete jusqu'au corps de la fonction immediate.
      const callee = node.childForFieldName('function');
      const fn = callee?.type === 'parenthesized_expression' ? callee.namedChildren[0] : callee;
      if (fn && functionArgTypes.has(fn.type)) {
        const fnBody = fn.childForFieldName('body');
        if (fnBody) return fnBody.startIndex;
      }
    }
    return null;
  }

  return {
    lang: cfg.lang,
    language: cfg.language,
    parse(source: string): SyntaxNode {
      const tree = parser.parse(source);
      if (!tree) throw new Error(`[lexluthor] echec du parsing (${cfg.lang})`);
      return tree.rootNode;
    },
    rules: cfg.rules,
    blockTypes,
    bodyStartIndex,
  };
}
