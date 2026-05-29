import type { Interpolator, SyntaxNode } from './types';

const VOWELS = /^[aàâäeéèêëiîïoôöuùûühAÀÂÄEÉÈÊËIÎÏOÔÖUÙÛÜH]/;

function asText(node: SyntaxNode | string | null | undefined): string {
  if (node == null) return '';
  return typeof node === 'string' ? node : node.text;
}

/**
 * Interpolateur FR deterministe (pas de LLM) : nettoyage de litteraux, elision,
 * troncature. Centralise pour que toutes les phrases du lexique sonnent pareil.
 */
export const interpolator: Interpolator = {
  lit(node) {
    const raw = asText(node).trim();
    // retire une paire de guillemets simples/doubles/backticks englobants
    return raw.replace(/^(['"`])([\s\S]*)\1$/, '$2');
  },

  name(node) {
    return asText(node).trim();
  },

  elide(article, word) {
    const w = word.trim();
    if (!w) return article;
    if (VOWELS.test(w)) {
      const apostropheBase = article === 'de' ? 'd' : 'l';
      return `${apostropheBase}'${w}`;
    }
    return `${article} ${w}`;
  },

  truncate(s, max = 90) {
    const t = s.trim();
    return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
  },
};
