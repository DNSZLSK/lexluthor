// Coloration syntaxique via Shiki (fine-grained : seulement js/ts/java + 1 theme,
// pour limiter le bundle). Expose UNE fonction tokenizeLines -> Token[][] ; ce
// contrat etroit rend le coloriseur remplacable (plan B Prism) sans toucher au reste.
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import jsLang from '@shikijs/langs/javascript';
import tsLang from '@shikijs/langs/typescript';
import javaLang from '@shikijs/langs/java';
import githubDark from '@shikijs/themes/github-dark';
import type { LangId } from '@lexluthor/core';
import type { Token } from './tokens';

const THEME = 'github-dark';

let highlighterPromise: Promise<HighlighterCore> | null = null;
function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubDark],
      langs: [jsLang, tsLang, javaLang],
      engine: createOnigurumaEngine(import('shiki/wasm')),
    });
  }
  return highlighterPromise;
}

/** Decoupe le code en lignes de tokens colorises (un tableau par ligne physique). */
export async function tokenizeLines(code: string, lang: LangId): Promise<Token[][]> {
  const highlighter = await getHighlighter();
  const { tokens } = highlighter.codeToTokens(code, { lang, theme: THEME });
  return tokens.map((line) => line.map((t) => ({ content: t.content, ...(t.color ? { color: t.color } : {}) })));
}
