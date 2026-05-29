<p align="center">
  <img src="docs/logo.png" alt="LexLuthor" width="260" />
</p>

<p align="center"><strong>Sous-titres pour code source. Comme au cinéma, mais pour lire du code.</strong></p>

<p align="center"><em>Un traducteur déterministe qui affiche des sous-titres en langage naturel sous chaque bloc de code. Sans IA, sans API, sans réseau.</em></p>

---

LexLuthor lit le code et écrit, sous chaque instruction, ce qu'elle **fait** en français. Un parser AST, un dictionnaire de patterns, des sous-titres qui apparaissent instantanément. VOSTFR pour le code.

```js
const express = require('express');          › On importe le module express
const app = express();                       › On crée la constante app
const users = new Map();                      › On crée un stockage en mémoire (clé → valeur)

app.get('/users/:id', (req, res) => {         › Quand on reçoit une requête GET (lecture) sur /users/:id
  const user = users.get(req.params.id);      › On crée la constante user
  if (!user) {                                › Si user n'existe pas :
    return res.status(404).json({ ... });     › On répond : pas trouvé (404)
  }
  res.json(user);                             › On renvoie les données au format JSON
});

app.listen(3000, () => {                      › On démarre le serveur sur le port 3000
  console.log('Server running');              › On affiche un message dans la console
});
```

C'est la **vraie sortie** de l'outil, pas une illustration. Un sous-titre par instruction, décrivant l'intention.

## Le problème

L'IA écrit de plus en plus de code. L'humain en lit de plus en plus.

Le ratio écriture/lecture de code s'inverse. Avec Claude Code, Copilot, Cursor, un développeur passe aujourd'hui 80 % de son temps à **lire** du code qu'il n'a pas tapé. Et ce ne sont pas que les développeurs : les product managers review des PRs, les designers lisent du front, les ops lisent des pipelines, les responsables sécu auditent des packages, les reconvertis arrivent dans des codebases existants.

Personne ne leur apprend à lire.

On enseigne à **écrire** du code, pas à le **lire**. C'est comme apprendre l'allemand en commençant par les dissertations, sans jamais avoir lu un panneau de signalisation.

## La solution

Le même mécanisme que les sous-titres de cinéma.

Quand tu regardes un film en VOSTFR, tu lis les sous-titres au début. Puis tu captes des mots sans regarder en bas. Puis un jour tu réalises que tu n'as pas lu le sous-titre depuis dix minutes. Ton cerveau a câblé le lien son → sens tout seul, par exposition répétée.

LexLuthor fait exactement ça avec le code. Tu lis le code **et** le sous-titre en parallèle. Le sous-titre décrit l'**intention**, pas la syntaxe. Et progressivement, le pattern de code devient lisible directement, comme un mot dans une langue que tu maîtrises.

## Pourquoi pas d'IA ?

Parce que l'IA casserait l'apprentissage.

Ce qui grave le câblage signe → sens dans le cerveau, c'est la **constance** : le même pattern rend toujours la même phrase. Un LLM qui paraphrase différemment à chaque appel empêche le cerveau de fixer le lien. C'est comme un sous-titre de film qui changerait de traduction à chaque visionnage : tu n'apprendrais jamais le mot.

Un code explainer basé sur l'IA est un **film doublé** : tu comprends l'histoire, mais tu restes dépendant. Tu n'apprends jamais la langue.

LexLuthor est un **dictionnaire**, pas un explainer. Même entrée, même sortie. Toujours. Le produit c'est le lexique : un ensemble curé de patterns AST mappés vers des phrases en langage naturel. Déterministe, offline, instantané, sans hallucination.

## Démarrer

```bash
npm install      # installe les deps + copie les .wasm dans public/wasm/
npm run dev      # ouvre http://localhost:5173
npm test         # lance la suite Vitest
npm run build    # typecheck strict + build de production
```

100 % navigateur, aucun serveur. Colle du code, choisis le langage, lis.

## Architecture

```
Code source
    │
    ▼
┌─────────────────────┐     ┌─────────────────────┐
│  tree-sitter (AST)  │     │   Shiki (couleurs)  │
│  parse + walk +     │     │   tokenisation      │
│  claim-par-plages   │     │   syntaxique        │
└────────┬────────────┘     └────────┬────────────┘
         │                           │
         │   Subtitle[]              │   Lignes colorisées
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
              interleave()
                     │
                     ▼
            Rendu VOSTFR (DOM)
       code sombre + sous-titres ambre
```

Le moteur et le coloriseur ne se parlent jamais. Ils convergent uniquement dans `interleave()`.

Au cœur du moteur, **un seul invariant déterministe** : le *claim par plages*. Chaque règle réclame une plage de code (tout un sous-arbre, ou seulement l'en-tête d'une structure). Une règle plus spécifique réclame en premier ; un nœud déjà inclus dans une plage réclamée ne re-matche plus. Résultat garanti : aucun sous-titre n'est strictement inclus dans un autre, sauf relation structure → corps (un `if` et les instructions qu'il contient).

### Le dictionnaire (le cœur du produit)

