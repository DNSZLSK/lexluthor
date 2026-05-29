// Couche LEXICALE : les "mots" de base (declarations, return, throw).
import type { Rule } from '../../engine/types';
import { patternNames } from './_helpers';

export const lexicalRules: Rule[] = [
  {
    id: 'js.declaration',
    layer: 'lexical',
    query: '(lexical_declaration) @site',
    render(ctx) {
      const isLet = ctx.node.child(0)?.text === 'let';
      const decl = ctx.node.namedChildren.find((n) => n.type === 'variable_declarator');
      const nameNode = decl?.childForFieldName('name');
      if (!nameNode) return null;
      if (nameNode.type === 'object_pattern' || nameNode.type === 'array_pattern') {
        const names = patternNames(nameNode);
        const src = nameNode.type === 'array_pattern' ? "d'un tableau" : "d'un objet";
        return names.length
          ? `On récupère ${names.join(', ')} ${src}`
          : `On décompose les valeurs ${src}`;
      }
      const word = isLet ? 'la variable' : 'la constante';
      return `On crée ${word} ${ctx.t.name(nameNode)}`;
    },
    doc: {
      summary: 'Declaration const/let, y compris destructuration.',
      examples: [
        { code: 'const port = 3000;', subtitle: 'On crée la constante port' },
        { code: 'let total = 0;', subtitle: 'On crée la variable total' },
        { code: 'const { name, email } = req.body;', subtitle: "On récupère name, email d'un objet" },
      ],
    },
  },

  {
    id: 'js.return',
    layer: 'lexical',
    query: '(return_statement) @site',
    render(ctx) {
      const value = ctx.node.namedChildren[0];
      if (!value) return 'On sort de la fonction';
      return `On renvoie ${ctx.t.truncate(ctx.text(value), 70)}`;
    },
    doc: {
      summary: 'Instruction return.',
      examples: [
        { code: 'function f() { return total; }', subtitle: 'On renvoie total' },
        { code: 'function f() { return; }', subtitle: 'On sort de la fonction' },
      ],
    },
  },

  {
    id: 'js.throw',
    layer: 'lexical',
    query: '(throw_statement) @site',
    render(ctx) {
      const value = ctx.node.namedChildren[0];
      return `On déclenche une erreur : ${ctx.t.truncate(ctx.text(value), 60)}`;
    },
    doc: {
      summary: 'Instruction throw.',
      examples: [
        {
          code: "function f() { throw new Error('boom'); }",
          subtitle: "On déclenche une erreur : new Error('boom')",
        },
      ],
    },
  },
];
