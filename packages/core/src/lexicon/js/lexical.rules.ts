// Couche LEXICALE : déclarations, affectations, return, throw.
// Ces règles LISENT l'intention (via read/) au lieu de paraphraser la syntaxe.
import type { Rule } from '../../engine/types';
import { demonstrative, humanizeName, isGlossed, readExpr } from '../../read';
import { patternNames } from './_helpers';

/** Sujet lisible d'un identifiant : groupe nominal si le nom est « connu », sinon le nom brut. */
function subject(id: string): string {
  return isGlossed(id) ? humanizeName(id, 'le') : id;
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
        // Littéral objet/tableau : on nomme la chose, sans dumper son contenu.
        if (value.type === 'object' || value.type === 'array') return `On définit ${subject(nameNode.text)}`;
        // Sinon : littéral fidèle, nom-aware (jamais inventer).
        return `On définit ${subject(nameNode.text)} à ${ctx.t.truncate(ctx.text(value), 40)}`;
      }
      return `On déclare ${subject(nameNode.text)}`;
    },
    doc: {
      summary: 'Déclaration const/let : on lit la valeur, pas la syntaxe.',
      examples: [
        { code: 'const factory = ADAPTER_FACTORIES[lang];', subtitle: 'On récupère la fabrique d\'adapter pour ce langage' },
        { code: 'const language = await provider.loadGrammar(lang);', subtitle: 'On charge la grammaire pour ce langage' },
        { code: 'const port = 3000;', subtitle: 'On définit le port à 3000' },
        { code: 'const { name, email } = req.body;', subtitle: "On récupère name, email d'un objet" },
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
      const val = right.type === 'identifier' ? humanizeName(right.text, 'le') : ctx.t.truncate(ctx.text(right), 30);

      if (left.type === 'subscript_expression') {
        const obj = left.childForFieldName('object');
        const index = left.childForFieldName('index');
        const isCache = obj ? /cache|map|store|registry|adapters|byId|index/i.test(obj.text) : false;
        let phrase = isCache ? `met ${val} en cache` : `enregistre ${val}`;
        if (index?.type === 'identifier') phrase += ` pour ${demonstrative(index.text)}`;
        return `On ${phrase}`;
      }
      if (left.type === 'member_expression') {
        const prop = left.childForFieldName('property');
        const obj = left.childForFieldName('object');
        if (prop && obj) return `On définit ${humanizeName(prop.text, 'le')} de ${humanizeName(obj.text, 'none')} à ${val}`;
      }
      if (left.type === 'identifier') return `On définit ${subject(left.text)} à ${val}`;
      return null;
    },
    doc: {
      summary: 'Affectation : écriture dans une collection / un champ.',
      examples: [
        { code: 'adapters[lang] = adapter;', subtitle: "On met l'adapter en cache pour ce langage" },
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
      if (value.type === 'object') return 'On renvoie un objet';
      if (value.type === 'array') return 'On renvoie une liste';
      if (value.type === 'identifier') return `On renvoie ${subject(value.text)}`;
      return `On renvoie ${ctx.t.truncate(ctx.text(value), 70)}`; // littéral fidèle (truncate aplatit)
    },
    doc: {
      summary: 'Instruction return : on nomme objet/liste, on lit le sujet.',
      examples: [
        { code: 'function f() { return total; }', subtitle: 'On renvoie total' },
        { code: 'function f() { return adapter; }', subtitle: "On renvoie l'adapter" },
        { code: 'function f() { return { id, name }; }', subtitle: 'On renvoie un objet' },
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
