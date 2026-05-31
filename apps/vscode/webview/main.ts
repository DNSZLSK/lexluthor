// Entrée NAVIGATEUR du webview "lecteur VOSTFR". Reçoit le code du fichier actif
// (postMessage), calcule les sous-titres (tree-sitter) + colorise (Shiki) + rend
// le look cinéma (reader), et se synchronise au scroll. Tous les .wasm sont chargés
// depuis des URLs asWebviewUri injectées par l'extension (window.__lexluthor).
import { Language, Parser } from 'web-tree-sitter';
import { createSubtitler } from '@lexluthor/core';
import type { LangId, LocaleId, WasmProvider } from '@lexluthor/core';
import { createReaderHighlighter, interleave, renderPlayer } from '@lexluthor/reader';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };
declare global {
  interface Window {
    __lexluthor: { wasmBase: string; onigWasm: string };
  }
}

const vscode = acquireVsCodeApi();
const cfg = window.__lexluthor;

const ENGINE_WASM = cfg.wasmBase + 'web-tree-sitter.wasm';
const GRAMMAR_URL: Record<LangId, string> = {
  javascript: cfg.wasmBase + 'tree-sitter-javascript.wasm',
  typescript: cfg.wasmBase + 'tree-sitter-typescript.wasm',
  java: cfg.wasmBase + 'tree-sitter-java.wasm',
};

let initPromise: Promise<void> | null = null;
const provider: WasmProvider = {
  initEngine() {
    if (!initPromise) initPromise = Parser.init({ locateFile: () => ENGINE_WASM });
    return initPromise;
  },
  loadGrammar: (lang) => Language.load(GRAMMAR_URL[lang]),
};

const subtitler = createSubtitler(provider);
const highlighter = createReaderHighlighter({ onig: fetch(cfg.onigWasm) });

const LANG_MAP: Record<string, LangId> = {
  javascript: 'javascript',
  javascriptreact: 'javascript',
  typescript: 'typescript',
};

const player = document.getElementById('player')!;

let renderSeq = 0;
async function render(code: string, lang: LangId, locale: LocaleId): Promise<void> {
  const seq = ++renderSeq;
  try {
    const [lines, subs] = await Promise.all([highlighter.tokenizeLines(code, lang), subtitler.subtitle(code, lang, locale)]);
    if (seq !== renderSeq) return; // un rendu plus récent a pris la main
    renderPlayer(player, interleave(lines, subs));
  } catch (err) {
    if (seq !== renderSeq) return;
    player.textContent = `Erreur : ${(err as Error).message}`;
    console.error('[lexluthor]', err);
  }
}

let debounce: ReturnType<typeof setTimeout> | undefined;
window.addEventListener('message', (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === 'render') {
    const lang = LANG_MAP[msg.languageId];
    if (!lang) {
      player.textContent = `Langage non couvert pour l'instant : ${msg.languageId}`;
      return;
    }
    const code = msg.code as string;
    const locale = (msg.locale as LocaleId) ?? 'fr';
    clearTimeout(debounce);
    debounce = setTimeout(() => void render(code, lang, locale), 60);
  } else if (msg.type === 'scroll') {
    const el = player.querySelector(`[data-code-line="${(msg.topLine as number) + 1}"]`);
    if (el) el.scrollIntoView({ block: 'start' });
  }
});

// Clic sur une ligne de code -> demander à l'éditeur de révéler cette ligne.
player.addEventListener('click', (e) => {
  const row = (e.target as HTMLElement).closest<HTMLElement>('[data-code-line]');
  if (row?.dataset.codeLine) {
    vscode.postMessage({ type: 'reveal', line: Number(row.dataset.codeLine) - 1 });
  }
});

vscode.postMessage({ type: 'ready' });
