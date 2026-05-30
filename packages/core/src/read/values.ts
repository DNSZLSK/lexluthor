// Lecture de la FORME d'une valeur, en repli quand `readExpr` ne sait pas la lire
// par son nom. On lit le TYPE d'opération (ternaire, calcul, comparaison, template…)
// sans en inventer le sens. Court et simple -> littéral fidèle ; long ou complexe ->
// phrase de forme. Déterministe : on ne lit que le type de nœud, l'opérateur et la
// longueur du texte. Agnostique du glossaire (le `subject` rendu est passé par l'appelant).
import type { SyntaxNode } from '../engine/types';

const LITERAL_MAX = 32; // longueur de node.text en deçà de laquelle un littéral reste fidèle
const MEMBER_MAX = 3; // segments d'une chaîne membre courte (tree.rootNode = 2, req.params.id = 3)

export type ValueShape =
  | 'literal'
  | 'name'
  | 'member'
  | 'object'
  | 'array'
  | 'template'
  | 'ternary'
  | 'logical'
  | 'nullish'
  | 'compare'
  | 'arith'
  | 'negation'
  | 'shape';

export type Frame = 'define' | 'return';

const COMPARE_OPS = new Set(['===', '!==', '==', '!=', '<', '>', '<=', '>=', 'instanceof', 'in']);
const LOGICAL_OPS = new Set(['&&', '||']);

/** Pèle les enveloppes transparentes pour classer le cœur de l'expression. */
function unwrap(node: SyntaxNode): SyntaxNode {
  switch (node.type) {
    case 'parenthesized_expression':
    case 'await_expression':
    case 'as_expression':
    case 'satisfies_expression':
    case 'non_null_expression':
      return unwrap(node.namedChildren[0] ?? node);
    case 'type_assertion': {
      // <T>expr : l'expression est le dernier enfant nommé (après type_arguments)
      const kids = node.namedChildren;
      return unwrap(kids[kids.length - 1] ?? node);
    }
    default:
      return node;
  }
}

/** Nombre de segments d'une chaîne membre/indice (obj.a.b -> 3). */
function memberSegments(node: SyntaxNode): number {
  let n: SyntaxNode | null = node;
  let count = 1;
  while (n && (n.type === 'member_expression' || n.type === 'subscript_expression')) {
    n = n.childForFieldName('object');
    if (n) count += 1;
  }
  return count;
}

/** Classe une valeur (déclaration / RHS / return) en forme pour un repli lisible. */
export function valueShape(raw: SyntaxNode): ValueShape {
  const node = unwrap(raw);
  const short = node.text.length <= LITERAL_MAX;
  switch (node.type) {
    case 'number':
    case 'string':
    case 'true':
    case 'false':
    case 'null':
    case 'undefined':
    case 'regex':
      return short ? 'literal' : 'shape';
    case 'identifier':
      return 'name';
    case 'member_expression':
    case 'subscript_expression':
    case 'call_expression':
    case 'new_expression':
      // Courte et peu profonde -> littéral fidèle ; sinon générique « le résultat ».
      return short && memberSegments(node) <= MEMBER_MAX ? 'member' : 'shape';
    case 'object':
      return 'object';
    case 'array':
      return 'array';
    case 'template_string': {
      const hasSub = node.namedChildren.some((c) => c.type === 'template_substitution');
      return hasSub ? 'template' : short ? 'literal' : 'shape';
    }
    case 'ternary_expression':
      return 'ternary';
    case 'binary_expression': {
      const op = node.childForFieldName('operator')?.text ?? '';
      if (op === '??') return 'nullish';
      if (LOGICAL_OPS.has(op)) return 'logical';
      if (COMPARE_OPS.has(op)) return 'compare';
      return 'arith';
    }
    case 'unary_expression': {
      const op = node.childForFieldName('operator')?.text ?? '';
      const arg = node.namedChildren[0];
      if ((op === '-' || op === '+' || op === '~') && arg?.type === 'number') return 'literal'; // -1
      if (short) return 'literal'; // !ok, typeof x : court et lisible tel quel
      return op === '!' || op === 'typeof' || op === 'void' ? 'negation' : 'arith';
    }
    default:
      return 'shape';
  }
}

function flat(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Phrase de repli pour une valeur non lisible par son nom. `subject` (déjà rendu)
 * est requis pour le frame 'define'. On lit la FORME, jamais le sens.
 */
export function shapePhrase(raw: SyntaxNode, frame: Frame, subject = ''): string {
  const shape = valueShape(raw);
  const text = flat(unwrap(raw).text);

  if (frame === 'return') {
    switch (shape) {
      case 'literal':
      case 'member':
      case 'name':
        return `On renvoie ${text}`;
      case 'object':
        return 'On renvoie un objet';
      case 'array':
        return 'On renvoie une liste';
      case 'template':
        return 'On renvoie un texte composé';
      case 'ternary':
      case 'logical':
        return 'On renvoie une valeur selon une condition';
      case 'nullish':
        return 'On renvoie une valeur ou sa valeur par défaut';
      case 'compare':
        return "On renvoie le résultat d'une comparaison";
      case 'arith':
        return "On renvoie le résultat d'un calcul";
      case 'negation':
        return "On renvoie le résultat d'une négation";
      default:
        return 'On renvoie le résultat';
    }
  }

  // frame 'define'
  switch (shape) {
    case 'literal':
    case 'member':
    case 'name':
      return `On définit ${subject} à ${text}`;
    case 'object':
    case 'array':
    case 'shape':
      return `On définit ${subject}`;
    case 'template':
      return `On compose ${subject}`;
    case 'ternary':
    case 'logical':
      return `On définit ${subject} selon une condition`;
    case 'nullish':
      return `On définit ${subject}, avec une valeur par défaut`;
    case 'compare':
      return `On définit ${subject} par une comparaison`;
    case 'arith':
      return `On calcule ${subject}`;
    case 'negation':
      return `On définit ${subject} par une négation`;
    default:
      return `On définit ${subject}`;
  }
}
