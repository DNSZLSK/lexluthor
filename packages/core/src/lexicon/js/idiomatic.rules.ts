// Couche IDIOMATIQUE : les "expressions courantes" reconnues d'un bloc, comme
// "avoir lieu" en francais. On ne les decompose plus, on les lit d'un coup.
import type { Rule } from '../../engine/types';
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
      const isAsync = ctx.node.child(0)?.text === 'async';
      return `On définit la fonction${isAsync ? ' asynchrone' : ''} ${ctx.t.name(ctx.caps.name)}`;
    },
    doc: {
      summary: 'Declaration de fonction (sync/async).',
      examples: [
        { code: 'function add(a, b) { return a + b; }', subtitle: 'On définit la fonction add' },
        { code: 'async function load() { await go(); }', subtitle: 'On définit la fonction asynchrone load' },
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
      const fn = ctx.caps.fn;
      const isAsync = fn?.child(0)?.text === 'async';
      return `On définit la fonction${isAsync ? ' asynchrone' : ''} ${ctx.t.name(ctx.caps.name)}`;
    },
    doc: {
      summary: 'Fonction affectee a une const/let (fleche ou expression).',
      examples: [
        { code: 'const add = (a, b) => a + b;', subtitle: 'On définit la fonction add' },
        { code: 'const load = async () => { await go(); };', subtitle: 'On définit la fonction asynchrone load' },
      ],
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
];
