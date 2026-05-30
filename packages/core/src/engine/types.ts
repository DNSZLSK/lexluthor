// Contrats du coeur. UNIQUE point de couplage au backend : SyntaxNode est un
// alias du Node de web-tree-sitter (riche : type/text/positions/navigation).
// Si on change un jour de backend, on ne touche qu'ici + adapters/.
import type { Language, Node } from 'web-tree-sitter';

export type SyntaxNode = Node;

export type LangId = 'javascript' | 'typescript' | 'java';

export interface Point {
  readonly row: number; // 0-based (ligne)
  readonly column: number; // 0-based (colonne)
}

export interface SourceRange {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly startPosition: Point;
  readonly endPosition: Point;
}

export type RuleLayer = 'lexical' | 'idiomatic' | 'compositional' | 'signal' | 'fallback';

export type Severity = 'alert';

/** Un sous-titre produit : une phrase FR ancree sur une plage de code source. */
export interface Subtitle {
  readonly text: string;
  readonly range: SourceRange;
  readonly ruleId: string;
  readonly layer: RuleLayer;
  readonly depth: number; // profondeur d'imbrication -> indentation du sous-titre
  readonly confidence: number; // 1 = regle de confiance ; <1 = fallback (rendu attenue)
  readonly severity?: Severity; // 'alert' = couche signal (rendu rouge)
}

/**
 * Ce qu'une regle "reclame" :
 *  - 'subtree' : toute la plage du noeud ancre -> avale les enfants (idiome condense).
 *  - 'header'  : seulement l'en-tete (jusqu'au corps) -> les statements du corps
 *                re-rentrent dans le matching (structures : if/for/try/fonction).
 */
export type ClaimKind = 'subtree' | 'header';

export interface RuleExample {
  readonly code: string;
  readonly subtitle: string;
}

/** Helpers d'interpolation FR, centralises (testables isolement). */
export interface Interpolator {
  /** Texte d'un litteral chaine sans ses guillemets. */
  lit(node: SyntaxNode | string | null | undefined): string;
  /** Texte brut d'un noeud (ex: nom d'identifiant). */
  name(node: SyntaxNode | null | undefined): string;
  /** Elision : ('le','utilisateur') -> "l'utilisateur" ; ('le','serveur') -> "le serveur". */
  elide(article: 'le' | 'la' | 'de', word: string): string;
  /** Tronque proprement une longue phrase. */
  truncate(s: string, max?: number): string;
}

/** Contexte passe a render() : l'ancre, les captures de la query, et des helpers. */
export interface RuleContext {
  readonly node: SyntaxNode; // noeud ancre
  readonly caps: Readonly<Record<string, SyntaxNode>>; // 1re capture par nom
  readonly source: string;
  readonly lang: LangId;
  readonly t: Interpolator;
  text(node: SyntaxNode | null | undefined): string;
}

/**
 * LA REGLE = le coeur du dictionnaire. Une query S-expr + une phrase FR.
 * Ajouter une regle = ajouter un objet. "Le produit, c'est le dictionnaire."
 */
export interface Rule {
  readonly id: string;
  readonly layer: RuleLayer;
  readonly query: string; // S-expression tree-sitter ; doit capturer l'ancre (@site par defaut)
  readonly langs?: readonly LangId[]; // restreint la regle a ces langages (defaut: tous). Pour les
  // noeuds propres a une grammaire (field_definition JS vs public_field_definition TS).
  readonly anchor?: string; // nom de la capture-ancre (defaut: 'site')
  readonly claims?: ClaimKind; // defaut: 'subtree'
  readonly test?: (node: SyntaxNode, ctx: RuleContext) => boolean; // garde semantique (AND avec la query)
  readonly render: (ctx: RuleContext) => string | null; // null = "je renonce" -> regle suivante (jamais deviner)
  readonly specificity?: number; // override ; defaut derive de la couche
  readonly severity?: Severity; // pour la couche signal -> 'alert'
  readonly doc: { readonly summary: string; readonly examples: readonly RuleExample[] };
}

/** Adapter par langage : parse + regles + helpers structurels. */
export interface LanguageAdapter {
  readonly lang: LangId;
  readonly language: Language;
  /** Parse la source et retourne le noeud racine. */
  parse(source: string): SyntaxNode;
  readonly rules: readonly Rule[];
  /** Types de noeuds "bloc" comptes pour la profondeur d'indentation. */
  readonly blockTypes: ReadonlySet<string>;
  /** Index du debut du corps d'un noeud structurel (pour les claims 'header'). null si pas de corps. */
  bodyStartIndex(node: SyntaxNode): number | null;
}

export interface SubtitleEngine {
  subtitle(source: string, lang: LangId): Subtitle[];
}
