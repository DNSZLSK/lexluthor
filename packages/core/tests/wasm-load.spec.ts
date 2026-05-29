import { describe, expect, it } from 'vitest';
import { GRAMMAR_FILES, loadLanguage } from './helpers';

// Verrou bloquant F3 : les 4 grammaires DOIVENT charger avec le moteur 0.26
// (compat ABI). Si un .wasm est incompatible, ce test echoue avant toute regle.
describe('chargement WASM (ABI)', () => {
  for (const name of Object.keys(GRAMMAR_FILES) as Array<keyof typeof GRAMMAR_FILES>) {
    it(`charge la grammaire ${name}`, async () => {
      const lang = await loadLanguage(name);
      expect(lang.abiVersion).toBeGreaterThan(0);
      expect(lang.nodeTypeCount).toBeGreaterThan(0);
    });
  }
});
