// Helpers purs au-dessus de l'arbre tree-sitter. Tout l'acces "bas niveau" aux
// noeuds est concentre ici + dans loader.ts -> point unique a ajuster si l'API
// web-tree-sitter change (R1 du plan).
import type { SourceRange, SyntaxNode } from '../engine/types';

/** Extrait la plage source (index + positions) d'un noeud. */
export function rangeOf(node: SyntaxNode): SourceRange {
  return {
    startIndex: node.startIndex,
    endIndex: node.endIndex,
    startPosition: { row: node.startPosition.row, column: node.startPosition.column },
    endPosition: { row: node.endPosition.row, column: node.endPosition.column },
  };
}

/** Premier enfant (nomme ou non) dont le type est dans `types`. */
export function firstChildOfTypes(node: SyntaxNode, types: ReadonlySet<string>): SyntaxNode | null {
  for (let i = 0; i < node.childCount; i++) {
    const c = node.child(i);
    if (c && types.has(c.type)) return c;
  }
  return null;
}

/** Profondeur d'imbrication = nombre d'ancetres dont le type est un "bloc". */
export function depthOf(node: SyntaxNode, blockTypes: ReadonlySet<string>): number {
  let depth = 0;
  let p = node.parent;
  while (p) {
    if (blockTypes.has(p.type)) depth++;
    p = p.parent;
  }
  return depth;
}

/** Deux intervalles [s,e) se chevauchent-ils ? (les plages d'un AST s'emboitent : chevauchement => imbrication). */
export function intervalsOverlap(
  a: { startIndex: number; endIndex: number },
  b: { startIndex: number; endIndex: number },
): boolean {
  return a.startIndex < b.endIndex && b.startIndex < a.endIndex;
}
