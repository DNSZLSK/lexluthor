import { Parser } from 'web-tree-sitter';
import type { Language } from 'web-tree-sitter';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLanguage } from './helpers';
import { shapePhrase, valueShape, type ValueShape } from '../src/read/values';
import type { SyntaxNode } from '../src/engine/types';

let parser: Parser;
beforeAll(async () => {
  const lang: Language = await loadLanguage('typescript');
  parser = new Parser();
  parser.setLanguage(lang);
});

/** Parse `const v = EXPR;` et renvoie le nœud de la valeur. */
function valueOf(expr: string): SyntaxNode {
  const tree = parser.parse(`const v = ${expr};`);
  const decl = tree!.rootNode.namedChildren.find((n) => n.type === 'lexical_declaration')!;
  const vd = decl.namedChildren.find((n) => n.type === 'variable_declarator')!;
  return vd.childForFieldName('value')!;
}

describe('valueShape : classement déterministe des valeurs', () => {
  const cases: ReadonlyArray<[string, ValueShape]> = [
    ['3000', 'literal'],
    ["'court'", 'literal'],
    ['null', 'literal'],
    ["'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'", 'shape'], // > 32 car.
    ['foo', 'name'],
    ['tree.rootNode', 'member'],
    ['a.b.c.d.e.f.g.h', 'shape'], // > 3 segments
    ['factory(language)', 'member'], // appel court
    ['{ a: 1 }', 'object'],
    ['[1, 2, 3]', 'array'],
    ['cond ? a : b', 'ternary'],
    ['a ?? b', 'nullish'],
    ['a && b', 'logical'],
    ['a === b', 'compare'],
    ['a + b', 'arith'],
    ['price * 1.2', 'arith'],
    ['`x ${y}`', 'template'],
    ['`brut`', 'literal'], // template sans substitution
    ['(a + b)', 'arith'], // parenthèses pelées
    ['await bar()', 'member'], // await pelé -> appel court
    ['x as Foo', 'name'], // as_expression pelé -> identifiant
  ];
  for (const [expr, expected] of cases) {
    it(`${expr} -> ${expected}`, () => {
      expect(valueShape(valueOf(expr))).toBe(expected);
    });
  }
});

describe('shapePhrase : deux frames', () => {
  it('define : ternaire -> selon une condition', () => {
    expect(shapePhrase(valueOf("a === 'de' ? 'd' : 'l'"), 'define', 'apostropheBase')).toBe(
      'On définit apostropheBase selon une condition',
    );
  });
  it('define : calcul -> on calcule', () => {
    expect(shapePhrase(valueOf('base * 2'), 'define', 'le nombre')).toBe('On calcule le nombre');
  });
  it('define : littéral court reste fidèle', () => {
    expect(shapePhrase(valueOf('3000'), 'define', 'le port')).toBe('On définit le port à 3000');
  });
  it('define : nullish -> valeur par défaut', () => {
    expect(shapePhrase(valueOf('cache ?? fallback'), 'define', "l'utilisateur")).toBe(
      "On définit l'utilisateur, avec une valeur par défaut",
    );
  });
  it('return : template -> un texte composé', () => {
    expect(shapePhrase(valueOf('`Total: ${n}`'), 'return')).toBe('On renvoie un texte composé');
  });
  it('return : comparaison -> résultat d\'une comparaison', () => {
    expect(shapePhrase(valueOf('a === b'), 'return')).toBe("On renvoie le résultat d'une comparaison");
  });
  it('return : objet -> un objet', () => {
    expect(shapePhrase(valueOf('{ id, name }'), 'return')).toBe('On renvoie un objet');
  });
  it('return : appel long -> le résultat', () => {
    expect(shapePhrase(valueOf('this.builder.assemble(everything, withManyArguments, here)'), 'return')).toBe(
      'On renvoie le résultat',
    );
  });
});
