import * as vscode from 'vscode';
import { Language, Parser } from 'web-tree-sitter';
import type { LangId, WasmProvider } from '@lexluthor/core';

// Implémentation Node (extension host desktop) du WasmProvider. Les .wasm sont
// embarqués dans le .vsix (media/wasm/) et chargés par CHEMIN FICHIER — c'est le
// chemin exact prouvé par les tests Node (Parser.init + Language.load(fsPath)).
// Le moteur web-tree-sitter étant bundlé par esbuild, on lui indique où trouver
// son .wasm via locateFile (sinon il le chercherait à côté de dist/).
const ENGINE_FILE = 'web-tree-sitter.wasm';
const GRAMMAR_FILE: Record<LangId, string> = {
  javascript: 'tree-sitter-javascript.wasm',
  typescript: 'tree-sitter-typescript.wasm',
  java: 'tree-sitter-java.wasm',
};

export function createNodeWasmProvider(extensionUri: vscode.Uri): WasmProvider {
  const wasmDir = vscode.Uri.joinPath(extensionUri, 'media', 'wasm');
  const filePath = (file: string): string => vscode.Uri.joinPath(wasmDir, file).fsPath;

  let initPromise: Promise<void> | null = null;

  return {
    initEngine(): Promise<void> {
      if (!initPromise) {
        initPromise = Parser.init({
          locateFile: (path: string) => (path.endsWith('.wasm') ? filePath(ENGINE_FILE) : path),
        });
      }
      return initPromise;
    },
    loadGrammar(lang: LangId): Promise<Language> {
      return Language.load(filePath(GRAMMAR_FILE[lang]));
    },
  };
}
