import * as vscode from 'vscode';
import { readFile } from 'node:fs/promises';
import { Language, Parser } from 'web-tree-sitter';
import type { LangId, WasmProvider } from '@lexluthor/core';

// Implémentation Node (extension host desktop) du WasmProvider. On lit les .wasm
// embarqués (media/wasm/) PAR OCTETS avec le fs de Node sur un chemin absolu, puis
// on les passe à web-tree-sitter via wasmBinary / Language.load(bytes). C'est le
// chemin EXACT validé par verify-bundle.mjs en condition bundlée (BUNDLE-OK).
const ENGINE_FILE = 'web-tree-sitter.wasm';
const GRAMMAR_FILE: Record<LangId, string> = {
  javascript: 'tree-sitter-javascript.wasm',
  typescript: 'tree-sitter-typescript.wasm',
  java: 'tree-sitter-java.wasm',
};

export function createNodeWasmProvider(extensionUri: vscode.Uri): WasmProvider {
  const wasmPath = (file: string): string => vscode.Uri.joinPath(extensionUri, 'media', 'wasm', file).fsPath;

  let initPromise: Promise<void> | null = null;

  return {
    initEngine(): Promise<void> {
      if (!initPromise) {
        initPromise = (async () => {
          const bytes = await readFile(wasmPath(ENGINE_FILE));
          await Parser.init({ wasmBinary: bytes } as Parameters<typeof Parser.init>[0]);
        })();
      }
      return initPromise;
    },
    async loadGrammar(lang: LangId): Promise<Language> {
      return Language.load(await readFile(wasmPath(GRAMMAR_FILE[lang])));
    },
  };
}
