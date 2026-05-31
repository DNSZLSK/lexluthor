// Point d'entree du reader par-locale : fabriques de LocaleHelpers indexees par locale.
import type { LocaleHelpers, LocaleId } from '../../engine/message';
import { makeFrHelpers } from './fr/prose';
import { makeEnHelpers } from './en/prose';
import { makeEsHelpers } from './es/prose';

export { makeFrHelpers } from './fr/prose';
export { makeEnHelpers } from './en/prose';
export { makeEsHelpers } from './es/prose';

export const HELPERS_FACTORIES: Readonly<Record<LocaleId, (sub: (key: string) => string) => LocaleHelpers>> = {
  fr: makeFrHelpers,
  en: makeEnHelpers,
  es: makeEsHelpers,
};
