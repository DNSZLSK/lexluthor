// Regles SPECIFIQUES a TypeScript : les constructions de typage. Le reste (const,
// fonctions, if, itération, async, signal…) est repris tel quel du lexique JS,
// car tree-sitter-typescript partage les memes types de noeuds que JS.
import type { Rule } from '../../engine/types';
import { msg } from '../../engine/message';
import { renderField } from '../js/lexical.rules';

export const typescriptRules: Rule[] = [
  {
    id: 'ts.field',
    layer: 'lexical',
    query: '(public_field_definition) @site', // équivalent TS de field_definition (JS) -> js.field
    render: renderField,
    doc: {
      summary: 'Champ de classe (TS) : on lit la valeur comme une déclaration.',
      examples: [
        { code: 'class A { count = 0; }', key: 'shape.define', expect: { fr: 'On définit le nombre à 0', en: 'We set the count to 0' } },
        { code: 'class A { private items: number[] = []; }', key: 'shape.define', expect: { fr: 'On définit les éléments', en: 'We set the items' } },
      ],
    },
  },

  {
    id: 'ts.interface',
    layer: 'idiomatic',
    claims: 'header',
    query: '(interface_declaration name: (type_identifier) @name) @site',
    render: (ctx) => msg('ts.interface', { name: ctx.raw.name(ctx.caps.name) }),
    doc: {
      summary: "Declaration d'interface.",
      examples: [
        { code: 'interface User { id: string; name: string; }', key: 'ts.interface', expect: { fr: "On définit l'interface User (la forme d'un objet)", en: 'We define the User interface (the shape of an object)' } },
      ],
    },
  },

  {
    id: 'ts.type-alias',
    layer: 'idiomatic',
    query: '(type_alias_declaration name: (type_identifier) @name) @site',
    render: (ctx) => msg('ts.typeAlias', { name: ctx.raw.name(ctx.caps.name) }),
    doc: {
      summary: 'Alias de type.',
      examples: [{ code: 'type ID = string | number;', key: 'ts.typeAlias', expect: { fr: 'On définit le type ID', en: 'We define the ID type' } }],
    },
  },

  {
    id: 'ts.enum',
    layer: 'idiomatic',
    claims: 'header',
    query: '(enum_declaration name: (identifier) @name) @site',
    render: (ctx) => msg('ts.enum', { name: ctx.raw.name(ctx.caps.name) }),
    doc: {
      summary: "Declaration d'enum.",
      examples: [
        { code: 'enum Role { Admin, User }', key: 'ts.enum', expect: { fr: "On définit l'énumération Role (un ensemble de valeurs nommées)", en: 'We define the Role enum (a set of named values)' } },
      ],
    },
  },
];
