import type { SyntaxNode } from '../engine/types';
import { demonstrative, humanizeName, isGlossed, readVerbName, splitIdentifier } from './names';

// Verbes de « recherche » : sur une collection nommée (pending.get / users.find),
// l'OBJET nomme la chose récupérée (« récupère la promesse en attente »).
const LOOKUP_VERBS = new Set(['get', 'fetch', 'find', 'read', 'load']);
// Verbes de « rangement » par clé : users.set(id, u) -> « enregistre l'utilisateur pour cet identifiant ».
const STORE_VERBS = new Set(['set', 'put']);

/**
 * Lit une EXPRESSION en intention (phrase verbe au présent, sans « On »). L'appelant
 * préfixe « On ». `subjectHint` = le nom à gauche d'une affectation (ex: `const user = …`),
 * utilisé comme objet quand le verbe seul manque de complément (`users.get(x)` -> « récupère
 * l'utilisateur »). Retourne `null` si rien de lisible (l'appelant fait alors un littéral
 * fidèle). On ne lit que ce qui est présent, jamais d'invention.
 */
export function readExpr(node: SyntaxNode, subjectHint?: string): string | null {
  switch (node.type) {
    case 'await_expression': {
      const inner = node.namedChildren[0];
      return inner ? readExpr(inner, subjectHint) : null;
    }
    case 'subscript_expression': {
      // OBJ[key] = recherche par clé dans une collection.
      const obj = node.childForFieldName('object');
      const index = node.childForFieldName('index');
      if (obj?.type === 'identifier' && index?.type === 'identifier') {
        return `récupère ${humanizeName(obj.text, 'le', { singular: true })} pour ${demonstrative(index.text)}`;
      }
      return null;
    }
    case 'call_expression':
      return readCall(node, subjectHint);
    case 'new_expression': {
      const ctor = node.childForFieldName('constructor');
      return ctor?.type === 'identifier' ? `crée ${humanizeName(ctor.text, 'un')}` : null;
    }
    default:
      return null;
  }
}

function readCall(node: SyntaxNode, subjectHint?: string): string | null {
  const fn = node.childForFieldName('function');
  if (!fn) return null;
  const args = node.childForFieldName('arguments')?.namedChildren ?? [];
  const firstArg = args[0];

  if (fn.type === 'member_expression') {
    const obj = fn.childForFieldName('object');
    const methodName = fn.childForFieldName('property')?.text ?? null;
    if (!methodName) return null;
    const words = splitIdentifier(methodName);
    const bareVerb = words.length === 1 ? words[0]! : null;

    // Verbe NU sur une collection nommée : l'objet nomme l'élément (lecture par clé).
    if (bareVerb && obj?.type === 'identifier' && isGlossed(obj.text)) {
      const thing = humanizeName(obj.text, 'le', { singular: true });
      // get/find/fetch : pending.get(lang) -> « récupère la promesse en attente pour ce langage ».
      if (LOOKUP_VERBS.has(bareVerb)) {
        const v = readVerbName(methodName) ?? 'récupère';
        return firstArg?.type === 'identifier' ? `${v} ${thing} pour ${demonstrative(firstArg.text)}` : `${v} ${thing}`;
      }
      // set/put(clé, valeur) : users.set(id, u) -> « enregistre l'utilisateur pour cet identifiant ».
      if (STORE_VERBS.has(bareVerb) && args.length >= 2 && firstArg?.type === 'identifier') {
        return `enregistre ${thing} pour ${demonstrative(firstArg.text)}`;
      }
    }
    return readVerb(methodName, bareVerb != null, firstArg, subjectHint);
  }

  if (fn.type === 'identifier') {
    return readVerb(fn.text, splitIdentifier(fn.text).length === 1, firstArg, subjectHint);
  }

  return null;
}

/** Verbe d'un nom de méthode/fonction, avec son complément. */
function readVerb(
  name: string,
  verbOnly: boolean,
  firstArg: SyntaxNode | null | undefined,
  subjectHint?: string,
): string | null {
  const verb = readVerbName(name);
  if (!verb) return null;
  const isLookup = LOOKUP_VERBS.has(splitIdentifier(name)[0] ?? '');
  if (firstArg?.type === 'identifier') {
    // Verbe de recherche (get/load/find…) : l'arg est une clé -> « … pour cette clé ».
    if (isLookup) return `${verb} pour ${demonstrative(firstArg.text)}`;
    // Verbe d'action nu (validate/start…) : l'arg est l'objet direct -> « valide la requête ».
    if (verbOnly) return `${verb} ${humanizeName(firstArg.text, 'le')}`;
    // Verbe portant déjà son nom (createEngine, makeContext…) : l'arg est l'entrée, on l'omet.
    return verb;
  }
  // Verbe seul sans complément : on emprunte le nom de la variable affectée.
  if (verbOnly && subjectHint) return `${verb} ${humanizeName(subjectHint, 'le')}`;
  return verb;
}
