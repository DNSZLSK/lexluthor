// Couche LEXICALE : déclarations, affectations, return, throw.
// render() ne produit que des CLES + tokens de code ; la prose (intention lue via le
// reader) est composee par locale dans le catalogue. On ne devine jamais (null).
import type { Message, MsgParams } from '../../engine/message';
import { msg } from '../../engine/message';
import type { Rule, RuleContext, SyntaxNode } from '../../engine/types';
import { classifyExpr } from '../../read/classify/expr.classify';
import { shapeOf } from '../../read/classify/values.classify';
import { isGlossedHead, splitIdentifier } from '../../read/locale/shared';
import { patternNames } from './_helpers';

/** Params d'un sujet lisible : mots de code + si la tete est glossee + identifiant brut. */
function subjectParams(id: string): MsgParams {
  return { subjectWords: splitIdentifier(id).join(' '), glossed: isGlossedHead(id) ? 1 : 0, raw: id };
}

/** Complement nominal d'une valeur affectee : on classe sa FORME (jamais de code complexe). */
function complementParams(node: SyntaxNode): MsgParams {
  if (node.type === 'identifier') return { ck: 'name', cw: splitIdentifier(node.text).join(' ') };
  const { shape } = shapeOf(node);
  if (shape === 'literal' || shape === 'member') return { ck: 'text', ct: node.text };
  if (shape === 'object') return { ck: 'object' };
  if (shape === 'array') return { ck: 'array' };
  return { ck: 'value' };
}

/** Lit une valeur (RHS d'une declaration / affectation) : intention lisible, sinon forme. */
function readValue(value: SyntaxNode, name: string): Message {
  const info = classifyExpr(value, name);
  if (info) return msg('expr.read', info);
  const { shape, text } = shapeOf(value);
  return msg('shape.define', { shape, text, ...subjectParams(name) });
}

/**
 * Champ de classe lu comme une déclaration. Partagé entre js.field (`field_definition`,
 * grammaire JS) et ts.field (`public_field_definition`, grammaire TS).
 */
