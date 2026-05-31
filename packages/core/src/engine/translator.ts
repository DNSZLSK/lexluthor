// Resolution Message -> string : lookup pur dans le catalogue d'une locale +
// interpolation maison `{param}`. Deterministe, zero dependance (pas d'ICU).
import type { Catalog, LocaleHelpers, LocaleId, Message, MsgParams, Translator } from './message';

// Acces « propre » : evite les cles heritees (constructor, toString…) d'un objet litteral.
function own<T>(dict: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(dict, key) ? dict[key] : undefined;
}

/** Remplace les `{param}` d'un gabarit par leur valeur. Param absent -> laisse tel quel. */
function format(template: string, params: MsgParams): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = own(params as Record<string, string | number>, name);
    return v == null ? whole : String(v);
  });
}

/**
 * Cree un translator pour une locale. `makeHelpers` recoit le resolveur de
 * sous-cles (`sub`) pour que les entrees puissent composer http.status.* etc.
 */
export function createTranslator(
  locale: LocaleId,
  catalog: Catalog,
  makeHelpers: (sub: (key: string) => string) => LocaleHelpers,
): Translator {
  // `helpers` est defini APRES (cycle volontaire : sub -> render -> entry -> helpers).
  let helpers: LocaleHelpers;

  function render(m: Message): string {
    const entry = own(catalog, m.key);
    if (entry === undefined) {
      // Cle absente : faute de completude (FR/EN) attrapee par les tests, ou ES non
      // traduit (VO) attrape par l'engine qui omet alors le sous-titre.
      throw new Error(`[lexluthor] cle de catalogue absente: "${m.key}" (${locale})`);
    }
    if (typeof entry === 'string') return format(entry, m.params ?? {});
    return entry(m.params ?? {}, helpers);
  }

  const sub = (key: string): string => render({ key });
  helpers = makeHelpers(sub);

  return {
    locale,
    has: (key) => own(catalog, key) !== undefined,
    render,
  };
}
