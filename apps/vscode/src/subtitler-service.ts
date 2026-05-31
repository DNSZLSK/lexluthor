import * as vscode from 'vscode';
import { createSubtitler } from '@lexluthor/core';
import type { LangId, LocaleId, Subtitle, Subtitler } from '@lexluthor/core';
import { createNodeWasmProvider } from './wasm-node-provider';

const LOCALES: readonly LocaleId[] = ['fr', 'en', 'es'];

/** Lit la locale des sous-titres depuis la config (defaut FR). */
function configuredLocale(): LocaleId {
  const v = vscode.workspace.getConfiguration('lexluthor').get<string>('humanLanguage', 'fr');
  return (LOCALES as readonly string[]).includes(v) ? (v as LocaleId) : 'fr';
}

// Mappe les languageId VS Code vers les LangId du coeur. (JSX est géré par la
// grammaire JavaScript ; .tsx attendra l'adapter tsx -> hors MVP.)
const LANG_MAP: Record<string, LangId> = {
  javascript: 'javascript',
  javascriptreact: 'javascript',
  typescript: 'typescript',
};

/** Sous-titre des documents VS Code, avec cache par (uri, version). */
export class SubtitlerService {
  private readonly subtitler: Subtitler;
  private readonly cache = new Map<string, { version: number; subs: Subtitle[] }>();

  constructor(extensionUri: vscode.Uri) {
    this.subtitler = createSubtitler(createNodeWasmProvider(extensionUri));
  }

  langIdFor(doc: vscode.TextDocument): LangId | null {
    return LANG_MAP[doc.languageId] ?? null;
  }

  async subtitlesFor(doc: vscode.TextDocument): Promise<Subtitle[]> {
    const lang = this.langIdFor(doc);
    if (!lang) return [];
    const locale = configuredLocale();
    // La locale fait partie de la cle de cache : changer de langue invalide l'entree.
    const key = `${doc.uri.toString()}|${locale}`;
    const cached = this.cache.get(key);
    if (cached && cached.version === doc.version) return cached.subs;
    const subs = await this.subtitler.subtitle(doc.getText(), lang, locale);
    this.cache.set(key, { version: doc.version, subs });
    return subs;
  }

  forget(uri: vscode.Uri): void {
    const prefix = `${uri.toString()}|`;
    for (const key of this.cache.keys()) if (key.startsWith(prefix)) this.cache.delete(key);
  }
}