export function renderField(ctx: RuleContext): Message | null {
  const nameNode = ctx.node.childForFieldName('name') ?? ctx.node.childForFieldName('property');
  if (!nameNode) return null;
  const id = nameNode.text.replace(/^#/, ''); // # = champ privé
  const value = ctx.node.childForFieldName('value');
  if (value) return readValue(value, id);
  return msg('decl.declare', subjectParams(id));
}

export const lexicalRules: Rule[] = [
  {
    id: 'js.declaration',
    layer: 'lexical',
    query: '(lexical_declaration) @site',
    render(ctx) {
      const decl = ctx.node.namedChildren.find((n) => n.type === 'variable_declarator');
      const nameNode = decl?.childForFieldName('name');
      if (!decl || !nameNode) return null;

      if (nameNode.type === 'object_pattern' || nameNode.type === 'array_pattern') {
        const names = patternNames(nameNode);
        const src = nameNode.type === 'array_pattern' ? 'array' : 'object';
        return msg('decl.destructure', { names: names.join(', '), src });
      }

      const value = decl.childForFieldName('value');
      if (value) return readValue(value, nameNode.text);
      return msg('decl.declare', subjectParams(nameNode.text));
    },
    doc: {
      summary: 'Déclaration const/let : on lit la valeur, sinon phrase de forme.',
      examples: [
        { code: 'const factory = ADAPTER_FACTORIES[lang];', key: 'expr.read', expect: { fr: "On récupère la fabrique d'adapter pour ce langage", en: 'We get the adapter factory for this language' } },
        { code: 'const language = await provider.loadGrammar(lang);', key: 'expr.read', expect: { fr: 'On charge la grammaire pour ce langage', en: 'We load the grammar for this language' } },
        { code: 'const port = 3000;', key: 'shape.define', expect: { fr: 'On définit le port à 3000', en: 'We set the port to 3000' } },
        { code: 'const { name, email } = req.body;', key: 'decl.destructure', expect: { fr: "On récupère name, email d'un objet", en: 'We extract name, email from an object' } },
        { code: "const apostropheBase = cond ? 'd' : 'l';", key: 'shape.define', expect: { fr: "On définit la base d'apostrophe selon une condition", en: 'We set the apostrophe base based on a condition' } },
        { code: 'const count = base * 2;', key: 'shape.define', expect: { fr: 'On calcule le nombre', en: 'We compute the count' } },
        { code: 'const ok = a === b;', key: 'shape.define', expect: { fr: 'On définit ok par une comparaison', en: 'We set ok from a comparison' } },
        { code: 'const msg = `Total: ${n}`;', key: 'shape.define', expect: { fr: 'On compose le message', en: 'We compose the message' } },
      ],
    },
  },

  {
    id: 'js.field',
    layer: 'lexical',
    langs: ['javascript'],
    query: '(field_definition) @site',
    render: renderField,
    doc: {
      summary: 'Champ de classe (JS) : on lit la valeur comme une déclaration.',
      examples: [
        { code: 'class A { count = 0; }', key: 'shape.define', expect: { fr: 'On définit le nombre à 0', en: 'We set the count to 0' } },
        { code: 'class A { items = []; }', key: 'shape.define', expect: { fr: 'On définit les éléments', en: 'We set the items' } },
      ],
    },
  },

  {
    id: 'js.assignment',
    layer: 'lexical',
    query: '(expression_statement (assignment_expression) @site)',
    render(ctx) {
      const left = ctx.node.childForFieldName('left');
      const right = ctx.node.childForFieldName('right');
      if (!left || !right) return null;

      if (left.type === 'subscript_expression') {
        const obj = left.childForFieldName('object');
        const index = left.childForFieldName('index');
        const isCache = obj ? /cache|map|store|registry|adapters|byId|index/i.test(obj.text) : false;
        return msg('assign.collection', {
          isCache: isCache ? 1 : 0,
          index: index?.type === 'identifier' ? splitIdentifier(index.text).join(' ') : '',
          ...complementParams(right),
        });
      }
      if (left.type === 'member_expression') {
        const prop = left.childForFieldName('property');
        const obj = left.childForFieldName('object');
        if (prop && obj) {
          const base = { prop: splitIdentifier(prop.text).join(' '), ...complementParams(right) };
          if (obj.type === 'this') return msg('assign.field', base);
          return msg('assign.fieldOf', { ...base, obj: splitIdentifier(obj.text).join(' ') });
        }
      }
      if (left.type === 'identifier') return readValue(right, left.text);
      return null;
    },
    doc: {
      summary: 'Affectation : écriture dans une collection / un champ.',
      examples: [
        { code: 'adapters[lang] = adapter;', key: 'assign.collection', expect: { fr: "On met l'adapter en cache pour ce langage", en: 'We cache the adapter for this language' } },
        { code: 'obj[key] = a ? b : c;', key: 'assign.collection', expect: { fr: 'On enregistre une valeur pour cette clé', en: 'We store a value for this key' } },
        { code: 'count = count + 1;', key: 'shape.define', expect: { fr: 'On calcule le nombre', en: 'We compute the count' } },
      ],
    },
  },

  {
    id: 'js.expression',
    layer: 'lexical',
    query: '(expression_statement (_) @expr) @site',
    render(ctx) {
      const expr = ctx.caps.expr;
      if (!expr || expr.type === 'assignment_expression') return null;
      const call = expr.type === 'await_expression' ? expr.namedChildren[0] : expr;
      if (call?.type === 'call_expression') {
        const callArgs = call.childForFieldName('arguments')?.namedChildren ?? [];
        if (callArgs.some((a) => a.type === 'arrow_function' || a.type === 'function_expression')) return null;
      }
      const info = classifyExpr(expr);
      return info ? msg('expr.read', info) : null;
    },
    doc: {
      summary: 'Instruction-expression « nue » (appel/await) : on lit le verbe connu, sinon rien.',
      examples: [
        { code: 'await provider.initEngine();', key: 'expr.read', expect: { fr: 'On initialise le moteur', en: 'We initialize the engine' } },
        { code: 'users.set(id, user);', key: 'expr.read', expect: { fr: "On enregistre l'utilisateur pour cet identifiant", en: 'We store the user for this identifier' } },
      ],
    },
  },

  {
    id: 'js.return',
    layer: 'lexical',
    query: '(return_statement) @site',
    render(ctx) {
      const value = ctx.node.namedChildren[0];
      if (!value) return msg('return.void');
      if (value.type === 'identifier') return msg('return.value', subjectParams(value.text));
      const { shape, text } = shapeOf(value);
      return msg('shape.return', { shape, text });
    },
    doc: {
      summary: 'Instruction return : sujet lisible, sinon phrase de forme.',
      examples: [
        { code: 'function f() { return total; }', key: 'return.value', expect: { fr: 'On renvoie total', en: 'We return total' } },
        { code: 'function f() { return adapter; }', key: 'return.value', expect: { fr: "On renvoie l'adapter", en: 'We return the adapter' } },
        { code: 'function f() { return { id, name }; }', key: 'shape.return', expect: { fr: 'On renvoie un objet', en: 'We return an object' } },
        { code: 'function f() { return a ? b : c; }', key: 'shape.return', expect: { fr: 'On renvoie une valeur selon une condition', en: 'We return a value based on a condition' } },
        { code: 'function f() { return cache ?? fallback; }', key: 'shape.return', expect: { fr: 'On renvoie une valeur ou sa valeur par défaut', en: 'We return a value or its default' } },
        { code: 'function f() { return a - b; }', key: 'shape.return', expect: { fr: "On renvoie le résultat d'un calcul", en: 'We return the result of a computation' } },
        { code: 'function f() { return a === b; }', key: 'shape.return', expect: { fr: "On renvoie le résultat d'une comparaison", en: 'We return the result of a comparison' } },
        { code: 'function f() { return; }', key: 'return.void', expect: { fr: 'On sort de la fonction', en: 'We exit the function' } },
      ],
    },
  },

  {
    id: 'js.throw',
    layer: 'lexical',
    query: '(throw_statement) @site',
    render(ctx) {
      const value = ctx.node.namedChildren[0];
      if (!value) return msg('throw.error');
      const raw = ctx.text(value).replace(/\s+/g, ' ').trim();
      return raw.length <= 48 ? msg('throw.errorShown', { text: raw }) : msg('throw.error');
    },
    doc: {
      summary: 'Instruction throw : erreur courte montrée, sinon générique.',
      examples: [
        { code: "function f() { throw new Error('boom'); }", key: 'throw.errorShown', expect: { fr: "On déclenche une erreur : new Error('boom')", en: "We throw an error: new Error('boom')" } },
        { code: 'function f() { throw new Error(`Unsupported language ${lang} with a very long detail`); }', key: 'throw.error', expect: { fr: 'On déclenche une erreur', en: 'We throw an error' } },
      ],
    },
  },
];
