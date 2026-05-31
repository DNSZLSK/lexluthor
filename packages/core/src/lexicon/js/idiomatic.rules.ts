// Couche IDIOMATIQUE : les "expressions courantes" reconnues d'un bloc, comme
// "avoir lieu" en francais. On ne les decompose plus, on les lit d'un coup.
// render() ne produit que des CLES + tokens de code ; la prose vit dans le catalogue.
import type { Rule } from '../../engine/types';
import { msg } from '../../engine/message';
import { readsAsVerb } from '../../read/locale/shared';

const ARRAY_METHODS = new Set(['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every']);

// Codes HTTP avec une phrase dediee (sous-catalogue http.status.*). Sinon : forme brute.
const STATUS_CODES = new Set([
  '200', '201', '202', '204', '301', '302', '304', '400', '401',
  '403', '404', '409', '422', '429', '500', '502', '503',
]);

// Constructeur connu -> sous-cle de catalogue (sinon on renonce : jamais deviner).
const NEW_KEYS: Record<string, string> = {
  Map: 'new.map',
  WeakMap: 'new.map',
  Set: 'new.set',
  WeakSet: 'new.set',
  Array: 'new.array',
  Date: 'new.date',
  Promise: 'new.promise',
  RegExp: 'new.regexp',
};

export const idiomaticRules: Rule[] = [
  {
    id: 'js.require',
    layer: 'idiomatic',
    query:
      '(lexical_declaration (variable_declarator value: (call_expression function: (identifier) @_fn arguments: (arguments (string) @mod))) (#eq? @_fn "require")) @site',
    render: (ctx) => msg('import.module', { mod: ctx.raw.lit(ctx.caps.mod) }),
    doc: {
      summary: 'Import CommonJS via require().',
      examples: [
        { code: "const express = require('express');", key: 'import.module', expect: { fr: 'On importe le module express', en: 'We import the express module' } },
      ],
    },
  },

  {
    id: 'js.import',
    layer: 'idiomatic',
    query: '(import_statement source: (string) @mod) @site',
    render(ctx) {
      const mod = ctx.raw.lit(ctx.caps.mod);
      const clause = ctx.node.namedChildren.find((n) => n.type === 'import_clause');
      if (!clause) return msg('import.module', { mod });
      const ns = clause.namedChildren.find((n) => n.type === 'namespace_import');
      const named = clause.namedChildren.find((n) => n.type === 'named_imports');
      const def = clause.namedChildren.find((n) => n.type === 'identifier');
      if (ns) {
        const alias = ns.namedChildren.find((n) => n.type === 'identifier');
        return msg('import.namespace', { mod, alias: alias ? alias.text : '' });
      }
      if (named) {
        const names = named.namedChildren
          .filter((n) => n.type === 'import_specifier')
          .map((spec) => (spec.childForFieldName('name') ?? spec).text);
        if (names.length) return msg('import.named', { names: names.join(', '), mod });
      }
      if (def) return msg('import.default', { name: def.text, mod });
      return msg('import.module', { mod });
    },
    doc: {
      summary: 'Import ESM (defaut, nomme, namespace, bare).',
      examples: [
        { code: "import express from 'express';", key: 'import.default', expect: { fr: 'On importe express depuis le module express', en: 'We import express from the express module' } },
        { code: "import { useState } from 'react';", key: 'import.named', expect: { fr: 'On importe useState depuis le module react', en: 'We import useState from the react module' } },
        { code: "import * as fs from 'fs';", key: 'import.namespace', expect: { fr: 'On importe tout le module fs (sous fs)', en: 'We import the whole fs module (as fs)' } },
      ],
    },
  },

  {
    id: 'js.export',
    layer: 'idiomatic',
    query: '(export_statement) @site',
    render(ctx) {
      const node = ctx.node;
      if (node.childForFieldName('declaration')) return null;
      const source = node.childForFieldName('source');
      const clause = node.namedChildren.find((n) => n.type === 'export_clause');
      if (clause) {
        const names = clause.namedChildren
          .filter((s) => s.type === 'export_specifier')
          .map((s) => (s.childForFieldName('name') ?? s).text);
        if (!names.length) return null;
        const list = names.join(', ');
        return source ? msg('export.reexport', { names: list, mod: ctx.raw.lit(source) }) : msg('export.named', { names: list });
      }
      let hasStar = false;
      for (let i = 0; i < node.childCount; i++) if (node.child(i)?.type === '*') hasStar = true;
      if (hasStar && source) return msg('export.reexportAll', { mod: ctx.raw.lit(source) });
      const value = node.childForFieldName('value');
      if (value) return value.type === 'identifier' ? msg('export.defaultNamed', { name: value.text }) : msg('export.default');
      return null;
    },
    doc: {
      summary: 'export { } / export * / export default : on lit ce qui est exposé.',
      examples: [
        { code: 'export { a, b };', key: 'export.named', expect: { fr: 'On expose a, b', en: 'We expose a, b' } },
        { code: "export { x } from './m';", key: 'export.reexport', expect: { fr: 'On réexporte x depuis le module ./m', en: 'We re-export x from the ./m module' } },
        { code: "export * from './m';", key: 'export.reexportAll', expect: { fr: 'On réexporte tout le module ./m', en: 'We re-export the whole ./m module' } },
        { code: 'export default config;', key: 'export.defaultNamed', expect: { fr: 'On expose config par défaut', en: 'We expose config by default' } },
      ],
    },
  },

  {
    id: 'js.function-declaration',
    layer: 'idiomatic',
    claims: 'header',
    query: '(function_declaration name: (identifier) @name) @site',
    render(ctx) {
      const name = ctx.raw.name(ctx.caps.name);
      if (readsAsVerb(name)) return msg('func.intent', { name });
      const isAsync = ctx.node.child(0)?.text === 'async';
      return msg('func.define', { name, async: isAsync ? 1 : 0 });
    },
    doc: {
      summary: 'Déclaration de fonction : on lit le nom (intention).',
      examples: [
        { code: 'function ensureAdapter(lang) { return a; }', key: 'func.intent', expect: { fr: "On s'assure qu'un adapter existe", en: 'We ensure an adapter exists' } },
        { code: 'function loadGrammar(lang) { return g; }', key: 'func.intent', expect: { fr: 'On charge la grammaire', en: 'We load the grammar' } },
        { code: 'function claimOf(rule) { return c; }', key: 'func.intent', expect: { fr: 'On détermine la revendication', en: 'We determine the claim' } },
        { code: 'function frobnicate() {}', key: 'func.define', expect: { fr: 'On définit la fonction frobnicate', en: 'We define the function frobnicate' } },
      ],
    },
  },

  {
    id: 'js.function-const',
    layer: 'idiomatic',
    claims: 'header',
    query:
      '(lexical_declaration (variable_declarator name: (identifier) @name value: [(arrow_function) (function_expression)] @fn)) @site',
    render(ctx) {
      const name = ctx.raw.name(ctx.caps.name);
      if (readsAsVerb(name)) return msg('func.intent', { name });
      const isAsync = ctx.caps.fn?.child(0)?.text === 'async';
      return msg('func.define', { name, async: isAsync ? 1 : 0 });
    },
    doc: {
      summary: 'Fonction affectée à une const/let (fléchée ou expression).',
      examples: [
        { code: 'const loadGrammar = (lang) => g;', key: 'func.intent', expect: { fr: 'On charge la grammaire', en: 'We load the grammar' } },
        { code: 'const helper = () => {};', key: 'func.define', expect: { fr: 'On définit la fonction helper', en: 'We define the function helper' } },
      ],
    },
  },

  {
    id: 'js.method',
    layer: 'idiomatic',
    claims: 'header',
    query: '(method_definition name: (_) @name) @site',
    render(ctx) {
      const name = ctx.raw.name(ctx.caps.name).replace(/^#/, '');
      if (name === 'constructor') return msg('func.constructor');
      return readsAsVerb(name) ? msg('func.methodIntent', { name }) : msg('func.methodDefine', { name });
    },
    doc: {
      summary: 'Méthode de classe : on lit le nom (intention) ; le constructeur à part.',
      examples: [
        { code: 'class A { getName() { return n; } }', key: 'func.methodIntent', expect: { fr: 'On récupère le nom', en: 'We get the name' } },
        { code: 'class A { constructor() {} }', key: 'func.constructor', expect: { fr: "À la création de l'objet :", en: 'When the object is created:' } },
        { code: 'class A { frobnicate() {} }', key: 'func.methodDefine', expect: { fr: 'On définit la méthode frobnicate', en: 'We define the frobnicate method' } },
      ],
    },
  },

  {
    id: 'js.iife',
    layer: 'idiomatic',
    claims: 'header',
    query: '(call_expression function: (parenthesized_expression [(arrow_function) (function_expression)] @fn)) @site',
    render(ctx) {
      const isAsync = ctx.caps.fn?.child(0)?.text === 'async';
      return msg('func.iife', { async: isAsync ? 1 : 0 });
    },
    doc: {
      summary: 'Fonction immédiatement invoquée (IIFE) : on lit ensuite son corps.',
      examples: [
        { code: '(async () => { await go(); })();', key: 'func.iife', expect: { fr: 'On exécute aussitôt une fonction asynchrone :', en: 'We immediately run an async function:' } },
      ],
    },
  },

  {
    id: 'js.promise-reject',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (identifier) @_o property: (property_identifier) @_p) (#eq? @_o "Promise") (#eq? @_p "reject")) @site',
    render(ctx) {
      const a = ctx.node.childForFieldName('arguments')?.namedChildren[0];
      return a?.type === 'new_expression' ? msg('promise.rejectError') : msg('promise.reject');
    },
    doc: {
      summary: 'Promise.reject (échec).',
      examples: [
        { code: "Promise.reject(new Error('x'));", key: 'promise.rejectError', expect: { fr: 'On rejette avec une erreur', en: 'We reject with an error' } },
      ],
    },
  },

  {
    id: 'js.array-iteration',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression property: (property_identifier) @m) (#any-of? @m "map" "filter" "reduce" "forEach" "find" "some" "every")) @site',
    render: (ctx) => {
      const m = ctx.raw.name(ctx.caps.m);
      return ARRAY_METHODS.has(m) ? msg(`array.${m}`) : null;
    },
    doc: {
      summary: 'Idiomes de parcours/transformation de collection.',
      examples: [
        { code: 'items.map(x => x * 2)', key: 'array.map', expect: { fr: 'On transforme chaque élément de la collection', en: 'We transform each item in the collection' } },
        { code: 'items.filter(x => x > 0)', key: 'array.filter', expect: { fr: 'On garde seulement les éléments qui remplissent une condition', en: 'We keep only the items that meet a condition' } },
        { code: 'items.find(x => x.id === id)', key: 'array.find', expect: { fr: 'On cherche le premier élément qui correspond', en: 'We find the first item that matches' } },
      ],
    },
  },

  {
    id: 'js.console',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (identifier) @o property: (property_identifier) @p) (#eq? @o "console") (#any-of? @p "log" "info" "warn" "error" "debug")) @site',
    render(ctx) {
      const p = ctx.raw.name(ctx.caps.p);
      if (p === 'error') return msg('console.error');
      if (p === 'warn') return msg('console.warn');
      return msg('console.message');
    },
    doc: {
      summary: 'Affichage console.*.',
      examples: [
        { code: "console.log('Serveur démarré');", key: 'console.message', expect: { fr: 'On affiche un message dans la console', en: 'We print a message to the console' } },
        { code: "console.error('échec');", key: 'console.error', expect: { fr: 'On affiche une erreur dans la console', en: 'We print an error to the console' } },
      ],
    },
  },

  {
    id: 'js.new',
    layer: 'idiomatic',
    query: '(new_expression constructor: (identifier) @c) @site',
    render: (ctx) => {
      const key = NEW_KEYS[ctx.raw.name(ctx.caps.c)];
      return key ? msg(key) : null;
    },
    doc: {
      summary: 'Instanciation de types connus (Map, Set, Date, Promise…).',
      examples: [
        { code: 'const users = new Map();', key: 'new.map', expect: { fr: 'On crée un stockage en mémoire (clé vers valeur)', en: 'We create an in-memory store (key to value)' } },
        { code: 'const seen = new Set();', key: 'new.set', expect: { fr: 'On crée un ensemble (valeurs uniques)', en: 'We create a set (unique values)' } },
      ],
    },
  },

  {
    id: 'js.res-status-json',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (call_expression function: (member_expression property: (property_identifier) @_s) arguments: (arguments (number) @code)) property: (property_identifier) @_j) (#eq? @_s "status") (#eq? @_j "json")) @site',
    render: (ctx) => {
      const code = ctx.raw.name(ctx.caps.code);
      return msg(STATUS_CODES.has(code) ? 'http.respondStatus' : 'http.respondStatusRaw', { code });
    },
    doc: {
      summary: 'Reponse HTTP avec code de statut (Express).',
      examples: [
        { code: "res.status(404).json({ error: 'x' });", key: 'http.respondStatus', expect: { fr: 'On répond : pas trouvé (404)', en: 'We respond: not found (404)' } },
        { code: 'res.status(201).json(user);', key: 'http.respondStatus', expect: { fr: 'On répond : créé (201)', en: 'We respond: created (201)' } },
      ],
    },
  },

  {
    id: 'js.res-send',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (identifier) @o property: (property_identifier) @p) (#any-of? @o "res" "response" "reply") (#any-of? @p "json" "send")) @site',
    render: (ctx) => (ctx.raw.name(ctx.caps.p) === 'send' ? msg('http.respondSend') : msg('http.respondJson')),
    doc: {
      summary: 'Reponse HTTP simple (res.json / res.send).',
      examples: [
        { code: 'res.json(user);', key: 'http.respondJson', expect: { fr: 'On renvoie les données au format JSON', en: 'We return the data as JSON' } },
        { code: 'res.send(html);', key: 'http.respondSend', expect: { fr: 'On envoie la réponse', en: 'We send the response' } },
      ],
    },
  },

  {
    id: 'js.express-route',
    layer: 'idiomatic',
    claims: 'header',
    query:
      '(call_expression function: (member_expression object: (identifier) property: (property_identifier) @method) arguments: (arguments (string) @path) (#any-of? @method "get" "post" "put" "patch" "delete")) @site',
    render: (ctx) => msg('http.route', { method: ctx.raw.name(ctx.caps.method), path: ctx.raw.lit(ctx.caps.path) }),
    doc: {
      summary: 'Definition de route HTTP (Express).',
      examples: [
        { code: "app.get('/users', (req, res) => {});", key: 'http.route', expect: { fr: 'Quand on reçoit une requête GET (lecture) sur /users', en: 'When a GET (read) request comes in on /users' } },
        { code: "router.post('/login', handler);", key: 'http.route', expect: { fr: 'Quand on reçoit une requête POST (création) sur /login', en: 'When a POST (create) request comes in on /login' } },
      ],
    },
  },

  {
    id: 'js.listen',
    layer: 'idiomatic',
    claims: 'header',
    query:
      '(call_expression function: (member_expression property: (property_identifier) @_l) arguments: (arguments (number) @port) (#eq? @_l "listen")) @site',
    render: (ctx) => msg('http.listen', { port: ctx.raw.name(ctx.caps.port) }),
    doc: {
      summary: "Demarrage d'un serveur (app.listen).",
      examples: [
        { code: 'app.listen(3000);', key: 'http.listen', expect: { fr: 'On démarre le serveur sur le port 3000', en: 'We start the server on port 3000' } },
      ],
    },
  },

  {
    id: 'js.json',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (identifier) @o property: (property_identifier) @p) (#eq? @o "JSON") (#any-of? @p "parse" "stringify")) @site',
    render: (ctx) => (ctx.raw.name(ctx.caps.p) === 'parse' ? msg('json.parse') : msg('json.stringify')),
    doc: {
      summary: 'JSON.parse / JSON.stringify.',
      examples: [
        { code: 'JSON.parse(body);', key: 'json.parse', expect: { fr: 'On transforme du texte JSON en objet', en: 'We turn JSON text into an object' } },
        { code: 'JSON.stringify(user);', key: 'json.stringify', expect: { fr: 'On transforme une valeur en texte JSON', en: 'We turn a value into JSON text' } },
      ],
    },
  },

  {
    id: 'js.fs',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (identifier) @o property: (property_identifier) @p) (#eq? @o "fs") (#any-of? @p "readFileSync" "readFile" "writeFileSync" "writeFile" "existsSync" "mkdirSync" "readdirSync" "unlinkSync")) @site',
    render(ctx) {
      const p = ctx.raw.name(ctx.caps.p);
      if (p.includes('dir') && p.startsWith('read')) return msg('fs.readDir');
      if (p.startsWith('read')) return msg('fs.read');
      if (p.startsWith('write')) return msg('fs.write');
      if (p === 'existsSync') return msg('fs.exists');
      if (p === 'mkdirSync') return msg('fs.mkdir');
      if (p === 'unlinkSync') return msg('fs.unlink');
      return null;
    },
    doc: {
      summary: 'Opérations fichier (module fs).',
      examples: [
        { code: "fs.readFileSync('config.json');", key: 'fs.read', expect: { fr: "On lit le contenu d'un fichier", en: 'We read the contents of a file' } },
        { code: "fs.writeFileSync('out.txt', data);", key: 'fs.write', expect: { fr: 'On écrit dans un fichier', en: 'We write to a file' } },
      ],
    },
  },

  {
    id: 'js.path',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (identifier) @o property: (property_identifier) @p) (#eq? @o "path") (#any-of? @p "join" "resolve")) @site',
    render: () => msg('path.assemble'),
    doc: {
      summary: 'path.join / path.resolve.',
      examples: [
        { code: "path.join(dir, 'file.txt');", key: 'path.assemble', expect: { fr: 'On assemble un chemin de fichier', en: 'We build a file path' } },
      ],
    },
  },

  {
    id: 'js.object-util',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (identifier) @o property: (property_identifier) @p) (#eq? @o "Object") (#any-of? @p "keys" "values" "entries")) @site',
    render(ctx) {
      const p = ctx.raw.name(ctx.caps.p);
      if (p === 'keys') return msg('object.keys');
      if (p === 'values') return msg('object.values');
      return msg('object.entries');
    },
    doc: {
      summary: 'Object.keys / values / entries.',
      examples: [
        { code: 'Object.keys(user);', key: 'object.keys', expect: { fr: "On récupère les clés de l'objet", en: "We get the object's keys" } },
        { code: 'Object.entries(map);', key: 'object.entries', expect: { fr: "On récupère les paires clé-valeur de l'objet", en: "We get the object's key-value pairs" } },
      ],
    },
  },

  {
    id: 'js.array-mutate',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression property: (property_identifier) @p) (#any-of? @p "push" "pop" "shift" "unshift" "includes")) @site',
    render(ctx) {
      switch (ctx.raw.name(ctx.caps.p)) {
        case 'push':
          return msg('array.push');
        case 'pop':
          return msg('array.pop');
        case 'shift':
          return msg('array.shift');
        case 'unshift':
          return msg('array.unshift');
        case 'includes':
          return msg('array.includesCheck');
        default:
          return null;
      }
    },
    doc: {
      summary: 'Ajout / retrait / test sur une collection.',
      examples: [
        { code: 'items.push(x);', key: 'array.push', expect: { fr: 'On ajoute un élément à la collection', en: 'We add an item to the collection' } },
        { code: 'list.includes(id);', key: 'array.includesCheck', expect: { fr: 'On vérifie si la collection contient cet élément', en: 'We check whether the collection contains this item' } },
      ],
    },
  },

  {
    id: 'js.dom-event',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression property: (property_identifier) @p) (#eq? @p "addEventListener") arguments: (arguments (string) @evt)) @site',
    render: (ctx) => msg('dom.event', { evt: ctx.raw.lit(ctx.caps.evt) }),
    doc: {
      summary: 'addEventListener.',
      examples: [
        { code: "btn.addEventListener('click', onClick);", key: 'dom.event', expect: { fr: "Quand l'évènement click survient, on réagit", en: 'When the click event fires, we react' } },
      ],
    },
  },

  {
    id: 'js.react-hooks',
    layer: 'idiomatic',
    query:
      '(call_expression function: (identifier) @f (#any-of? @f "useState" "useEffect" "useRef" "useMemo" "useCallback" "useContext")) @site',
    render: (ctx) => msg(`react.${ctx.raw.name(ctx.caps.f)}`),
    doc: {
      summary: 'Hooks React.',
      examples: [
        { code: 'useState(0)', key: 'react.useState', expect: { fr: 'On crée un état local réactif', en: 'We create reactive local state' } },
        { code: 'useEffect(() => {}, [])', key: 'react.useEffect', expect: { fr: 'On déclenche un effet (au rendu ou quand une dépendance change)', en: 'We run an effect (on render or when a dependency changes)' } },
      ],
    },
  },

  {
    id: 'js.module-exports',
    layer: 'idiomatic',
    query:
      '(assignment_expression left: (member_expression object: (identifier) @o property: (property_identifier) @p) (#eq? @o "module") (#eq? @p "exports")) @site',
    render: () => msg('commonjs.exports'),
    doc: {
      summary: 'module.exports (CommonJS).',
      examples: [
        { code: 'module.exports = router;', key: 'commonjs.exports', expect: { fr: "On exporte (rend disponible à l'extérieur du module)", en: 'We export (make available outside the module)' } },
      ],
    },
  },
];
