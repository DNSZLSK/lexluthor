// Implémentation NAVIGATEUR du WasmProvider. Les .wasm sont servis statiquement
// depuis public/wasm/ (-> /wasm/*.wasm) : 100% offline, aucun fetch externe.
import { Language, Parser } from 'web-tree-sitter';
import type { LangId, WasmProvider } from '@lexluthor/core';

const ENGINE_WASM = '/wasm/web-tree-sitter.wasm';

const GRAMMAR_URL: Record<LangId, string> = {
  javascript: '/wasm/tree-sitter-javascript.wasm',
  typescript: '/wasm/tree-sitter-typescript.wasm',
  java: '/wasm/tree-sitter-java.wasm',
};

let initPromise: Promise<void> | null = null;

export const webWasmProvider: WasmProvider = {
  initEngine(): Promise<void> {
    if (!initPromise) {
      initPromise = Parser.init({ locateFile: (p: string) => (p.endsWith('.wasm') ? ENGINE_WASM : p) });
    }
    return initPromise;
  },
  loadGrammar(lang: LangId): Promise<Language> {
    return Language.load(GRAMMAR_URL[lang]);
  },
};
