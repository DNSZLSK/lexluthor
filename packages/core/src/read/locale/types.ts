// Types du reader par-locale. Pur (aucune dependance runtime) pour servir de socle
// commun aux donnees (glossary/verbs/words), au squelette partage et aux proses.
import type { Valence, VerbPattern } from '../../engine/message';

export type Gender = 'm' | 'f';

/** Une entree de glossaire : le mot traduit + son genre (FR/ES) + pluriel irregulier. */
export interface NounEntry {
  readonly word: string; // forme SINGULIERE canonique
  readonly gender?: Gender; // absent en EN (pas de genre)
  readonly plural?: string; // pluriel irregulier (sinon word + "s" cote FR/EN)
  readonly number?: 'plural'; // nom intrinsequement pluriel/massif (data, options…) : pluriel par defaut
}

/** Entree de verbe CANONIQUE (FR = reference) : porte la valence + le cas, partages. */
export interface VerbEntry {
  readonly word: string; // 3e personne du present, locale courante
  readonly valence: Valence;
  readonly pattern?: VerbPattern; // defaut 'plain'
}

/** Tables de mots d'une locale (adjectifs/infinitifs/comparaisons/predicats de collection). */
export interface WordTables {
  readonly adjectives: Readonly<Record<string, string>>;
  readonly infinitives: Readonly<Record<string, string>>;
  readonly comparisons: Readonly<Record<string, string>>;
  readonly arrayPredicate: Readonly<Record<string, string>>;
}

export type { Valence, VerbPattern };
