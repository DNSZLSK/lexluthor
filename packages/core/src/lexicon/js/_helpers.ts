import type { SyntaxNode } from '../../engine/types';

/** Code HTTP -> intention en clair (oriente lecture, pas jargon). */
const STATUS_PHRASES: Record<string, string> = {
  '200': 'tout va bien',
  '201': 'créé',
  '202': 'accepté',
  '204': 'rien à renvoyer',
  '301': 'déplacé définitivement',
  '302': 'redirigé',
  '304': 'inchangé',
  '400': 'requête invalide',
  '401': 'non authentifié',
  '403': 'accès interdit',
  '404': 'pas trouvé',
  '409': 'conflit',
  '422': 'données invalides',
  '429': 'trop de requêtes',
  '500': 'erreur serveur',
  '502': 'passerelle invalide',
  '503': 'service indisponible',
};

export function statusPhrase(code: string): string {
  return STATUS_PHRASES[code] ?? 'réponse';
}

const METHOD_LABELS: Record<string, string> = {
  get: 'GET (lecture)',
  post: 'POST (création)',
  put: 'PUT (remplacement)',
  patch: 'PATCH (modification)',
  delete: 'DELETE (suppression)',
};

export function httpMethodLabel(method: string): string {
  return METHOD_LABELS[method.toLowerCase()] ?? method.toUpperCase();
}

/** Noms extraits d'un motif de destructuration ({a, b} ou [a, b]). */
export function patternNames(pattern: SyntaxNode): string[] {
  const names: string[] = [];
  for (const child of pattern.namedChildren) {
    switch (child.type) {
      case 'shorthand_property_identifier_pattern':
      case 'identifier':
        names.push(child.text);
        break;
      case 'pair_pattern': {
        const key = child.childForFieldName('key');
        if (key) names.push(key.text);
        break;
      }
      default:
        break;
    }
  }
  return names;
}

/** Le 1er enfant nomme de type voulu (utile dans les render). */
export function firstNamed(node: SyntaxNode, type: string): SyntaxNode | null {
  return node.namedChildren.find((n) => n.type === type) ?? null;
}
