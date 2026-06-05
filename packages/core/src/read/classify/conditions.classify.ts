// Classifieur de CONDITION (locale-independant). Decide le KIND lisible et extrait
// les tokens de CODE ; ne produit aucune prose. La phrase est composee par locale
// dans le catalogue. Compose les booleens &&/||/! en arbre (params imbriques),
// avec cap de clauses et garde de profondeur ; repli litteral fidele sinon.
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

/** Negation logique d'un operateur de comparaison (langue-independant). */
const NEGATE_OP: Readonly<Record<string, string>> = {
  '===': '!==', '!==': '===', '==': '!=', '!=': '==',
  '<': '>=', '>=': '<', '>': '<=', '<=': '>',
};

const MAX_CLAUSES = 3; // au-dela d'une chaine de 3, on tronque (« … »)
const MAX_DEPTH = 2; // imbrication max avant repli litteral fidele

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

/** Mots d'un acces membre simple (a.b.c -> [a, b, c]), ou null si appel/indice/complexe. */
function memberWords(node: SyntaxNode): string[] | null {
  const parts: string[] = [];
  let cur: SyntaxNode | null = node;
  while (cur && cur.type === 'member_expression') {
    const prop = cur.childForFieldName('property');
    if (prop?.type !== 'property_identifier') return null;
    parts.unshift(prop.text);
    cur = cur.childForFieldName('object');
  }
  if (cur?.type === 'identifier') parts.unshift(cur.text);
  else if (cur?.type !== 'this') return null; // this.x -> [x] ; sinon (appel, indice) on renonce
  return parts.length ? parts.flatMap(splitIdentifier) : null;
}

/** Appel de methode lisible : appartenance / predicat de collection / is/has/can. */
function classifyCall(node: SyntaxNode): MsgParams | null {
  if (node.type !== 'call_expression') return null;
  const fn = node.childForFieldName('function');
  if (fn?.type !== 'member_expression') return null;
  const obj = fn.childForFieldName('object');
  const method = fn.childForFieldName('property')?.text;
  if (!obj || obj.type !== 'identifier' || !method) return null;
  const arg = node.childForFieldName('arguments')?.namedChildren[0];

  if (MEMBERSHIP.has(method)) {
    const glossed = arg?.type === 'identifier' && isGlossedHead(arg.text);
    return { kind: 'membership', what: glossed ? splitIdentifier(arg!.text).join(' ') : '' };
  }
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

/** Operande « verite » : identifiant / acces membre simple, lu « X existe ». */
function classifyTruthy(node: SyntaxNode): MsgParams | null {
  if (node.type === 'identifier') {
    return { kind: 'truthy', words: splitIdentifier(node.text).join(' '), glossed: isGlossedHead(node.text) ? 1 : 0, text: node.text };
  }
  if (node.type === 'member_expression') {
    const words = memberWords(node);
    if (words) {
      return { kind: 'truthy', words: words.join(' '), glossed: isGlossedHead(words[words.length - 1]!) ? 1 : 0, text: node.text };
    }
  }
  return null;
}

/** Aplatit une chaine &&/|| de meme operateur, classe chaque clause (cap MAX_CLAUSES). */
function flattenLogical(node: SyntaxNode, op: string, depth: number): MsgParams {
  const flat: SyntaxNode[] = [];
  const collect = (n: SyntaxNode): void => {
    const u = unwrap(n);
    if (u.type === 'binary_expression' && u.childForFieldName('operator')?.text === op) {
      collect(u.childForFieldName('left')!);
      collect(u.childForFieldName('right')!);
    } else {
      flat.push(u);
    }
  };
  collect(node);
  const parts = flat.slice(0, MAX_CLAUSES).map((n) => classifyNode(n, depth + 1, true));
  return flat.length > MAX_CLAUSES ? { kind: 'logical', op, parts, more: 1 } : { kind: 'logical', op, parts };
}

/** Classe un noeud en un MsgParams TOUJOURS renderable (repli litteral fidele). */
function classifyNode(raw: SyntaxNode | null | undefined, depth: number, boolCtx: boolean): MsgParams {
  if (!raw) return { kind: 'literal', text: '' };
  const node = unwrap(raw);
  const text = node.text;
  if (depth > MAX_DEPTH) return { kind: 'literal', text };

  if (node.type === 'binary_expression') {
    const op = node.childForFieldName('operator')?.text ?? '';
    if (COMPARISON_OPS.has(op)) {
      const left = simpleOperand(node.childForFieldName('left'));
      const right = simpleOperand(node.childForFieldName('right'));
      return left !== null && right !== null ? { kind: 'compare', left, op, right } : { kind: 'literal', text };
    }
    if (op === '&&' || op === '||') return flattenLogical(node, op, depth);
    return { kind: 'literal', text };
  }

  if (node.type === 'unary_expression' && node.childForFieldName('operator')?.text === '!') {
    const argNode = unwrap(node.childForFieldName('argument') ?? node);
    // !(a OP b) -> comparaison negative pliee (pas de wrapper « non »).
    if (argNode.type === 'binary_expression') {
      const neg = NEGATE_OP[argNode.childForFieldName('operator')?.text ?? ''];
      if (neg) {
        const left = simpleOperand(argNode.childForFieldName('left'));
        const right = simpleOperand(argNode.childForFieldName('right'));
        if (left !== null && right !== null) return { kind: 'compare', left, op: neg, right };
      }
    }
    return { kind: 'not', inner: classifyNode(argNode, depth + 1, true) };
  }

  const call = classifyCall(node);
  if (call) return call;
  if (boolCtx) {
    const truthy = classifyTruthy(node);
    if (truthy) return truthy;
  }
  return { kind: 'literal', text };
}

/**
 * Classe une condition en tokens de code (arbre), jamais de prose. `boolCtx`
 * (defaut true pour if/while) active la lecture « verite » des operandes nus ;
 * le switch lit son discriminant comme une valeur (boolCtx=false).
 */
export function classifyCondition(raw: SyntaxNode | null | undefined, boolCtx = true): MsgParams | null {
  if (!raw) return null;
  return classifyNode(raw, 0, boolCtx);
}
