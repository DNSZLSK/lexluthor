import { Query } from 'web-tree-sitter';
import type {
  LangId,
  LanguageAdapter,
  Rule,
  RuleContext,
  RuleLayer,
  SourceRange,
  Subtitle,
  SubtitleEngine,
  SyntaxNode,
} from './types';
import { interpolator } from './interpolate';
import { depthOf, intervalsOverlap, rangeOf } from '../adapters/treesitter';

/** Priorite par couche : plus c'est specifique, plus ca gagne et reclame en premier. */
const LAYER_SPECIFICITY: Record<RuleLayer, number> = {
  signal: 100,
  compositional: 80,
  idiomatic: 60,
  lexical: 40,
  fallback: 10,
};

interface Interval {
  startIndex: number;
  endIndex: number;
}

interface Candidate {
  rule: Rule;
  anchor: SyntaxNode;
  ctx: RuleContext;
  claim: Interval;
  spec: number;
}

function specOf(rule: Rule): number {
  return rule.specificity ?? LAYER_SPECIFICITY[rule.layer];
}

/** Ce que la regle reclame : tout le sous-arbre, ou seulement l'en-tete. */
function claimOf(rule: Rule, anchor: SyntaxNode, adapter: LanguageAdapter): Interval {
  if ((rule.claims ?? 'subtree') === 'header') {
    const bodyStart = adapter.bodyStartIndex(anchor);
    if (bodyStart != null && bodyStart > anchor.startIndex) {
      return { startIndex: anchor.startIndex, endIndex: bodyStart };
    }
  }
  return { startIndex: anchor.startIndex, endIndex: anchor.endIndex };
}

function makeContext(
  anchor: SyntaxNode,
  caps: Record<string, SyntaxNode>,
  source: string,
  lang: LangId,
): RuleContext {
  return {
    node: anchor,
    caps,
    source,
    lang,
    t: interpolator,
    text: (n) => (n == null ? '' : n.text),
  };
}

/**
 * Moteur de sous-titrage. Algorithme central = CLAIM PAR INTERVALLES :
 *  1. chaque regle s'execute (query S-expr) -> des candidats {ancre, plage reclamee, specificite} ;
 *  2. on trie par specificite decroissante (puis plage la plus large) ;
 *  3. greedy : un candidat est accepte si sa plage ne chevauche AUCUNE plage deja
 *     reclamee -> garantit "aucun sous-titre strictement inclus dans un autre".
 *  Un render() qui renvoie null = la regle renonce (on ne devine jamais).
 */
export function createEngine(adapters: Partial<Record<LangId, LanguageAdapter>>): SubtitleEngine {
  const queryCache = new Map<string, Query>();

  function getQuery(adapter: LanguageAdapter, rule: Rule): Query | null {
    const key = `${adapter.lang}:${rule.id}`;
    const cached = queryCache.get(key);
    if (cached) return cached;
    try {
      const q = new Query(adapter.language, rule.query);
      queryCache.set(key, q);
      return q;
    } catch (err) {
      // Une query malformee ne casse jamais tout le moteur : on la signale et on l'ignore.
      console.warn(`[lexluthor] query invalide pour la regle "${rule.id}" (${adapter.lang}):`, err);
      return null;
    }
  }

  function collectCandidates(adapter: LanguageAdapter, root: SyntaxNode, source: string): Candidate[] {
    const out: Candidate[] = [];
    for (const rule of adapter.rules) {
      const query = getQuery(adapter, rule);
      if (!query) continue;
      const anchorName = rule.anchor ?? 'site';
      for (const match of query.matches(root)) {
        const caps: Record<string, SyntaxNode> = {};
        for (const c of match.captures) {
          if (!(c.name in caps)) caps[c.name] = c.node;
        }
        const anchor = caps[anchorName] ?? match.captures[0]?.node;
        if (!anchor) continue;
        const ctx = makeContext(anchor, caps, source, adapter.lang);
        if (rule.test && !safeBool(() => rule.test!(anchor, ctx), rule.id)) continue;
        out.push({ rule, anchor, ctx, claim: claimOf(rule, anchor, adapter), spec: specOf(rule) });
      }
    }
    return out;
  }

  function subtitle(source: string, lang: LangId): Subtitle[] {
    const adapter = adapters[lang];
    if (!adapter) throw new Error(`[lexluthor] aucun adapter pour le langage "${lang}"`);
    if (!source.trim()) return [];

    const root = adapter.parse(source);
    const candidates = collectCandidates(adapter, root, source);

    // Tri : specificite desc, puis plage la plus large (resume englobant prioritaire), puis position.
    candidates.sort((a, b) => {
      if (b.spec !== a.spec) return b.spec - a.spec;
      const aw = a.claim.endIndex - a.claim.startIndex;
      const bw = b.claim.endIndex - b.claim.startIndex;
      if (bw !== aw) return bw - aw;
      return a.claim.startIndex - b.claim.startIndex;
    });

    const claimed: Interval[] = [];
    const accepted: Subtitle[] = [];
    for (const cand of candidates) {
      if (claimed.some((c) => intervalsOverlap(cand.claim, c))) continue;
      const phrase = safeRender(cand.rule, cand.ctx);
      if (phrase == null) continue;
      const text = phrase.trim();
      if (!text) continue;
      claimed.push(cand.claim);
      const range: SourceRange = rangeOf(cand.anchor);
      const sub: Subtitle = {
        text,
        range,
        ruleId: cand.rule.id,
        layer: cand.rule.layer,
        depth: depthOf(cand.anchor, adapter.blockTypes),
        confidence: cand.rule.layer === 'fallback' ? 0.5 : 1,
        ...(cand.rule.severity ? { severity: cand.rule.severity } : {}),
      };
      accepted.push(sub);
    }

    accepted.sort((a, b) => a.range.startIndex - b.range.startIndex);
    return accepted;
  }

  return { subtitle };
}

function safeBool(fn: () => boolean, ruleId: string): boolean {
  try {
    return fn();
  } catch (err) {
    console.warn(`[lexluthor] test() a echoue pour "${ruleId}":`, err);
    return false;
  }
}

function safeRender(rule: Rule, ctx: RuleContext): string | null {
  try {
    return rule.render(ctx);
  } catch (err) {
    console.warn(`[lexluthor] render() a echoue pour "${rule.id}":`, err);
    return null;
  }
}
