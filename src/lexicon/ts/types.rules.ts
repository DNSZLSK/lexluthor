// Regles SPECIFIQUES a TypeScript : les constructions de typage. Le reste (const,
// fonctions, if, itération, async, signal…) est repris tel quel du lexique JS,
// car tree-sitter-typescript partage les memes types de noeuds que JS.
import type { Rule } from '../../engine/types';

export const typescriptRules: Rule[] = [
  {
    id: 'ts.interface',
    layer: 'idiomatic',
    claims: 'header',
    query: '(interface_declaration name: (type_identifier) @name) @site',
    render: (ctx) => `On définit l'interface ${ctx.t.name(ctx.caps.name)} (la forme d'un objet)`,
    doc: {
      summary: 'Declaration d\'interface.',
      examples: [
        { code: 'interface User { id: string; name: string; }', subtitle: "On définit l'interface User (la forme d'un objet)" },
      ],
    },
  },

  {
    id: 'ts.type-alias',
    layer: 'idiomatic',
    query: '(type_alias_declaration name: (type_identifier) @name) @site',
    render: (ctx) => `On définit le type ${ctx.t.name(ctx.caps.name)}`,
    doc: {
      summary: 'Alias de type.',
      examples: [{ code: 'type ID = string | number;', subtitle: 'On définit le type ID' }],
    },
  },

  {
    id: 'ts.enum',
    layer: 'idiomatic',
    claims: 'header',
    query: '(enum_declaration name: (identifier) @name) @site',
    render: (ctx) => `On définit l'énumération ${ctx.t.name(ctx.caps.name)} (un ensemble de valeurs nommées)`,
    doc: {
      summary: 'Declaration d\'enum.',
      examples: [
        { code: 'enum Role { Admin, User }', subtitle: "On définit l'énumération Role (un ensemble de valeurs nommées)" },
      ],
    },
  },
];
