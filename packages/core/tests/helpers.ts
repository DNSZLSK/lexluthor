import { Language, Parser } from 'web-tree-sitter';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJavaScriptAdapter } from '../src/adapters/javascript';
import { createTypeScriptAdapter } from '../src/adapters/typescript';
import { createEngine } from '../src/engine/engine';
import type { LangId, SubtitleEngine } from '../src/engine/types';

export const WASM_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'wasm');

export const GRAMMAR_FILES: Record<string, string> = {
  javascript: 'tree-sitter-javascript.wasm',
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  java: 'tree-sitter-java.wasm',
};

let initPromise: Promise<void> | null = null;
export function initParser(): Promise<void> {
  if (!initPromise) initPromise = Parser.init();
  return initPromise;
}

export async function loadLanguage(name: keyof typeof GRAMMAR_FILES): Promise<Language> {
  await initParser();
  return Language.load(join(WASM_DIR, GRAMMAR_FILES[name]!));
}

let enginePromise: Promise<SubtitleEngine> | null = null;
export function getEngine(): Promise<SubtitleEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const [jsLang, tsLang] = await Promise.all([loadLanguage('javascript'), loadLanguage('typescript')]);
      return createEngine({
        javascript: createJavaScriptAdapter(jsLang),
        typescript: createTypeScriptAdapter(tsLang),
      });
    })();
  }
  return enginePromise;
}

export async function subtitle(code: string, lang: LangId = 'javascript') {
  const engine = await getEngine();
  return engine.subtitle(code, lang);
}
