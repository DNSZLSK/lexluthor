// Mode DIAGNOSTIC : fait tourner le moteur déterministe sur du code et compte ce
// qu'il sait lire ou non, par impact. Ce n'est PAS de l'apprentissage : on ne change
// jamais le moteur ; on produit un rapport classé de ce qu'il faut CURER au dictionnaire
// (mots inconnus -> glossaire, verbes manquants -> VERB_PREFIXES, types non couverts ->
// règles, littéraux recopiés -> phrases de forme / chaînage). 100% déterministe.
import type { LangId, LanguageAdapter, SubtitleEngine, Subtitle, SyntaxNode } from '../engine/types';
import { isGlossed, readVerbName, splitIdentifier } from '../read';
import { dominantToken, isCodeRecopied } from './recopy';

/** Classe d'une instruction : lecture riche / phrase de forme / code recopié / silence. */
export type Coverage = 'rich' | 'shape' | 'recopied' | 'silent';
const COVERAGES: readonly Coverage[] = ['rich', 'shape', 'recopied', 'silent'];

export interface Ranked {
  readonly key: string;
  readonly count: number;
}

export interface RecopiedBucket {
  count: number;
  readonly examples: string[];
}

export interface FileReport {
  readonly lang: LangId;
  statements: number;
  parseErrors: number;
  readonly counts: Record<Coverage, number>;
  readonly unknownWords: Record<string, number>;
  readonly missingVerbs: Record<string, number>;
  readonly uncoveredTypes: Record<string, number>;
  readonly recopied: Record<string, RecopiedBucket>;
}

export interface RepoReport {
  files: number;
  statements: number;
  parseErrors: number;
  readonly counts: Record<Coverage, number>;
  readonly byLang: Record<string, { files: number; statements: number; counts: Record<Coverage, number> }>;
  readonly unknownWords: Record<string, number>;
  readonly missingVerbs: Record<string, number>;
  readonly uncoveredTypes: Record<string, number>;
  readonly recopied: Record<string, RecopiedBucket>;
}

// Parents dont les enfants nommés sont des « instructions » (mêmes que coverage-holes.spec,
// + class_body pour rendre visible la couverture des méthodes).
const STATEMENT_PARENTS = new Set(['program', 'statement_block', 'class_body']);
const NOISE = new Set(['comment', 'empty_statement']);

// Phrases de forme exactes produites par shapePhrase() (values.ts) — un sous-titre qui en
// fait partie est une lecture GÉNÉRIQUE (honnête mais améliorable), pas une vraie lecture.
const SHAPE_PHRASES = new Set([
  'On renvoie un objet',
  'On renvoie une liste',
  'On renvoie un texte composé',
  'On renvoie une valeur selon une condition',
  'On renvoie une valeur ou sa valeur par défaut',
  "On renvoie le résultat d'une comparaison",
  "On renvoie le résultat d'un calcul",
  "On renvoie le résultat d'une négation",
  'On renvoie le résultat',
  'On sort de la fonction',
  'On déclenche une erreur',
]);
const SHAPE_TAIL = [/ selon une condition$/, /, avec une valeur par défaut$/, / par une comparaison$/, / par une négation$/];

function isShapePhrase(text: string): boolean {
  if (SHAPE_PHRASES.has(text)) return true;
  if (SHAPE_TAIL.some((re) => re.test(text))) return true;
  // define générique sans valeur concrète : « On définit/compose/calcule X » sans « à … ».
  return /^On (définit|compose|calcule) /.test(text) && !/ à /.test(text);
}

function classify(node: SyntaxNode, subs: readonly Subtitle[]): { coverage: Coverage; ruleId?: string; text?: string } {
  let best: Subtitle | undefined;
  for (const s of subs) {
    if (s.range.startIndex >= node.startIndex && s.range.startIndex < node.endIndex) {
      if (!best || s.range.startIndex < best.range.startIndex) best = s;
    }
  }
  if (!best) return { coverage: 'silent' };
  if (isCodeRecopied(best.text)) return { coverage: 'recopied', ruleId: best.ruleId, text: best.text };
  if (isShapePhrase(best.text)) return { coverage: 'shape', ruleId: best.ruleId };
  return { coverage: 'rich', ruleId: best.ruleId };
}

// Carte sans prototype : une clé comme « constructor »/« toString » n'hérite de rien.
function dict<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

/** Mots d'un identifiant à signaler au glossaire (ni glosés, ni verbes connus). */
function harvestWords(id: string, report: FileReport): void {
  for (const w of splitIdentifier(id)) {
    if (w.length <= 2 || /^\d+$/.test(w)) continue;
    if (isGlossed(w) || readVerbName(w) !== null) continue;
    bump(report.unknownWords, w);
  }
}

const FUNCTION_LIKE = new Set([
  'function_declaration',
  'generator_function_declaration',
  'function_expression',
  'method_definition',
]);
const NAMED_DECL = new Set([
  'function_declaration',
  'generator_function_declaration',
  'function_expression',
  'method_definition',
  'class_declaration',
  'interface_declaration',
  'type_alias_declaration',
  'enum_declaration',
]);

