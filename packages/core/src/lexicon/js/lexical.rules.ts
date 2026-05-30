// Couche LEXICALE : déclarations, affectations, return, throw.
// Ces règles LISENT l'intention (via read/) au lieu de paraphraser la syntaxe.
import type { Interpolator, Rule, RuleContext, SyntaxNode } from '../../engine/types';
import { demonstrative, humanizeName, isGlossed, readExpr, shapePhrase, valueShape } from '../../read';
import { patternNames } from './_helpers';

/** Sujet lisible d'un identifiant : groupe nominal si le nom est « connu », sinon le nom brut. */
function subject(id: string): string {
  return isGlossed(id) ? humanizeName(id, 'le') : id;
}

/** Complément nominal d'une valeur affectée (objet d'« enregistre … »). Jamais de code complexe recopié. */
function valueComplement(node: SyntaxNode, t: Interpolator): string {
  if (node.type === 'identifier') return humanizeName(node.text, 'le');
  const shape = valueShape(node);
  if (shape === 'literal' || shape === 'member') return t.truncate(node.text, 30);
  if (shape === 'object') return 'un objet';
  if (shape === 'array') return 'une liste';
  return 'une valeur'; // ternaire / calcul / comparaison… : nom générique, pas de dump
}

/**
 * Champ de classe lu comme une déclaration. Partagé entre js.field (`field_definition`,
 * grammaire JS) et ts.field (`public_field_definition`, grammaire TS) : mêmes champs
 * `name`/`value`, types de nœud différents selon la grammaire.
 */
