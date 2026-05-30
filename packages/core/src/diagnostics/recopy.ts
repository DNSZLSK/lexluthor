// Détecte un sous-titre qui a laissé fuir du code (recopie littérale, pas une lecture).
// Sert au diagnostic de couverture ET à la garde anti-recopie des tests (DRY).
// Évite la flèche unicode → (U+2192) des phrases légitimes (« clé → valeur »).

// Jetons de code ASCII révélateurs (la flèche `=>` est ASCII, distincte de `→`).
const CODE_TOKEN = /=>|===|!==|\?\.|&&|\|\||\$\{|\s\?\s.+\s:\s/;
// Chaînage de méthodes : a(...).b( — typiquement du code recopié non lu.
const METHOD_CHAIN = /\.[A-Za-z_$][\w$]*\([^)]*\)\.[A-Za-z_$][\w$]*\(/;

/** Vrai si le texte contient des jetons de code révélateurs (flèche, ===, ?., ${…}, chaînage). */
export function isCodeRecopied(text: string): boolean {
  return CODE_TOKEN.test(text) || METHOD_CHAIN.test(text);
}

/** Jeton dominant d'un sous-titre recopié, pour regrouper les hotspots par signature. */
export function dominantToken(text: string): string {
  if (METHOD_CHAIN.test(text)) return 'method-chain';
  for (const t of ['=>', '===', '!==', '?.', '&&', '||', '${']) if (text.includes(t)) return t;
  if (/\s\?\s.+\s:\s/.test(text)) return 'ternary';
  return 'other';
}
