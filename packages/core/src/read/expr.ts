import type { SyntaxNode } from '../engine/types';
import { demonstrative, humanizeName, readVerbName, splitIdentifier } from './names';

/**
 * Lit une EXPRESSION en intention (phrase verbe au présent, sans « On »). L'appelant
 * préfixe « On ». `subjectHint` = le nom à gauche d'une affectation (ex: `const user = …`),
 * utilisé comme objet quand le verbe seul manque de complément (`users.get(x)` -> « récupère
 * l'utilisateur »). Retourne `null` si rien de lisible (l'appelant fait alors un littéral
 * fidèle). On ne lit que ce qui est présent, jamais d'invention.
 */
export function readExpr(node: SyntaxNode, subjectHint?: string): string | null {
  switch (node.type) {
    case 'await_expression': {
      const inner = node.namedChildren[0];
      return inner ? readExpr(inner, subjectHint) : null;
    }
    case 'subscript_expression': {
      // OBJ[key] = recherche par clé dans une collection.
      const obj = node.childForFieldName('object');
      const index = node.childForFieldName('index');
      if (obj?.type === 'identifier' && index?.type === 'identifier') {
        return `récupère ${humanizeName(obj.text, 'le', { singular: true })} pour ${demonstrative(index.text)}`;
      }
      return null;
    }
    case 'call_expression':
      return readCall(node, subjectHint);
    case 'new_expression': {
      const ctor = node.childForFieldName('constructor');
      return ctor?.type === 'identifier' ? `crée ${humanizeName(ctor.text, 'un')}` : null;
    }
    default:
      return null;
  }
}

function readCall(node: SyntaxNode, subjectHint?: string): string | null {
  const fn = node.childForFieldName('function');
  if (!fn) return null;

  let methodName: string | null = null;
  if (fn.type === 'member_expression') methodName = fn.childForFieldName('property')?.text ?? null;
  else if (fn.type === 'identifier') methodName = fn.text;
  if (!methodName) return null;

  const verb = readVerbName(methodName);
  if (!verb) return null;

  const firstArg = node.childForFieldName('arguments')?.namedChildren[0];
  if (firstArg?.type === 'identifier') return `${verb} pour ${demonstrative(firstArg.text)}`;

  // Verbe seul (get/load/set…) sans complément : on emprunte le nom de la variable affectée.
  const verbOnly = splitIdentifier(methodName).length === 1;
  if (verbOnly && subjectHint) return `${verb} ${humanizeName(subjectHint, 'le')}`;

  return verb;
}