function collectNames(node: SyntaxNode, report: FileReport): void {
  // Noms déclarés (fonctions, classes, types…).
  if (NAMED_DECL.has(node.type)) {
    const name = node.childForFieldName('name');
    if (name) {
      harvestWords(name.text, report);
      if (FUNCTION_LIKE.has(node.type) && readVerbName(name.text) === null) {
        const first = splitIdentifier(name.text)[0];
        if (first && first.length > 2 && !/^\d+$/.test(first)) bump(report.missingVerbs, first);
      }
    }
  }
  // Déclarations de variables (et const = fonction fléchée -> verbe manquant).
  if (node.type === 'variable_declarator') {
    const name = node.childForFieldName('name');
    if (name?.type === 'identifier') {
      harvestWords(name.text, report);
      const value = node.childForFieldName('value');
      if (value && (value.type === 'arrow_function' || value.type === 'function_expression') && readVerbName(name.text) === null) {
        const first = splitIdentifier(name.text)[0];
        if (first && first.length > 2 && !/^\d+$/.test(first)) bump(report.missingVerbs, first);
      }
    }
  }
  // Paramètres formels (JS : identifier ; TS : required_parameter/optional_parameter).
  if (node.type === 'required_parameter' || node.type === 'optional_parameter') {
    const pat = node.childForFieldName('pattern');
    if (pat?.type === 'identifier') harvestWords(pat.text, report);
  }
}

/** Analyse un fichier : couverture par instruction + cibles de curation classées. */
export function analyzeCoverage(adapter: LanguageAdapter, engine: SubtitleEngine, code: string): FileReport {
  const root = adapter.parse(code);
  const subs = engine.subtitle(code, adapter.lang);
  const report: FileReport = {
    lang: adapter.lang,
    statements: 0,
    parseErrors: 0,
    counts: { rich: 0, shape: 0, recopied: 0, silent: 0 },
    unknownWords: dict(),
    missingVerbs: dict(),
    uncoveredTypes: dict(),
    recopied: dict(),
  };

  const stack: SyntaxNode[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    for (let i = 0; i < node.namedChildCount; i++) {
      const c = node.namedChild(i);
      if (c) stack.push(c);
    }
    if (node.type === 'ERROR') report.parseErrors++;

    collectNames(node, report);

    const parent = node.parent;
    if (parent && STATEMENT_PARENTS.has(parent.type) && !NOISE.has(node.type)) {
      report.statements++;
      const { coverage, ruleId, text } = classify(node, subs);
      report.counts[coverage]++;
      if (coverage === 'silent') bump(report.uncoveredTypes, node.type);
      if (coverage === 'recopied' && text) {
        const sig = `${ruleId ?? '?'}:${dominantToken(text)}`;
        const bucket = report.recopied[sig] ?? (report.recopied[sig] = { count: 0, examples: [] });
        bucket.count++;
        if (bucket.examples.length < 3 && !bucket.examples.includes(text)) bucket.examples.push(text);
      }
    }
  }
  return report;
}

export function emptyRepoReport(): RepoReport {
  return {
    files: 0,
    statements: 0,
    parseErrors: 0,
    counts: { rich: 0, shape: 0, recopied: 0, silent: 0 },
    byLang: dict(),
    unknownWords: dict(),
    missingVerbs: dict(),
    uncoveredTypes: dict(),
    recopied: dict(),
  };
}

function addCounts(acc: Record<string, number>, add: Record<string, number>): void {
  for (const [k, v] of Object.entries(add)) acc[k] = (acc[k] ?? 0) + v;
}

/** Agrège un FileReport dans le rapport repo (mute `acc`). */
export function mergeReport(acc: RepoReport, f: FileReport): void {
  acc.files += 1;
  acc.statements += f.statements;
  acc.parseErrors += f.parseErrors;
  for (const k of COVERAGES) acc.counts[k] += f.counts[k];

  const bl = acc.byLang[f.lang] ?? (acc.byLang[f.lang] = { files: 0, statements: 0, counts: { rich: 0, shape: 0, recopied: 0, silent: 0 } });
  bl.files += 1;
  bl.statements += f.statements;
  for (const k of COVERAGES) bl.counts[k] += f.counts[k];

  addCounts(acc.unknownWords, f.unknownWords);
  addCounts(acc.missingVerbs, f.missingVerbs);
  addCounts(acc.uncoveredTypes, f.uncoveredTypes);
  for (const [sig, b] of Object.entries(f.recopied)) {
    const t = acc.recopied[sig] ?? (acc.recopied[sig] = { count: 0, examples: [] });
    t.count += b.count;
    for (const ex of b.examples) if (t.examples.length < 3 && !t.examples.includes(ex)) t.examples.push(ex);
  }
}

/** Top N d'une carte fréquence, tri déterministe (count desc, puis clé asc). */
export function topN(map: Record<string, number>, n: number): Ranked[] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}
