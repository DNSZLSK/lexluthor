// Chargement WASM cote NAVIGATEUR. Les .wasm sont servis localement depuis
// public/wasm/ (-> /wasm/*.wasm), donc 100% offline, aucun fetch externe.
// Chargement paresseux + cache : on ne charge la grammaire (TS/Java sont lourds)
// qu'au moment ou on en a besoin.
import { Language, Parser } from 'web-tree-sitter';
import type { LangId } from '../engine/types';

const ENGINE_WASM = '/wasm/web-tree-sitter.wasm';

const GRAMMAR_URL: Record<LangId, string> = {
  javascript: '/wasm/tree-sitter-javascript.wasm',
  typescript: '/wasm/tree-sitter-typescript.wasm',
  java: '/wasm/tree-sitter-java.wasm',
};

let initPromise: Promise<void> | null = null;
function initParser(): Promise<void> {
  if (!initPromise) {
    initPromise = Parser.init({
      locateFile: (path: string) => (path.endsWith('.wasm') ? ENGINE_WASM : path),
    });
  }
  return initPromise;
}

const langCache = new Map<LangId, Promise<Language>>();

export function loadLanguage(lang: LangId): Promise<Language> {
  let cached = langCache.get(lang);
  if (!cached) {
    cached = initParser().then(() => Language.load(GRAMMAR_URL[lang]));
    langCache.set(lang, cached);
  }
  return cached;
}
