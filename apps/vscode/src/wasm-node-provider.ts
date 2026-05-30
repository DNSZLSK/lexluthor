import * as vscode from 'vscode';
import { Language, Parser } from 'web-tree-sitter';
import type { LangId, WasmProvider } from '@lexluthor/core';

// Implémentation Node du WasmProvider. Les .wasm sont embarqués dans le .vsix
// (media/wasm/) et chargés PAR OCTETS (workspace.fs.readFile) : c'est le plus
// robuste une fois web-tree-sitter bundlé par esbuild (pas de chemin relatif au
// dist/, pas de fetch). `wasmBinary` fait utiliser ces octets directement par
// emscripten. Marche desktop ET web.
const ENGINE_FILE = 'web-tree-sitter.wasm';
const GRAMMAR_FILE: Record<LangId, string> = {
  javascript: 'tree-sitter-javascript.wasm',
  typescript: 'tree-sitter-typescript.wasm',
  java: 'tree-sitter-java.wasm',
};

export function createNodeWasmProvider(extensionUri: vscode.Uri): WasmProvider {
  const wasmDir = vscode.Uri.joinPath(extensionUri, 'media', 'wasm');
  const readBytes = (file: string): Thenable<Uint8Array> =>
    vscode.workspace.fs.readFile(vscode.Uri.joinPath(wasmDir, file));

  let initPromise: Promise<void> | null = null;

  return {
    initEngine(): Promise<void> {
      if (!initPromise) {
        initPromise = (async () => {
          const bytes = await readBytes(ENGINE_FILE);
          await Parser.init({ wasmBinary: bytes } as Parameters<typeof Parser.init>[0]);
        })();
      }
      return initPromise;
    },
    async loadGrammar(lang: LangId): Promise<Language> {
      return Language.load(await readBytes(GRAMMAR_FILE[lang]));
    },
  };
}
