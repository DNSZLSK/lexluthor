import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Language, Parser } from 'web-tree-sitter';
import { beforeAll, describe, expect, it } from 'vitest';
import { createSubtitler } from '@lexluthor/core';
import type { LangId, Subtitler, WasmProvider } from '@lexluthor/core';

// Réplique wasm-node-provider SANS dépendre de 'vscode', en chargeant les .wasm
// PAR OCTETS (comme le vrai provider de l'extension : wasmBinary + Language.load(bytes)).
// Valide en CI le chemin runtime réel : init moteur + grammaire depuis media/wasm +
// createSubtitler. (Le rendu in-editor se vérifie à l'oeil dans VS Code — voir WAKEUP.)
const wasmDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'media', 'wasm');
const GRAMMAR: Record<LangId, string> = {
  javascript: 'tree-sitter-javascript.wasm',
  typescript: 'tree-sitter-typescript.wasm',
  java: 'tree-sitter-java.wasm',
};

let initPromise: Promise<void> | null = null;
const provider: WasmProvider = {
  initEngine() {
    if (!initPromise) {
      initPromise = (async () => {
        const bytes = await readFile(join(wasmDir, 'web-tree-sitter.wasm'));
        await Parser.init({ wasmBinary: bytes } as Parameters<typeof Parser.init>[0]);
      })();
    }
    return initPromise;
  },
  loadGrammar: async (lang) => Language.load(await readFile(join(wasmDir, GRAMMAR[lang]))),
};

describe('runtime extension (provider node + createSubtitler, .wasm embarqués)', () => {
  let subtitler: Subtitler;
  beforeAll(() => {
    subtitler = createSubtitler(provider);
  });

  it('sous-titre du JavaScript', async () => {
    const subs = await subtitler.subtitle("const express = require('express');", 'javascript');
    expect(subs.map((s) => s.text)).toContain('On importe le module express');
  });

  it('remonte les alertes sécu (severity alert)', async () => {
    const subs = await subtitler.subtitle("eval(payload);\nconst cp = require('child_process');", 'javascript');
    const alerts = subs.filter((s) => s.severity === 'alert');
    expect(alerts.length).toBeGreaterThanOrEqual(2);
  });

  it('sous-titre du TypeScript (interface)', async () => {
    const subs = await subtitler.subtitle('interface User { id: string; name: string; }', 'typescript');
    expect(subs.some((s) => s.ruleId === 'ts.interface')).toBe(true);
  });
});