Trois couches de lecture, comme une langue :

**Lexicale.** Les mots. `const` → « on crée », `return` → « on renvoie ». L'alphabet du code.

**Idiomatique.** Les expressions courantes. `arr.filter(...)` → « on garde seulement les éléments qui remplissent une condition ». `app.get('/users', ...)` → « quand on reçoit une requête GET ». Le vocabulaire courant.

**Compositionnelle.** Les structures. Un `if (!user)` réclame son en-tête, et les instructions de son corps gardent leurs propres sous-titres : on lit la structure **et** son contenu.

Plus une couche **signal** pour l'audit de sécurité. `eval()`, `Buffer.from(x, 'base64')`, `child_process`, accès dynamiques en chaîne `obj[a][b]()` → sous-titres en **rouge**, pas en ambre. Parce qu'un `Buffer.from(payload, 'base64')` dans un `postinstall`, ça mérite d'être vu.

### Règle d'or : jamais deviner

Un sous-titre approximatif enseigne un mauvais réflexe : c'est pire que pas de sous-titre du tout. Quand le dictionnaire ne connaît pas un pattern, il montre le code nu. De la VO sans sous-titre. C'est exactement à ça que ressemble la fluidité.

Le dictionnaire grandit. Il n'improvise jamais.

## Stack

| Composant | Choix | Pourquoi |
|-----------|-------|----------|
| Parser | tree-sitter via web-tree-sitter (WASM) | Un seul modèle d'arbre pour JS, TS, Java. DSL de queries natif (S-expressions). Tolérance aux erreurs sur du code incomplet. |
| Grammaires | @vscode/tree-sitter-wasm | Set cohérent, compatible ABI avec le moteur 0.26 (vérifié au test). |
| Coloriseur | Shiki (fine-grained) | Tokens par ligne, intercalage trivial. Interface swappable (plan B Prism si le bundle gêne ; ici ~418 Ko gzip). |
| Langage | TypeScript strict | `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Versions épinglées (pas de `^`). |
| Build | Vite | Dev rapide, build optimisé, `.wasm` servis en statique. |
| Tests | Vitest | Fixtures générées depuis les `doc.examples` des règles. Le dictionnaire est sa propre doc et son propre test. |
| Runtime | 100 % navigateur | Zéro serveur, zéro API, offline-first. Les `.wasm` sont servis localement. |

## Langages cibles

- **JavaScript** : livré, de bout en bout.
- **TypeScript** : livré (réutilise le lexique JS + règles de typage : interface, type, enum).
- **Java** : à venir (grammaire et fabrique d'adapter déjà prêtes).

Ajouter un langage = importer une grammaire tree-sitter (200+ existent) + écrire le fichier de lexique. Le moteur ne change pas.

## Tests

Le dictionnaire est un citoyen de première classe. Chaque règle porte ses propres exemples (`doc.examples`), qui **sont** les fixtures :

- **`doc.spec`** : chaque règle produit le sous-titre attendu sur ses exemples (JS et TS).
- **`lexicon-style.spec`** : échoue si un sous-titre contient du jargon syntaxique (« fonction fléchée », « ternaire », « callback »…). Les sous-titres décrivent l'intention, pas la syntaxe.
- **`engine.spec`** : sous-titrage de bout en bout du corpus + invariant anti-double-sous-titrage (containment uniquement pour les structures) + alertes rouges + « jamais deviner ».
- **`coverage-holes.spec`** : mode diagnostic. Quels types de nœuds AST n'ont aucune règle ? Échoue sur tout nouveau trou hors liste connue.
- **`interleave.spec`** : le rendu (pur) intercale correctement code et sous-titres.
- **`wasm-load.spec`** : les 4 grammaires WASM chargent sans erreur ABI.

## Ce que LexLuthor n'est pas

- **Pas un code explainer.** Un explainer est jetable. LexLuthor est cumulatif : chaque lecture renforce un câblage que tu emportes partout.
- **Pas un outil pour devs seniors.** C'est un outil pour quiconque doit lire du code sans l'avoir écrit.
- **Pas un wrapper autour d'un LLM.** Zéro IA à l'exécution. Un dictionnaire.
- **Pas un linter, pas un formateur.** Le code n'est jamais modifié. Jamais.

## Vision

Imagine ouvrir n'importe quel fichier (JavaScript, Python, Rust, SQL, Go) et voir apparaître sous chaque bloc un sous-titre qui dit ce que le code **fait**, en français, instantanément. Pas ce que la syntaxe **est**. Ce que le code **fait**.

Imagine un VS Code où tu actives les sous-titres comme sur Netflix. Un toggle. VOSTFR on, VOSTFR off. Au début tu laisses activé. Puis un jour tu le coupes et tu lis quand même.

C'est le jour où tu es passé en VO.

## Nom

**Lex** comme lexique. **Luther** comme le traducteur qui a mis la Bible en langue du peuple. (Et **Luthor** comme le génie qui aime un bon plan.)

## Licence

MIT

## Auteur

[@DNSZLSK](https://github.com/DNSZLSK)
