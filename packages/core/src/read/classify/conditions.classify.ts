// Classifieur de CONDITION (locale-independant). Decide le KIND lisible et extrait
// les tokens de CODE ; ne produit aucune prose. La phrase est composee par locale
// dans le catalogue. Renvoie null quand rien n'est lisible (l'appelant fait le litteral).
import type { MsgParams } from '../../engine/message';
import type { SyntaxNode } from '../../engine/types';
import {
  ADJECTIVE_TOKENS,
  ARRAY_PREDICATE_TOKENS,
  COMPARISON_OPS,
  INFINITIVE_TOKENS,
  isGlossedHead,
  MEMBERSHIP,
  pickToken,
  splitIdentifier,
} from '../locale/shared';

const OPERAND_TYPES = new Set([
  'identifier', 'property_identifier', 'member_expression', 'subscript_expression',
  'string', 'number', 'true', 'false', 'null', 'undefined', 'this',
]);

function unwrap(node: SyntaxNode): SyntaxNode {
  return node.type === 'parenthesized_expression' ? unwrap(node.namedChildren[0] ?? node) : node;
}

/** Texte d'un operande SIMPLE (nom/acces/litteral court), ou null si code complexe. */
function simpleOperand(node: SyntaxNode | null): string | null {
  if (!node || !OPERAND_TYPES.has(node.type)) return null;
  const text = node.text;
  if (text.length > 30 || /[()<>={}]/.test(text) || text.includes('\n')) return null;
  return text;
}

/**
 * Classe une condition en tokens de code, ou null. Le `kind` discrimine ;
 * les autres champs sont du CODE (operandes, tokens d'adjectif/infinitif, mots).
 */
export function classifyCondition(raw: SyntaxNode | null | undefined): MsgParams | null {
  if (!raw) return null;
  const node = unwrap(raw);

  if (node.type === 'binary_expression') {
    const op = node.childForFieldName('operator')?.text ?? '';
    if (!COMPARISON_OPS.has(op)) return null; // &&, ||, +, … : pas une comparaison
    const left = simpleOperand(node.childForFieldName('left'));
    const right = simpleOperand(node.childForFieldName('right'));
    return left !== null && right !== null ? { kind: 'compare', left, op, right } : null;
  }

  if (node.type !== 'call_expression') return null;
  const fn = node.childForFieldName('function');
  if (fn?.type !== 'member_expression') return null;
  const obj = fn.childForFieldName('object');
  const method = fn.childForFieldName('property')?.text;
  if (!obj || obj.type !== 'identifier' || !method) return null;
  const arg = node.childForFieldName('arguments')?.namedChildren[0];

  // Appartenance : list.includes(item) -> « la collection contient cet element ».
  if (MEMBERSHIP.has(method)) {
    const glossed = arg?.type === 'identifier' && isGlossedHead(arg.text);
    return { kind: 'membership', what: glossed ? splitIdentifier(arg!.text).join(' ') : '' };
  }
  // Predicat de collection : claimed.some(...) -> phrase generique.
  if (ARRAY_PREDICATE_TOKENS.has(method)) return { kind: 'arrayPred', pred: method };

  const words = splitIdentifier(method);
  const head = words[0];
  const rest = words.slice(1);
  if (!head || rest.length === 0) return null;
  const subj = splitIdentifier(obj.text).join(' ');

  if (head === 'is') {
    const adj = pickToken(ADJECTIVE_TOKENS, rest);
    return adj ? { kind: 'is', subj, adj } : null;
  }
  if (head === 'has') return { kind: 'has', subj, rest: rest.join(' ') };
  if (head === 'can' || head === 'should') {
    const inf = pickToken(INFINITIVE_TOKENS, rest);
    return inf ? { kind: 'canShould', subj, mood: head, inf } : null;
  }
  return null;
}
