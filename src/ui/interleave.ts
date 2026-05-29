import type { Subtitle } from '../engine/types';
import type { Token } from './tokens';

export type RenderRow =
  | { readonly kind: 'code'; readonly lineNumber: number; readonly tokens: readonly Token[] }
  | {
      readonly kind: 'subtitle';
      readonly text: string;
      readonly depth: number;
      readonly confidence: number;
      readonly severity?: 'alert';
    };

/**
 * Coeur du rendu (PUR, sans DOM) : entrelace les lignes de code colorisees et les
 * lignes de sous-titre. Ancrage = ligne de DEBUT du noeud (range.startPosition.row)
 * -> le sous-titre apparait juste sous la 1re ligne du bloc qu'il resume, et les
 * sous-titres du corps suivent leurs propres lignes. La gouttiere de numeros
 * n'avance que sur les lignes de code.
 */
export function interleave(lines: readonly (readonly Token[])[], subtitles: readonly Subtitle[]): RenderRow[] {
  const byLine = new Map<number, Subtitle[]>();
  for (const s of subtitles) {
    const line = s.range.startPosition.row;
    const bucket = byLine.get(line);
    if (bucket) bucket.push(s);
    else byLine.set(line, [s]);
  }
  for (const bucket of byLine.values()) {
    bucket.sort((a, b) => a.range.startIndex - b.range.startIndex);
  }

  const rows: RenderRow[] = [];
  lines.forEach((tokens, i) => {
    rows.push({ kind: 'code', lineNumber: i + 1, tokens });
    const subs = byLine.get(i);
    if (subs) {
      for (const s of subs) {
        rows.push({
          kind: 'subtitle',
          text: s.text,
          depth: s.depth,
          confidence: s.confidence,
          ...(s.severity ? { severity: s.severity } : {}),
        });
      }
    }
  });
  return rows;
}