export function renderField(ctx: RuleContext): string | null {
  // JS `field_definition` expose le nom via `property` ; TS `public_field_definition` via `name`.
  const nameNode = ctx.node.childForFieldName('name') ?? ctx.node.childForFieldName('property');
  if (!nameNode) return null;
  const id = nameNode.text.replace(/^#/, ''); // # = champ privé
  const value = ctx.node.childForFieldName('value');
  if (value) {
    const read = readExpr(value, id);
    if (read) return `On ${read}`;
    return shapePhrase(value, 'define', subject(id));
  }
  return `On déclare ${subject(id)}`;
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

      // Destructuration : on liste les champs récupérés.
      if (nameNode.type === 'object_pattern' || nameNode.type === 'array_pattern') {
        const names = patternNames(nameNode);
        const src = nameNode.type === 'array_pattern' ? "d'un tableau" : "d'un objet";
        return names.length ? `On récupère ${names.join(', ')} ${src}` : `On décompose les valeurs ${src}`;
      }

      const value = decl.childForFieldName('value');
      if (value) {
        // On LIT l'intention de la valeur (lookup, appel, await, new…), en passant
        // le nom de la variable comme objet possible pour les verbes nus.
        const read = readExpr(value, nameNode.text);
        if (read) return `On ${read}`;
        // Sinon : phrase de FORME (objet, ternaire, calcul, template…), jamais le code brut.
        return shapePhrase(value, 'define', subject(nameNode.text));
      }
      return `On déclare ${subject(nameNode.text)}`;
    },
    doc: {
      summary: 'Déclaration const/let : on lit la valeur, sinon phrase de forme.',
      examples: [
        { code: 'const factory = ADAPTER_FACTORIES[lang];', subtitle: 'On récupère la fabrique d\'adapter pour ce langage' },
        { code: 'const language = await provider.loadGrammar(lang);', subtitle: 'On charge la grammaire pour ce langage' },
        { code: 'const port = 3000;', subtitle: 'On définit le port à 3000' },
        { code: 'const { name, email } = req.body;', subtitle: "On récupère name, email d'un objet" },
        { code: "const apostropheBase = cond ? 'd' : 'l';", subtitle: "On définit la base d'apostrophe selon une condition" },
        { code: 'const count = base * 2;', subtitle: 'On calcule le nombre' },
        { code: 'const ok = a === b;', subtitle: 'On définit ok par une comparaison' },
        { code: 'const msg = `Total: ${n}`;', subtitle: 'On compose le message' },
      ],
    },
  },

  {
    id: 'js.field',
    layer: 'lexical',
    langs: ['javascript'], // la grammaire TS utilise public_field_definition (voir ts.field)
    query: '(field_definition) @site',
    render: renderField,
    doc: {
      summary: 'Champ de classe (JS) : on lit la valeur comme une déclaration.',
      examples: [
        { code: 'class A { count = 0; }', subtitle: 'On définit le nombre à 0' },
        { code: 'class A { items = []; }', subtitle: 'On définit les éléments' },
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
        let phrase = isCache ? `met ${valueComplement(right, ctx.t)} en cache` : `enregistre ${valueComplement(right, ctx.t)}`;
        if (index?.type === 'identifier') phrase += ` pour ${demonstrative(index.text)}`;
        return `On ${phrase}`;
      }
      if (left.type === 'member_expression') {
        const prop = left.childForFieldName('property');
        const obj = left.childForFieldName('object');
        if (prop && obj) {
          const val = valueComplement(right, ctx.t);
          // `this.x = v` : l'objet est soi-même (implicite), on ne dit pas « de this ».
          if (obj.type === 'this') return `On définit ${humanizeName(prop.text, 'le')} à ${val}`;
          return `On définit ${humanizeName(prop.text, 'le')} de ${humanizeName(obj.text, 'none')} à ${val}`;
        }
      }
      if (left.type === 'identifier') {
        // Réaffectation : on lit la valeur (appel/lookup), sinon phrase de forme.
        const read = readExpr(right, left.text);
        if (read) return `On ${read}`;
        return shapePhrase(right, 'define', subject(left.text));
      }
      return null;
    },
    doc: {
      summary: 'Affectation : écriture dans une collection / un champ.',
      examples: [
        { code: 'adapters[lang] = adapter;', subtitle: "On met l'adapter en cache pour ce langage" },
        { code: 'obj[key] = a ? b : c;', subtitle: 'On enregistre une valeur pour cette clé' },
        { code: 'count = count + 1;', subtitle: 'On calcule le nombre' },
      ],
    },
  },

  {
    id: 'js.expression',
    layer: 'lexical',
    query: '(expression_statement (_) @expr) @site',
    render(ctx) {
      const expr = ctx.caps.expr;
      // L'affectation a sa propre regle ; ici les appels / await / new « nus ».
      if (!expr || expr.type === 'assignment_expression') return null;
      // Un appel portant un callback (handle(() => {…})) : on ne le reclame pas en
      // sous-arbre (ca avalerait le corps). Les idiomes utiles (Express, listen…) le couvrent ;
      // sinon on laisse le corps re-rentrer.
      const call = expr.type === 'await_expression' ? expr.namedChildren[0] : expr;
      if (call?.type === 'call_expression') {
        const callArgs = call.childForFieldName('arguments')?.namedChildren ?? [];
        if (callArgs.some((a) => a.type === 'arrow_function' || a.type === 'function_expression')) return null;
      }
      const read = readExpr(expr); // null si verbe inconnu -> pas de sous-titre (jamais deviner)
      return read ? `On ${read}` : null;
    },
    doc: {
      summary: 'Instruction-expression « nue » (appel/await) : on lit le verbe connu, sinon rien.',
      examples: [
        { code: 'await provider.initEngine();', subtitle: 'On initialise le moteur' },
        { code: 'users.set(id, user);', subtitle: "On enregistre l'utilisateur pour cet identifiant" },
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
      if (value.type === 'identifier') return `On renvoie ${subject(value.text)}`;
      // Phrase de FORME (objet, ternaire, calcul, template…) : jamais le code brut.
      return shapePhrase(value, 'return');
    },
    doc: {
      summary: 'Instruction return : sujet lisible, sinon phrase de forme.',
      examples: [
        { code: 'function f() { return total; }', subtitle: 'On renvoie total' },
        { code: 'function f() { return adapter; }', subtitle: "On renvoie l'adapter" },
        { code: 'function f() { return { id, name }; }', subtitle: 'On renvoie un objet' },
        { code: 'function f() { return a ? b : c; }', subtitle: 'On renvoie une valeur selon une condition' },
        { code: 'function f() { return cache ?? fallback; }', subtitle: 'On renvoie une valeur ou sa valeur par défaut' },
        { code: 'function f() { return a - b; }', subtitle: "On renvoie le résultat d'un calcul" },
        { code: 'function f() { return a === b; }', subtitle: "On renvoie le résultat d'une comparaison" },
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
      if (!value) return 'On déclenche une erreur';
      // Court -> on montre l'erreur ; long/complexe -> générique, jamais de code recopié.
      const raw = ctx.text(value).replace(/\s+/g, ' ').trim();
      return raw.length <= 48 ? `On déclenche une erreur : ${raw}` : 'On déclenche une erreur';
    },
    doc: {
      summary: 'Instruction throw : erreur courte montrée, sinon générique.',
      examples: [
        { code: "function f() { throw new Error('boom'); }", subtitle: "On déclenche une erreur : new Error('boom')" },
        {
          code: 'function f() { throw new Error(`Unsupported language ${lang} with a very long detail`); }',
          subtitle: 'On déclenche une erreur',
        },
      ],
    },
  },
];
