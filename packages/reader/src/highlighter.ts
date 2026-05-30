// Coloration syntaxique via Shiki (fine-grained : js/ts/java + 1 thème, pour limiter
// le bundle). Le loader oniguruma est INJECTÉ : la webapp passe import('shiki/wasm'),
// le webview de l'extension passe fetch(<asWebviewUri onig.wasm>). Même rendu partout.
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import jsLang from '@shikijs/langs/javascript';
import tsLang from '@shikijs/langs/typescript';
import javaLang from '@shikijs/langs/java';
import githubDark from '@shikijs/themes/github-dark';
import type { LangId } from '@lexluthor/core';
import type { Token } from './tokens';

const THEME = 'github-dark';

type OnigInput = Parameters<typeof createOnigurumaEngine>[0];

export interface ReaderHighlighter {
  /** Découpe le code en lignes de tokens colorisés (un tableau par ligne physique). */
  tokenizeLines(code: string, lang: LangId): Promise<Token[][]>;
}

/** Fabrique un coloriseur. `onig` = source du wasm oniguruma (import('shiki/wasm') ou fetch(url)). */
export function createReaderHighlighter(opts: { onig: OnigInput }): ReaderHighlighter {
  let highlighterPromise: Promise<HighlighterCore> | null = null;

  function getHighlighter(): Promise<HighlighterCore> {
    if (!highlighterPromise) {
      highlighterPromise = createHighlighterCore({
        themes: [githubDark],
        langs: [jsLang, tsLang, javaLang],
        engine: createOnigurumaEngine(opts.onig),
      });
    }
    return highlighterPromise;
  }

  return {
    async tokenizeLines(code, lang) {
      const highlighter = await getHighlighter();
      const { tokens } = highlighter.codeToTokens(code, { lang, theme: THEME });
      return tokens.map((line) => line.map((t) => ({ content: t.content, ...(t.color ? { color: t.color } : {}) })));
    },
  };
}
