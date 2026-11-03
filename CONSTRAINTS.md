# Contraintes Ethone Desktop

Dernière révision : 3 novembre 2026. Ce contrat s'applique aux changements dans `desktop/` et `docs/ecosystem/`.

## Socle obligatoire

- Aucun nouveau `@ts-ignore`, `eslint-disable`, test ignoré, bouton inactif, donnée factice ou fonction non implémentée.
- Aucun secret, jeton, mot de passe ou donnée personnelle dans le code, les tests, les journaux ou les commits.
- Aucun changement de `main`, publication, release, build Windows, fenêtre de test ou capture sans l'accord de Rub19.
- Toute nouvelle préférence agit réellement, est validée avant lecture et reste compatible avec les anciennes valeurs.
- Toute tranche garde les fonctions existantes et touche au plus cinq fichiers, sauf justification écrite dans le plan.
- Ce fichier ne doit jamais être affaibli pour faire passer un changement.

## Contrôles bloquants

| Dimension | Règle | Contrôle |
|---|---|---|
| TypeScript | Zéro erreur | `npx tsc --noEmit` depuis `desktop/` |
| Frontend | Tous les tests passent, aucun test retiré ou ignoré | `npm test` depuis `desktop/` |
| Rust | Tous les tests du module touché passent | `cargo test` dans le projet Rust concerné |
| Envoi | Aucun fichier sensible ou trop lourd | `node ./scripts/precommit-upload-check.mjs` |
| Diff | Aucun espace ou conflit de fusion | `git diff --check` |
| Architecture | Pas de page distante dans une fenêtre, jetons conservés en Rust, composants communs réutilisés | Revue du diff |

## Contrôles à mesurer avec l'accord de Rub19

| Dimension | Situation actuelle | Direction |
|---|---|---|
| Accessibilité réelle | Navigation clavier déjà vérifiée, lecteur d'écran non vérifié | Aucun blocage clavier, focus visible, états nommés |
| Performance de démarrage | Pas de mesure reproductible enregistrée | Mesurer avant d'optimiser, puis ne pas régresser |
| Taille du bundle | Pas de référence enregistrée | Mesurer au prochain build autorisé, puis ne pas augmenter sans raison |
| Interface Windows | Deux écrans et plusieurs tailles déjà vérifiés | Refaire la matrice après chaque lot visuel autorisé |

## Définition de terminé

Une tranche est terminée uniquement si son comportement est relié à de vraies données ou à une préférence réelle, ses tests passent, son état non vérifié en vrai est indiqué dans le handoff, et le commit reste indépendant et réversible.
