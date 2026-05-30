// Entrée de vérification : exerce le chemin runtime de l'extension en condition
// BUNDLÉE (web-tree-sitter passé par esbuild). Si le fix import.meta.url ne tenait
// pas, Parser.init jetterait ici comme dans l'extension. CJS -> async IIFE (pas de TLA).
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Language, Parser } from 'web-tree-sitter';
import { createSubtitler } from '@lexluthor/core';
import type { LangId, WasmProvider } from '@lexluthor/core';

const wasmDir = resolve(process.cwd(), 'media', 'wasm');
const GRAMMAR: Record<LangId, string> = {
  javascript: 'tree-sitter-javascript.wasm',
  typescript: 'tree-sitter-typescript.wasm',
  java: 'tree-sitter-java.wasm',
};

let inited: Promise<void> | null = null;
const provider: WasmProvider = {
  initEngine() {
    if (!inited) {
      inited = (async () => {
        const bytes = await readFile(resolve(wasmDir, 'web-tree-sitter.wasm'));
        await Parser.init({ wasmBinary: bytes } as Parameters<typeof Parser.init>[0]);
      })();
    }
    return inited;
  },
  loadGrammar: async (lang) => Language.load(await readFile(resolve(wasmDir, GRAMMAR[lang]))),
};

void (async () => {
  try {
    const subtitler = createSubtitler(provider);
    const subs = await subtitler.subtitle("const express = require('express');", 'javascript');
    const ok = subs.some((s) => s.text === 'On importe le module express');
    console.log(ok ? 'BUNDLE-OK' : `BUNDLE-FAIL: ${JSON.stringify(subs.map((s) => s.text))}`);
    process.exit(ok ? 0 : 1);
  } catch (err) {
    console.log(`BUNDLE-THROW: ${(err instanceof Error ? err.message : String(err))}`);
    process.exit(2);
  }
})();
