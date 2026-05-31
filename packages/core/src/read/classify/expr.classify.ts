// Classifieur d'EXPRESSION (locale-independant) : decide comment une expression se
// LIT (lookup, store, new, verbe + complement) et extrait les tokens de CODE. La prose
// (conjugaison, accord) est faite par locale dans le catalogue. null = rien de lisible.
import type { MsgParams } from '../../engine/message';
import type { SyntaxNode } from '../../engine/types';
import { isGlossedHead, LOOKUP_VERBS, readsAsVerb, splitIdentifier, STORE_VERBS } from '../locale/shared';

const words = (id: string): string => splitIdentifier(id).join(' ');

export function classifyExpr(node: SyntaxNode, subjectHint?: string): MsgParams | null {
  switch (node.type) {
    case 'await_expression': {
      const inner = node.namedChildren[0];
      return inner ? classifyExpr(inner, subjectHint) : null;
    }
    case 'subscript_expression': {
      const obj = node.childForFieldName('object');
      const index = node.childForFieldName('index');
      if (obj?.type === 'identifier' && index?.type === 'identifier') {
        return { kind: 'subscriptLookup', obj: words(obj.text), index: words(index.text) };
      }
      return null;
    }
    case 'call_expression':
      return classifyCall(node, subjectHint);
    case 'new_expression': {
      const ctor = node.childForFieldName('constructor');
      return ctor?.type === 'identifier' ? { kind: 'new', ctor: words(ctor.text) } : null;
    }
    default:
      return null;
  }
}

function classifyCall(node: SyntaxNode, subjectHint?: string): MsgParams | null {
  const fn = node.childForFieldName('function');
  if (!fn) return null;
  const args = node.childForFieldName('arguments')?.namedChildren ?? [];
  const firstArg = args[0];

  if (fn.type === 'member_expression') {
    const obj = fn.childForFieldName('object');
    const methodName = fn.childForFieldName('property')?.text ?? null;
    if (!methodName) return null;
    const parts = splitIdentifier(methodName);
    const bareVerb = parts.length === 1 ? parts[0]! : null;

    if (bareVerb && obj?.type === 'identifier' && isGlossedHead(obj.text)) {
      const thing = words(obj.text);
      if (LOOKUP_VERBS.has(bareVerb)) {
        return firstArg?.type === 'identifier'
          ? { kind: 'collectionLookup', name: methodName, obj: thing, index: words(firstArg.text) }
          : { kind: 'collectionLookup', name: methodName, obj: thing };
      }
      if (STORE_VERBS.has(bareVerb) && args.length >= 2 && firstArg?.type === 'identifier') {
        return { kind: 'collectionStore', obj: thing, index: words(firstArg.text) };
      }
    }
    return classifyVerb(methodName, bareVerb != null, firstArg, subjectHint);
  }

  if (fn.type === 'identifier') {
    return classifyVerb(fn.text, splitIdentifier(fn.text).length === 1, firstArg, subjectHint);
  }
  return null;
}

function classifyVerb(
  name: string,
  verbOnly: boolean,
  firstArg: SyntaxNode | null | undefined,
  subjectHint?: string,
): MsgParams | null {
  if (!readsAsVerb(name)) return null;
  const isLookup = LOOKUP_VERBS.has(splitIdentifier(name)[0] ?? '');
  if (firstArg?.type === 'identifier') {
    if (isLookup) return { kind: 'verbLookupKey', name, index: words(firstArg.text) };
    if (verbOnly) return { kind: 'verbObject', name, arg: words(firstArg.text) };
    return { kind: 'verbBare', name };
  }
  if (verbOnly && subjectHint) return { kind: 'verbSubject', name, subject: words(subjectHint) };
  return { kind: 'verbBare', name };
}
