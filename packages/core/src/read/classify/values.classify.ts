// Classification de FORME (deja pure dans read/values.ts) : on reexpose valueShape et
// le texte aplati du coeur de l'expression. La PHRASE de forme est composee par locale
// dans le catalogue (ex-shapePhrase), pas ici.
import type { SyntaxNode } from '../../engine/types';
import { valueShape, type ValueShape } from '../values';

export { valueShape, type ValueShape } from '../values';

function unwrap(node: SyntaxNode): SyntaxNode {
  switch (node.type) {
    case 'parenthesized_expression':
    case 'await_expression':
    case 'as_expression':
    case 'satisfies_expression':
    case 'non_null_expression':
      return unwrap(node.namedChildren[0] ?? node);
    case 'type_assertion': {
      const kids = node.namedChildren;
      return unwrap(kids[kids.length - 1] ?? node);
    }
    default:
      return node;
  }
}

/** Forme + texte aplati du coeur de l'expression (pour les phrases de forme du catalogue). */
export function shapeOf(raw: SyntaxNode): { shape: ValueShape; text: string } {
  return { shape: valueShape(raw), text: unwrap(raw).text.replace(/\s+/g, ' ').trim() };
}
