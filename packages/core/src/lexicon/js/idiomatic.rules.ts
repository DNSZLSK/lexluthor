// Couche IDIOMATIQUE : les "expressions courantes" reconnues d'un bloc, comme
// "avoir lieu" en francais. On ne les decompose plus, on les lit d'un coup.
import type { Rule } from '../../engine/types';
import { readVerbName } from '../../read';
import { httpMethodLabel, statusPhrase } from './_helpers';

const ARRAY_METHOD_PHRASES: Record<string, string> = {
  map: 'On transforme chaque élément de la collection',
  filter: 'On garde seulement les éléments qui remplissent une condition',
  reduce: 'On combine tous les éléments en une seule valeur',
  forEach: 'On parcourt chaque élément un par un',
  find: 'On cherche le premier élément qui correspond',
  some: 'On vérifie si au moins un élément correspond',
  every: 'On vérifie si tous les éléments correspondent',
};

const NEW_PHRASES: Record<string, string> = {
  Map: 'On crée un stockage en mémoire (clé → valeur)',
  WeakMap: 'On crée un stockage en mémoire (clé → valeur)',
  Set: 'On crée un ensemble (valeurs uniques)',
  WeakSet: 'On crée un ensemble (valeurs uniques)',
  Array: 'On crée un tableau',
  Date: 'On crée une date',
  Promise: 'On crée une promesse (opération asynchrone)',
  RegExp: 'On crée une expression régulière',
};

