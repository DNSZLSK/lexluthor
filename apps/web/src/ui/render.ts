import type { RenderRow } from './interleave';

// Zero-width space pour qu'une ligne de code vide garde sa hauteur.
const EMPTY_LINE = '​';

/** Rend les RenderRow dans le DOM : gouttiere + code colorise, et sous-titres ambre intercales. */
export function renderPlayer(container: HTMLElement, rows: readonly RenderRow[]): void {
  const frag = document.createDocumentFragment();

  for (const row of rows) {
    const line = document.createElement('div');

    if (row.kind === 'code') {
      line.className = 'row row--code';
      const gutter = document.createElement('span');
      gutter.className = 'gutter';
      gutter.textContent = String(row.lineNumber);
      const code = document.createElement('code');
      code.className = 'code';
      if (row.tokens.length === 0) {
        code.textContent = EMPTY_LINE;
      } else {
        for (const t of row.tokens) {
          const span = document.createElement('span');
          span.textContent = t.content;
          if (t.color) span.style.color = t.color;
          code.appendChild(span);
        }
      }
      line.append(gutter, code);
    } else {
      line.className = 'row row--subtitle';
      if (row.severity === 'alert') line.classList.add('is-alert');
      if (row.confidence < 1) line.classList.add('is-faint');
      line.style.setProperty('--depth', String(row.depth));
      const gutter = document.createElement('span');
      gutter.className = 'gutter';
      const sub = document.createElement('span');
      sub.className = 'subtitle';
      sub.textContent = row.text;
      line.append(gutter, sub);
    }

    frag.appendChild(line);
  }

  container.replaceChildren(frag);
}
