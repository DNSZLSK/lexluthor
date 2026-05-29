import type { Language } from 'web-tree-sitter';
import { createEngine } from './engine/engine';
import { createJavaScriptAdapter } from './adapters/javascript';
import { createTypeScriptAdapter } from './adapters/typescript';
import type { LangId, LanguageAdapter, Subtitle } from './engine/types';
import type { WasmProvider } from './adapters/wasm-provider';

const ADAPTER_FACTORIES: Partial<Record<LangId, (language: Language) => LanguageAdapter>> = {
  javascript: createJavaScriptAdapter,
  typescript: createTypeScriptAdapter,
};

export interface Subtitler {
  /** Vrai si un adapter existe pour ce langage. */
  supports(lang: LangId): boolean;
  /** Sous-titre le code (charge paresseusement la grammaire au 1er usage du langage). */
  subtitle(code: string, lang: LangId): Promise<Subtitle[]>;
}

/**
 * Fabrique haut-niveau : encapsule l'init WASM, le chargement paresseux des
 * grammaires et le cache d'adapter par langage. L'hôte ne fournit qu'un WasmProvider.
 * Le moteur lit l'objet `adapters` au moment de l'appel → on le peuple à la volée.
 */
export function createSubtitler(provider: WasmProvider): Subtitler {
  const adapters: Partial<Record<LangId, LanguageAdapter>> = {};
  const engine = createEngine(adapters);
  const pending = new Map<LangId, Promise<LanguageAdapter>>();

  function ensureAdapter(lang: LangId): Promise<LanguageAdapter> {
    let p = pending.get(lang);
    if (!p) {
      const factory = ADAPTER_FACTORIES[lang];
      if (!factory) return Promise.reject(new Error(`[lexluthor] langage non supporté : ${lang}`));
      p = (async () => {
        await provider.initEngine();
        const language = await provider.loadGrammar(lang);
        const adapter = factory(language);
        adapters[lang] = adapter;
        return adapter;
      })();
      pending.set(lang, p);
    }
    return p;
  }

  return {
    supports: (lang) => lang in ADAPTER_FACTORIES,
    async subtitle(code, lang) {
      await ensureAdapter(lang);
      return engine.subtitle(code, lang);
    },
  };
}
