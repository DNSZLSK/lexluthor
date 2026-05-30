# LexLuthor · VOSTFR du code

Des **sous-titres en langage naturel sous ton code**, toujours actifs. Tu ouvres un fichier, les sous-titres sont là. Zéro action, zéro IA, zéro réseau.

LexLuthor est un **traducteur déterministe** : un parser (tree-sitter) + un dictionnaire de patterns → une phrase qui dit ce que le code **fait**. Même code, même sous-titre, toujours. C'est ce qui te fait apprendre à lire, par exposition répétée, comme les sous-titres d'un film.

## Pour qui

- **Onboarding** : tu arrives dans un codebase inconnu, chaque fichier s'explique tout seul.
- **Polyglotte forcé** : dev Python qui review du Go, dev front qui tombe sur du back. Tu comprends sans changer de fenêtre.
- **Audit / sécu** : les patterns sensibles (`eval`, `Buffer.from(x,'base64')`, `child_process`, accès dynamiques) sont signalés en **rouge** (diagnostics).
- **Apprentissage** : reconvertis, juniors, formateurs.

Et comme c'est **100% offline et déterministe**, ton code ne quitte jamais ta machine (contrairement à « coller dans ChatGPT »).

## Utilisation

Installe, ouvre un fichier `.js` / `.ts`. C'est tout. Une pastille **VOSTFR** apparaît dans la barre d'état (clic = activer/désactiver).

### Réglages (`lexluthor.*`)

- **`renderStyle`** : `inline` (défaut, fiable : annotation en fin de ligne façon GitLens) ou `cinema` (**expérimental** : tente d'afficher le sous-titre *sous* la ligne). Commande : « LexLuthor : basculer cinéma / fin de ligne ».
- **`density`** : `all` / `idiomatic` (défaut) / `headers`. Combien de sous-titres afficher (anti-encombrement).
- **`languages`** : langages où les sous-titres s'affichent (défaut : JS/JSX/TS).
- **`security.enabled`** : alertes rouges des patterns sensibles.
- **`humanLanguage`** : `fr` (EN/ES à venir).

## Statut

v0.2 : JavaScript / TypeScript, sous-titres en français. À venir : EN/ES, plus de langages (Java prêt côté moteur), profondeur (chaînage, async).

Déterministe, offline, open source. [github.com/DNSZLSK/lexluthor](https://github.com/DNSZLSK/lexluthor) · MIT.
