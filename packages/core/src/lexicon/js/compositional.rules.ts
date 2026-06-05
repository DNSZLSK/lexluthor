// Couche COMPOSITIONNELLE : les structures de controle. Elles reclament leur
// EN-TETE ('header') -> les instructions du corps re-rentrent dans le matching
// et recoivent leurs propres sous-titres (on lit la structure ET son contenu).
import type { Rule } from '../../engine/types';
import { msg } from '../../engine/message';
import { classifyCondition } from '../../read/classify/conditions.classify';
import { isGlossedHead, splitIdentifier } from '../../read/locale/shared';

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
      if (subj?.type === 'identifier' && isGlossedHead(subj.text)) {
        return msg('cond.ifNotExistsGlossed', { words: splitIdentifier(subj.text).join(' ') });
      }
      return msg('cond.ifNotExists', { subject: ctx.text(subj) });
    },
    doc: {
      summary: 'Garde négative (if (!x)…) : on lit le sujet.',
      examples: [
        {
          code: 'if (!user) { fail(); }',
          key: 'cond.ifNotExistsGlossed',
          expect: { fr: "Si aucun utilisateur n'existe :", en: 'If no user exists:' },
        },
        {
          code: 'if (!ok) { fail(); }',
          key: 'cond.ifNotExists',
          expect: { fr: "Si ok n'existe pas :", en: "If ok doesn't exist:" },
        },
      ],
    },
  },

  {
    id: 'js.if',
    layer: 'compositional',
    claims: 'header',
    query: '(if_statement condition: (parenthesized_expression (_) @cond)) @site',
    render: (ctx) => msg('cond.if', classifyCondition(ctx.caps.cond) ?? { kind: 'literal', text: ctx.text(ctx.caps.cond) }),
    doc: {
      summary: 'Condition if : on lit les appels prédicat/appartenance, littéral sinon.',
      examples: [
        { code: 'if (count > 0) { go(); }', key: 'cond.if', expect: { fr: 'Si count est supérieur à 0 :', en: 'If count is greater than 0:' } },
        { code: 'if (status === 200) { ok(); }', key: 'cond.if', expect: { fr: 'Si status vaut 200 :', en: 'If status equals 200:' } },
        { code: 'if (list.includes(item)) { use(item); }', key: 'cond.if', expect: { fr: 'Si la collection contient cet élément :', en: 'If the collection contains this item:' } },
        { code: 'if (user.isValid()) { ok(); }', key: 'cond.if', expect: { fr: "Si l'utilisateur est valide :", en: 'If the user is valid:' } },
        { code: 'if (items.some((x) => x.ok)) { go(); }', key: 'cond.if', expect: { fr: 'Si au moins un élément correspond :', en: 'If at least one item matches:' } },
        // Conditions composees (&&, ||, !) : composition equilibree (cap a 3 clauses, negation pliee).
        { code: 'if (count > 0 && status === 200) { go(); }', key: 'cond.if', expect: { fr: 'Si count est supérieur à 0 et status vaut 200 :', en: 'If count is greater than 0 and status equals 200:' } },
        { code: 'if (user && token) { go(); }', key: 'cond.if', expect: { fr: "Si l'utilisateur existe et le jeton existe :", en: 'If the user exists and the token exists:' } },
        { code: 'if (!user || !token) { fail(); }', key: 'cond.if', expect: { fr: "Si l'utilisateur n'existe pas ou le jeton n'existe pas :", en: "If the user doesn't exist or the token doesn't exist:" } },
        { code: 'if (active && !(count === 0)) { go(); }', key: 'cond.if', expect: { fr: 'Si active existe et count ne vaut pas 0 :', en: 'If active exists and count does not equal 0:' } },
        { code: 'if (a && b && c && d) { go(); }', key: 'cond.if', expect: { fr: 'Si a existe et b existe et c existe et … :', en: 'If a exists and b exists and c exists and …:' } },
      ],
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
      const params = { v: left ? left.text : '', it: right ? right.text : '' };
      return msg(kind === 'in' ? 'loop.forIn' : 'loop.forOf', params);
    },
    doc: {
      summary: 'Boucle for…of / for…in.',
      examples: [
        { code: 'for (const item of items) { use(item); }', key: 'loop.forOf', expect: { fr: 'Pour chaque item de items :', en: 'For each item in items:' } },
      ],
    },
  },

  {
    id: 'js.for',
    layer: 'compositional',
    claims: 'header',
    query: '(for_statement) @site',
    render: () => msg('loop.forClassic'),
    doc: {
      summary: 'Boucle for classique.',
      examples: [
        { code: 'for (let i = 0; i < n; i++) { step(); }', key: 'loop.forClassic', expect: { fr: 'On répète en boucle :', en: 'We loop repeatedly:' } },
      ],
    },
  },

  {
    id: 'js.while',
    layer: 'compositional',
    claims: 'header',
    query: '(while_statement condition: (parenthesized_expression (_) @cond)) @site',
    render: (ctx) => msg('cond.while', classifyCondition(ctx.caps.cond) ?? { kind: 'literal', text: ctx.text(ctx.caps.cond) }),
    doc: {
      summary: 'Boucle while : on lit les appels prédicat/appartenance, littéral sinon.',
      examples: [
        { code: 'while (running) { tick(); }', key: 'cond.while', expect: { fr: 'Tant que running existe :', en: 'While running exists:' } },
        { code: 'while (queue.has(next)) { step(); }', key: 'cond.while', expect: { fr: 'Tant que la collection contient cet élément :', en: 'While the collection contains this item:' } },
      ],
    },
  },

  {
    id: 'js.try',
    layer: 'compositional',
    claims: 'header',
    query: '(try_statement) @site',
    render: () => msg('flow.try'),
    doc: {
      summary: 'Bloc try.',
      examples: [
        { code: 'try { risky(); } catch (e) { handle(e); }', key: 'flow.try', expect: { fr: "On tente l'opération suivante :", en: 'We attempt the following:' } },
      ],
    },
  },

  {
    id: 'js.catch',
    layer: 'compositional',
    claims: 'header',
    query: '(catch_clause) @site',
    render(ctx) {
      const param = ctx.node.childForFieldName('parameter');
      return msg('flow.catch', param ? { param: param.text } : {});
    },
    doc: {
      summary: "Clause catch (gestion d'erreur).",
      examples: [
        { code: 'try { risky(); } catch (e) { handle(e); }', key: 'flow.catch', expect: { fr: "En cas d'erreur (e) :", en: 'On error (e):' } },
      ],
    },
  },

  {
    id: 'js.switch',
    layer: 'compositional',
    query: '(switch_statement value: (parenthesized_expression (_) @disc)) @site',
    render: (ctx) => msg('cond.switch', classifyCondition(ctx.caps.disc, false) ?? { kind: 'literal', text: ctx.text(ctx.caps.disc) }),
    doc: {
      summary: 'Aiguillage switch.',
      examples: [
        { code: 'switch (status) { case 200: ok(); break; }', key: 'cond.switch', expect: { fr: 'Selon status :', en: 'Depending on status:' } },
      ],
    },
  },
];
