// Assemble les catalogues par locale en translators (lookup + format + reader de prose).
import type { LocaleId, Translator } from '../../engine/message';
import { createTranslator } from '../../engine/translator';
import { HELPERS_FACTORIES } from '../../read/locale';
import { catalogFr } from './fr';
import { catalogEn } from './en';
import { catalogEs } from './es';

export { catalogFr, catalogEn, catalogEs };

/** Fabrique les 3 translators (defaut injecte dans createEngine). */
export function makeTranslators(): Record<LocaleId, Translator> {
  return {
    fr: createTranslator('fr', catalogFr, HELPERS_FACTORIES.fr),
    en: createTranslator('en', catalogEn, HELPERS_FACTORIES.en),
    es: createTranslator('es', catalogEs, HELPERS_FACTORIES.es),
  };
}

/** Cles statiques de chaque catalogue (pour catalog-completeness.spec). */
export const CATALOG_KEYS: Readonly<Record<LocaleId, readonly string[]>> = {
  fr: Object.keys(catalogFr),
  en: Object.keys(catalogEn),
  es: Object.keys(catalogEs),
};