export const idiomaticRules: Rule[] = [
  {
    id: 'js.require',
    layer: 'idiomatic',
    query:
      '(lexical_declaration (variable_declarator value: (call_expression function: (identifier) @_fn arguments: (arguments (string) @mod))) (#eq? @_fn "require")) @site',
    render: (ctx) => `On importe le module ${ctx.t.lit(ctx.caps.mod)}`,
    doc: {
      summary: 'Import CommonJS via require().',
      examples: [{ code: "const express = require('express');", subtitle: 'On importe le module express' }],
    },
  },

  {
    id: 'js.import',
    layer: 'idiomatic',
    query: '(import_statement source: (string) @mod) @site',
    render(ctx) {
      const mod = ctx.t.lit(ctx.caps.mod);
      const clause = ctx.node.namedChildren.find((n) => n.type === 'import_clause');
      if (!clause) return `On importe le module ${mod}`;
      const ns = clause.namedChildren.find((n) => n.type === 'namespace_import');
      const named = clause.namedChildren.find((n) => n.type === 'named_imports');
      const def = clause.namedChildren.find((n) => n.type === 'identifier');
      if (ns) {
        const alias = ns.namedChildren.find((n) => n.type === 'identifier');
        return `On importe tout le module ${mod}${alias ? ` (sous ${alias.text})` : ''}`;
      }
      if (named) {
        const names = named.namedChildren
          .filter((n) => n.type === 'import_specifier')
          .map((spec) => (spec.childForFieldName('name') ?? spec).text);
        if (names.length) return `On importe ${names.join(', ')} depuis le module ${mod}`;
      }
      if (def) return `On importe ${def.text} depuis le module ${mod}`;
      return `On importe le module ${mod}`;
    },
    doc: {
      summary: 'Import ESM (defaut, nomme, namespace, bare).',
      examples: [
        { code: "import express from 'express';", subtitle: 'On importe express depuis le module express' },
        { code: "import { useState } from 'react';", subtitle: 'On importe useState depuis le module react' },
        { code: "import * as fs from 'fs';", subtitle: 'On importe tout le module fs (sous fs)' },
      ],
    },
  },

  {
    id: 'js.function-declaration',
    layer: 'idiomatic',
    claims: 'header',
    query: '(function_declaration name: (identifier) @name) @site',
    render(ctx) {
      const name = ctx.t.name(ctx.caps.name);
      const verb = readVerbName(name); // lit l'intention depuis le nom (ensure/load/get…)
      if (verb) return `On ${verb}`;
      const isAsync = ctx.node.child(0)?.text === 'async';
      return `On définit la fonction${isAsync ? ' asynchrone' : ''} ${name}`;
    },
    doc: {
      summary: 'Déclaration de fonction : on lit le nom (intention).',
      examples: [
        { code: 'function ensureAdapter(lang) { return a; }', subtitle: "On s'assure qu'un adapter existe" },
        { code: 'function loadGrammar(lang) { return g; }', subtitle: 'On charge la grammaire' },
        { code: 'function claimOf(rule) { return c; }', subtitle: 'On détermine la revendication' },
        { code: 'function frobnicate() {}', subtitle: 'On définit la fonction frobnicate' },
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
      const name = ctx.t.name(ctx.caps.name);
      const verb = readVerbName(name);
      if (verb) return `On ${verb}`;
      const isAsync = ctx.caps.fn?.child(0)?.text === 'async';
      return `On définit la fonction${isAsync ? ' asynchrone' : ''} ${name}`;
    },
    doc: {
      summary: 'Fonction affectée à une const/let (fléchée ou expression).',
      examples: [
        { code: 'const loadGrammar = (lang) => g;', subtitle: 'On charge la grammaire' },
        { code: 'const helper = () => {};', subtitle: 'On définit la fonction helper' },
      ],
    },
  },

  {
    id: 'js.iife',
    layer: 'idiomatic',
    claims: 'header', // le corps de la fonction immediate re-rentre et est lu ligne a ligne
    query: '(call_expression function: (parenthesized_expression [(arrow_function) (function_expression)] @fn)) @site',
    render(ctx) {
      const isAsync = ctx.caps.fn?.child(0)?.text === 'async';
      return `On exécute aussitôt une fonction${isAsync ? ' asynchrone' : ''} :`;
    },
    doc: {
      summary: 'Fonction immédiatement invoquée (IIFE) : on lit ensuite son corps.',
      examples: [
        { code: '(async () => { await go(); })();', subtitle: 'On exécute aussitôt une fonction asynchrone :' },
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
      return a?.type === 'new_expression' ? 'On rejette avec une erreur' : 'On rejette la promesse';
    },
    doc: {
      summary: 'Promise.reject (échec).',
      examples: [{ code: "Promise.reject(new Error('x'));", subtitle: 'On rejette avec une erreur' }],
    },
  },

  {
    id: 'js.array-iteration',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression property: (property_identifier) @m) (#any-of? @m "map" "filter" "reduce" "forEach" "find" "some" "every")) @site',
    render: (ctx) => ARRAY_METHOD_PHRASES[ctx.t.name(ctx.caps.m)] ?? null,
    doc: {
      summary: 'Idiomes de parcours/transformation de collection.',
      examples: [
        { code: 'items.map(x => x * 2)', subtitle: 'On transforme chaque élément de la collection' },
        { code: 'items.filter(x => x > 0)', subtitle: 'On garde seulement les éléments qui remplissent une condition' },
        { code: 'items.find(x => x.id === id)', subtitle: 'On cherche le premier élément qui correspond' },
      ],
    },
  },

  {
    id: 'js.console',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (identifier) @o property: (property_identifier) @p) (#eq? @o "console") (#any-of? @p "log" "info" "warn" "error" "debug")) @site',
    render(ctx) {
      const p = ctx.t.name(ctx.caps.p);
      if (p === 'error') return 'On affiche une erreur dans la console';
      if (p === 'warn') return 'On affiche un avertissement dans la console';
      return 'On affiche un message dans la console';
    },
    doc: {
      summary: 'Affichage console.*.',
      examples: [
        { code: "console.log('Serveur démarré');", subtitle: 'On affiche un message dans la console' },
        { code: "console.error('échec');", subtitle: 'On affiche une erreur dans la console' },
      ],
    },
  },

  {
    id: 'js.new',
    layer: 'idiomatic',
    query: '(new_expression constructor: (identifier) @c) @site',
    // On ne sous-titre QUE les constructeurs bien compris. Sinon on renonce
    // (jamais deviner) -> la declaration/throw englobante reprend la main.
    render: (ctx) => NEW_PHRASES[ctx.t.name(ctx.caps.c)] ?? null,
    doc: {
      summary: 'Instanciation de types connus (Map, Set, Date, Promise…).',
      examples: [
        { code: 'const users = new Map();', subtitle: 'On crée un stockage en mémoire (clé → valeur)' },
        { code: 'const seen = new Set();', subtitle: 'On crée un ensemble (valeurs uniques)' },
      ],
    },
  },

  {
    id: 'js.res-status-json',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (call_expression function: (member_expression property: (property_identifier) @_s) arguments: (arguments (number) @code)) property: (property_identifier) @_j) (#eq? @_s "status") (#eq? @_j "json")) @site',
    render: (ctx) => {
      const code = ctx.t.name(ctx.caps.code);
      return `On répond : ${statusPhrase(code)} (${code})`;
    },
    doc: {
      summary: 'Reponse HTTP avec code de statut (Express).',
      examples: [
        { code: "res.status(404).json({ error: 'x' });", subtitle: 'On répond : pas trouvé (404)' },
        { code: "res.status(201).json(user);", subtitle: 'On répond : créé (201)' },
      ],
    },
  },

  {
    id: 'js.res-send',
    layer: 'idiomatic',
    // Contraint a un objet "reponse" (res/response/reply) pour eviter de prendre
    // express.json() (middleware) ou autres .json() sans rapport pour une reponse.
    query:
      '(call_expression function: (member_expression object: (identifier) @o property: (property_identifier) @p) (#any-of? @o "res" "response" "reply") (#any-of? @p "json" "send")) @site',
    render: (ctx) => (ctx.t.name(ctx.caps.p) === 'send' ? 'On envoie la réponse' : 'On renvoie les données au format JSON'),
    doc: {
      summary: 'Reponse HTTP simple (res.json / res.send).',
      examples: [
        { code: 'res.json(user);', subtitle: 'On renvoie les données au format JSON' },
        { code: 'res.send(html);', subtitle: 'On envoie la réponse' },
      ],
    },
  },

  {
    id: 'js.express-route',
    layer: 'idiomatic',
    claims: 'header',
    query:
      '(call_expression function: (member_expression object: (identifier) property: (property_identifier) @method) arguments: (arguments (string) @path) (#any-of? @method "get" "post" "put" "patch" "delete")) @site',
    render: (ctx) =>
      `Quand on reçoit une requête ${httpMethodLabel(ctx.t.name(ctx.caps.method))} sur ${ctx.t.lit(ctx.caps.path)}`,
    doc: {
      summary: 'Definition de route HTTP (Express).',
      examples: [
        { code: "app.get('/users', (req, res) => {});", subtitle: 'Quand on reçoit une requête GET (lecture) sur /users' },
        { code: "router.post('/login', handler);", subtitle: 'Quand on reçoit une requête POST (création) sur /login' },
      ],
    },
  },

  {
    id: 'js.listen',
    layer: 'idiomatic',
    claims: 'header', // ne pas avaler le callback (ex: le console.log de demarrage)
    query:
      '(call_expression function: (member_expression property: (property_identifier) @_l) arguments: (arguments (number) @port) (#eq? @_l "listen")) @site',
    render: (ctx) => `On démarre le serveur sur le port ${ctx.t.name(ctx.caps.port)}`,
    doc: {
      summary: 'Demarrage d\'un serveur (app.listen).',
      examples: [{ code: 'app.listen(3000);', subtitle: 'On démarre le serveur sur le port 3000' }],
    },
  },

  {
    id: 'js.json',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (identifier) @o property: (property_identifier) @p) (#eq? @o "JSON") (#any-of? @p "parse" "stringify")) @site',
    render: (ctx) =>
      ctx.t.name(ctx.caps.p) === 'parse' ? 'On transforme du texte JSON en objet' : 'On transforme une valeur en texte JSON',
    doc: {
      summary: 'JSON.parse / JSON.stringify.',
      examples: [
        { code: 'JSON.parse(body);', subtitle: 'On transforme du texte JSON en objet' },
        { code: 'JSON.stringify(user);', subtitle: 'On transforme une valeur en texte JSON' },
      ],
    },
  },

  {
    id: 'js.fs',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (identifier) @o property: (property_identifier) @p) (#eq? @o "fs") (#any-of? @p "readFileSync" "readFile" "writeFileSync" "writeFile" "existsSync" "mkdirSync" "readdirSync" "unlinkSync")) @site',
    render(ctx) {
      const p = ctx.t.name(ctx.caps.p);
      if (p.includes('dir') && p.startsWith('read')) return "On liste le contenu d'un dossier";
      if (p.startsWith('read')) return "On lit le contenu d'un fichier";
      if (p.startsWith('write')) return 'On écrit dans un fichier';
      if (p === 'existsSync') return 'On vérifie si un fichier existe';
      if (p === 'mkdirSync') return 'On crée un dossier';
      if (p === 'unlinkSync') return 'On supprime un fichier';
      return null;
    },
    doc: {
      summary: 'Opérations fichier (module fs).',
      examples: [
        { code: "fs.readFileSync('config.json');", subtitle: "On lit le contenu d'un fichier" },
        { code: "fs.writeFileSync('out.txt', data);", subtitle: 'On écrit dans un fichier' },
      ],
    },
  },

  {
    id: 'js.path',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (identifier) @o property: (property_identifier) @p) (#eq? @o "path") (#any-of? @p "join" "resolve")) @site',
    render: () => 'On assemble un chemin de fichier',
    doc: {
      summary: 'path.join / path.resolve.',
      examples: [{ code: "path.join(dir, 'file.txt');", subtitle: 'On assemble un chemin de fichier' }],
    },
  },

  {
    id: 'js.object-util',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression object: (identifier) @o property: (property_identifier) @p) (#eq? @o "Object") (#any-of? @p "keys" "values" "entries")) @site',
    render(ctx) {
      const p = ctx.t.name(ctx.caps.p);
      if (p === 'keys') return "On récupère les clés de l'objet";
      if (p === 'values') return "On récupère les valeurs de l'objet";
      return "On récupère les paires clé-valeur de l'objet";
    },
    doc: {
      summary: 'Object.keys / values / entries.',
      examples: [
        { code: 'Object.keys(user);', subtitle: "On récupère les clés de l'objet" },
        { code: 'Object.entries(map);', subtitle: "On récupère les paires clé-valeur de l'objet" },
      ],
    },
  },

  {
    id: 'js.array-mutate',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression property: (property_identifier) @p) (#any-of? @p "push" "pop" "shift" "unshift" "includes")) @site',
    render(ctx) {
      switch (ctx.t.name(ctx.caps.p)) {
        case 'push':
          return 'On ajoute un élément à la collection';
        case 'pop':
          return 'On retire le dernier élément de la collection';
        case 'shift':
          return 'On retire le premier élément de la collection';
        case 'unshift':
          return 'On ajoute un élément au début de la collection';
        case 'includes':
          return 'On vérifie si la collection contient cet élément';
        default:
          return null;
      }
    },
    doc: {
      summary: 'Ajout / retrait / test sur une collection.',
      examples: [
        { code: 'items.push(x);', subtitle: 'On ajoute un élément à la collection' },
        { code: 'list.includes(id);', subtitle: 'On vérifie si la collection contient cet élément' },
      ],
    },
  },

  {
    id: 'js.dom-event',
    layer: 'idiomatic',
    query:
      '(call_expression function: (member_expression property: (property_identifier) @p) (#eq? @p "addEventListener") arguments: (arguments (string) @evt)) @site',
    render: (ctx) => `Quand l'évènement ${ctx.t.lit(ctx.caps.evt)} survient, on réagit`,
    doc: {
      summary: 'addEventListener.',
      examples: [{ code: "btn.addEventListener('click', onClick);", subtitle: "Quand l'évènement click survient, on réagit" }],
    },
  },

  {
    id: 'js.react-hooks',
    layer: 'idiomatic',
    query:
      '(call_expression function: (identifier) @f (#any-of? @f "useState" "useEffect" "useRef" "useMemo" "useCallback" "useContext")) @site',
    render(ctx) {
      switch (ctx.t.name(ctx.caps.f)) {
        case 'useState':
          return 'On crée un état local réactif';
        case 'useEffect':
          return 'On déclenche un effet (au rendu ou quand une dépendance change)';
        case 'useRef':
          return 'On garde une référence persistante entre les rendus';
        case 'useMemo':
          return 'On mémorise une valeur calculée';
        case 'useCallback':
          return 'On mémorise une fonction stable entre les rendus';
        case 'useContext':
          return 'On lit une valeur partagée (contexte React)';
        default:
          return null;
      }
    },
    doc: {
      summary: 'Hooks React.',
      examples: [
        { code: 'useState(0)', subtitle: 'On crée un état local réactif' },
        { code: 'useEffect(() => {}, [])', subtitle: 'On déclenche un effet (au rendu ou quand une dépendance change)' },
      ],
    },
  },

  {
    id: 'js.module-exports',
    layer: 'idiomatic',
    query:
      '(assignment_expression left: (member_expression object: (identifier) @o property: (property_identifier) @p) (#eq? @o "module") (#eq? @p "exports")) @site',
    render: () => "On exporte (rend disponible à l'extérieur du module)",
    doc: {
      summary: 'module.exports (CommonJS).',
      examples: [{ code: 'module.exports = router;', subtitle: "On exporte (rend disponible à l'extérieur du module)" }],
    },
  },
];
