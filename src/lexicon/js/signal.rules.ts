// Couche SIGNAL : patterns a fort signal pour l'audit de code (packages npm).
// Rendus en ROUGE (severity 'alert'). On vise des motifs peu ambigus pour eviter
// la fatigue d'alerte ; les cas dependant du flux de donnees viendront plus tard.
import type { Rule } from '../../engine/types';

export const signalRules: Rule[] = [
  {
    id: 'js.signal.eval',
    layer: 'signal',
    severity: 'alert',
    query: '(call_expression function: (identifier) @_f (#eq? @_f "eval")) @site',
    render: () => '⚠ Exécute du code arbitraire (eval), vecteur d’attaque courant',
    doc: {
      summary: 'Appel a eval().',
      examples: [{ code: 'eval(payload);', subtitle: '⚠ Exécute du code arbitraire (eval), vecteur d’attaque courant' }],
    },
  },

  {
    id: 'js.signal.function-ctor',
    layer: 'signal',
    severity: 'alert',
    query: '(call_expression function: (identifier) @_f (#eq? @_f "Function")) @site',
    render: () => '⚠ Construit et exécute du code à la volée (Function)',
    doc: {
      summary: 'Constructeur Function appele comme fonction.',
      examples: [{ code: 'Function("return process")();', subtitle: '⚠ Construit et exécute du code à la volée (Function)' }],
    },
  },

  {
    id: 'js.signal.function-ctor-new',
    layer: 'signal',
    severity: 'alert',
    query: '(new_expression constructor: (identifier) @_f (#eq? @_f "Function")) @site',
    render: () => '⚠ Construit et exécute du code à la volée (Function)',
    doc: {
      summary: 'Constructeur Function via new.',
      examples: [{ code: 'const f = new Function("x", "return x");', subtitle: '⚠ Construit et exécute du code à la volée (Function)' }],
    },
  },

  {
    id: 'js.signal.base64',
    layer: 'signal',
    severity: 'alert',
    query:
      '(call_expression function: (member_expression object: (identifier) @_o property: (property_identifier) @_p) arguments: (arguments (_) (string) @enc) (#eq? @_o "Buffer") (#eq? @_p "from")) @site',
    test: (_node, ctx) => ctx.t.lit(ctx.caps.enc) === 'base64',
    render: () => '⚠ Décode des données base64 (souvent pour dissimuler une charge utile)',
    doc: {
      summary: 'Decodage base64 via Buffer.from(x, "base64").',
      examples: [
        {
          code: "const s = Buffer.from(data, 'base64').toString();",
          subtitle: '⚠ Décode des données base64 (souvent pour dissimuler une charge utile)',
        },
      ],
    },
  },

  {
    id: 'js.signal.dynamic-call',
    layer: 'signal',
    severity: 'alert',
    // Appel via acces membre dynamique EN CHAINE (obj[a][b](...)) : motif
    // d'obscurcissement frequent (ex: globalThis['pro'+'cess']['exit']()).
    query: '(call_expression function: (subscript_expression object: (subscript_expression))) @site',
    render: () => '⚠ Appel via accès dynamique en chaîne (obscurcissement possible)',
    doc: {
      summary: 'Appel sur acces membre calcule imbrique.',
      examples: [
        { code: "globalThis['pro' + 'cess']['exit']();", subtitle: '⚠ Appel via accès dynamique en chaîne (obscurcissement possible)' },
      ],
    },
  },

  {
    id: 'js.signal.child-process',
    layer: 'signal',
    severity: 'alert',
    query:
      '(call_expression function: (identifier) @_r arguments: (arguments (string) @mod) (#eq? @_r "require")) @site',
    test: (_node, ctx) => ctx.t.lit(ctx.caps.mod) === 'child_process',
    render: () => '⚠ Accès aux commandes système (child_process)',
    doc: {
      summary: "Import de child_process (execution de commandes systeme).",
      examples: [
        { code: "const cp = require('child_process');", subtitle: '⚠ Accès aux commandes système (child_process)' },
      ],
    },
  },
];
