import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Language, Parser } from 'web-tree-sitter';
import type { LangId, WasmProvider } from '@lexluthor/core';

// WasmProvider Node pour le CLI : lit les .wasm par octets avec le fs de Node, puis
// les passe à web-tree-sitter (wasmBinary / Language.load(bytes)). Même chemin que le
// host vscode, sans la dépendance `vscode`.
const ENGINE_FILE = 'web-tree-sitter.wasm';
const GRAMMAR_FILE: Record<LangId, string> = {
  javascript: 'tree-sitter-javascript.wasm',
  typescript: 'tree-sitter-typescript.wasm',
  java: 'tree-sitter-java.wasm',
};

export function createNodeWasmProvider(wasmDir: string): WasmProvider {
  let initPromise: Promise<void> | null = null;
  return {
    initEngine(): Promise<void> {
      if (!initPromise) {
        initPromise = (async () => {
          const bytes = await readFile(join(wasmDir, ENGINE_FILE));
          await Parser.init({ wasmBinary: bytes } as Parameters<typeof Parser.init>[0]);
        })();
      }
      return initPromise;
    },
    async loadGrammar(lang: LangId): Promise<Language> {
      return Language.load(await readFile(join(wasmDir, GRAMMAR_FILE[lang])));
    },
  };
}

/** Charge une grammaire par nom de fichier (pour tsx, hors LangId). */
export async function loadGrammarFile(wasmDir: string, file: string): Promise<Language> {
  return Language.load(await readFile(join(wasmDir, file)));
}
