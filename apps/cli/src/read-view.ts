// Rendu terminal de `lexluthor read` : code et sous-titres entrelacés (VOSTFR).
// Texte brut (pas d'ANSI, compatible CI/redirection), aligné sur la sémantique du
// lecteur webapp (indexe par ligne, indente par profondeur, marque les alertes).
import type { Subtitle } from '@lexluthor/core';

export interface ReadViewOpts {
  readonly file: string;
  readonly locale: string;
}

export function renderRead(code: string, subs: readonly Subtitle[], opts: ReadViewOpts): string {
  const lines = code.split('\n');

  // Sous-titres groupés par ligne d'ancrage, ordonnés (position puis profondeur).
  const byRow = new Map<number, Subtitle[]>();
  for (const s of subs) {
    const r = s.range.startPosition.row;
    const arr = byRow.get(r) ?? [];
    arr.push(s);
    byRow.set(r, arr);
  }
  for (const arr of byRow.values()) {
    arr.sort((a, b) => a.range.startIndex - b.range.startIndex || a.depth - b.depth);
  }

  const alerts = subs.filter((s) => s.severity === 'alert').length;
  const gutter = String(lines.length).length;
  const pad = ' '.repeat(gutter);

  let out = `\nlexluthor read — ${opts.file}  [${opts.locale}]\n`;
  out += `sous-titres : ${subs.length}${alerts ? `   alertes : ${alerts}` : ''}\n`;
  out += `${'-'.repeat(72)}\n`;

  for (let i = 0; i < lines.length; i++) {
    out += `${String(i + 1).padStart(gutter)} | ${lines[i] ?? ''}\n`;
    for (const s of byRow.get(i) ?? []) {
      const indent = '  '.repeat(Math.min(s.depth, 8));
      const mark = s.severity === 'alert' ? '/!\\ ' : s.confidence < 1 ? '~ ' : '» ';
      out += `${pad} : ${indent}${mark}${s.text}\n`;
    }
  }
  return out;
}
