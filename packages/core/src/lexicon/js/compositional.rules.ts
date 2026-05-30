// Couche COMPOSITIONNELLE : les structures de controle. Elles reclament leur
// EN-TETE ('header') -> les instructions du corps re-rentrent dans le matching
// et recoivent leurs propres sous-titres (on lit la structure ET son contenu).
import type { Rule } from '../../engine/types';
import { isGlossed, noneOf } from '../../read';

export const compositionalRules: Rule[] = [
  {
    id: 'js.if-guard',
    layer: 'compositional',
    claims: 'header',
    specificity: 85, // bat le if generique pour les gardes negatives
    query:
      '(if_statement condition: (parenthesized_expression (unary_expression operator: "!" argument: (_) @subj))) @site',
    render(ctx) {
      const subj = ctx.caps.subj;
      if (subj?.type === 'identifier' && isGlossed(subj.text)) return `Si ${noneOf(subj.text)} n'existe :`;
      return `Si ${ctx.t.truncate(ctx.text(subj), 40)} n'existe pas :`;
    },
    doc: {
      summary: 'Garde négative (if (!x)…) : on lit le sujet.',
      examples: [
        { code: 'if (!user) { fail(); }', subtitle: "Si aucun utilisateur n'existe :" },
        { code: 'if (!ok) { fail(); }', subtitle: "Si ok n'existe pas :" },
      ],
    },
  },

  {
    id: 'js.if',
    layer: 'compositional',
    claims: 'header',
    query: '(if_statement condition: (parenthesized_expression (_) @cond)) @site',
    render: (ctx) => `Si ${ctx.t.truncate(ctx.text(ctx.caps.cond), 50)} :`,
    doc: {
      summary: 'Condition if generique.',
      examples: [{ code: 'if (count > 0) { go(); }', subtitle: 'Si count > 0 :' }],
    },
  },

  {
    id: 'js.for-of',
    layer: 'compositional',
    claims: 'header',
    query: '(for_in_statement) @site',
    render(ctx) {
      const left = ctx.node.childForFieldName('left');
      const right = ctx.node.childForFieldName('right');
      let kind = 'of';
      for (let i = 0; i < ctx.node.childCount; i++) {
        const c = ctx.node.child(i);
        if (c && (c.type === 'of' || c.type === 'in')) {
          kind = c.type;
          break;
        }
      }
      const v = left ? ctx.t.truncate(left.text, 30) : 'élément';
      const it = right ? ctx.t.truncate(right.text, 30) : 'la collection';
      return kind === 'in' ? `Pour chaque clé ${v} de ${it} :` : `Pour chaque ${v} de ${it} :`;
    },
    doc: {
      summary: 'Boucle for…of / for…in.',
      examples: [{ code: 'for (const item of items) { use(item); }', subtitle: 'Pour chaque item de items :' }],
    },
  },

  {
    id: 'js.for',
    layer: 'compositional',
    claims: 'header',
    query: '(for_statement) @site',
    render: () => 'On répète en boucle :',
    doc: {
      summary: 'Boucle for classique.',
      examples: [{ code: 'for (let i = 0; i < n; i++) { step(); }', subtitle: 'On répète en boucle :' }],
    },
  },

  {
    id: 'js.while',
    layer: 'compositional',
    claims: 'header',
    query: '(while_statement condition: (parenthesized_expression (_) @cond)) @site',
    render: (ctx) => `Tant que ${ctx.t.truncate(ctx.text(ctx.caps.cond), 50)} :`,
    doc: {
      summary: 'Boucle while.',
      examples: [{ code: 'while (running) { tick(); }', subtitle: 'Tant que running :' }],
    },
  },

  {
    id: 'js.try',
    layer: 'compositional',
    claims: 'header',
    query: '(try_statement) @site',
    render: () => "On tente l'opération suivante :",
    doc: {
      summary: 'Bloc try.',
      examples: [{ code: 'try { risky(); } catch (e) { handle(e); }', subtitle: "On tente l'opération suivante :" }],
    },
  },

  {
    id: 'js.catch',
    layer: 'compositional',
    claims: 'header',
    query: '(catch_clause) @site',
    render(ctx) {
      const param = ctx.node.childForFieldName('parameter');
      return `En cas d'erreur${param ? ` (${param.text})` : ''} :`;
    },
    doc: {
      summary: "Clause catch (gestion d'erreur).",
      examples: [{ code: 'try { risky(); } catch (e) { handle(e); }', subtitle: "En cas d'erreur (e) :" }],
    },
  },

  {
    id: 'js.switch',
    layer: 'compositional',
    query: '(switch_statement value: (parenthesized_expression (_) @disc)) @site',
    render: (ctx) => `Selon ${ctx.t.truncate(ctx.text(ctx.caps.disc), 40)} :`,
    doc: {
      summary: 'Aiguillage switch.',
      examples: [{ code: 'switch (status) { case 200: ok(); break; }', subtitle: 'Selon status :' }],
    },
  },
];
