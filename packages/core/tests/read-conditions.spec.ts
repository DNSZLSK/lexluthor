import { Parser } from 'web-tree-sitter';
import type { Language } from 'web-tree-sitter';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLanguage } from './helpers';
import { readCondition } from '../src/read/conditions';
import type { SyntaxNode } from '../src/engine/types';

let parser: Parser;
beforeAll(async () => {
  const lang: Language = await loadLanguage('typescript');
  parser = new Parser();
  parser.setLanguage(lang);
});

/** Parse `const v = EXPR;` et renvoie le nœud de la valeur (l'appel à lire en condition). */
function condOf(expr: string): SyntaxNode {
  const tree = parser.parse(`const v = ${expr};`);
  const decl = tree!.rootNode.namedChildren.find((n) => n.type === 'lexical_declaration')!;
  const vd = decl.namedChildren.find((n) => n.type === 'variable_declarator')!;
  return vd.childForFieldName('value')!;
}

describe('readCondition : appels prédicat / appartenance', () => {
  const reads: ReadonlyArray<[string, string]> = [
    ['list.includes(item)', 'la collection contient cet élément'],
    ['cache.has(key)', 'la collection contient cette clé'],
    ['user.isValid()', "l'utilisateur est valide"],
    ['user.isReady()', "l'utilisateur est prêt"],
    ['user.hasError()', "l'utilisateur a une erreur"],
    ['user.canEdit()', "l'utilisateur peut modifier"],
    ['user.shouldRetry()', "l'utilisateur devrait réessayer"],
    ['claimed.some((c) => f(c))', 'au moins un élément correspond'],
    ['list.every((x) => x.ok)', 'tous les éléments correspondent'],
    ['status === 200', 'status vaut 200'],
    ['count > 0', 'count est supérieur à 0'],
    ['a !== b', 'a ne vaut pas b'],
    ["node.type === 'x'", "node.type vaut 'x'"],
  ];
  for (const [expr, expected] of reads) {
    it(`${expr} -> ${expected}`, () => {
      expect(readCondition(condOf(expr))).toBe(expected);
    });
  }

  const nulls = [
    'a && b', // logique, pas une comparaison
    'foo() === bar()', // opérandes complexes -> littéral fidèle
    'foo()', // appel nu, pas de membre
    'obj.compute()', // verbe ni prédicat ni appartenance
    'cache.get(key)', // get n'est pas un prédicat
    'user.isFoobar()', // adjectif inconnu -> jamais deviner
  ];
  for (const expr of nulls) {
    it(`${expr} -> null (littéral fidèle)`, () => {
      expect(readCondition(condOf(expr))).toBeNull();
    });
  }
});
