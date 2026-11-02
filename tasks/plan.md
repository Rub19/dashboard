# Plan d'implémentation : dashboard Ethone Windows

## Vue d'ensemble

Remplacer le petit tableau des modules par une application Windows complète, construite par tranches verticales. Chaque fonction utilise la session Rust et les services Ethone existants, sans WebView distante ni donnée factice.

## Décisions d'architecture

- Garder Tauri 2 et les applications dans leurs dépôts respectifs.
- Le JavaScript appelle des commandes Tauri typées ; Rust conserve le jeton et contacte Supabase ou le Worker.
- La barre latérale montre des domaines stables. Les nombreuses sous-pages restent dans la navigation interne de leur domaine.
- Une tranche n'est annoncée comme terminée qu'après tests et vérification adaptée au risque.

## Ordre

1. Fondation sécurisée et navigation.
2. Accueil et Applications.
3. Productivité.
4. Fichiers.
5. Identité et connexions.
6. Jeux.
7. Discord.
8. Collaboration.
9. Brain et automatisations.
10. Analyses.
11. Administration et support.

## Points de contrôle

- Après la fondation : tests Rust, contrôle TypeScript et build local.
- Après chaque domaine : tests ciblés, états vide/erreur et navigation clavier.
- Avant toute fenêtre de test, Windows Sandbox, publication, release ou modification de `main` : accord explicite de Rub19.

## Risques

| Risque | Impact | Réponse |
|---|---|---|
| Exposer le jeton au frontend | Élevé | Tous les appels authentifiés passent par Rust |
| Copier les 170 pages web telles quelles | Élevé | Regroupement par domaines et adaptation Windows |
| Divergence entre le site et Desktop | Moyen | Contrats typés et mêmes endpoints réels |
| Gros changement invérifiable | Élevé | Tranches de cinq fichiers maximum |
| Fonction web dépendante du navigateur | Moyen | Vérifier sa compatibilité Windows avant portage |

## Suivi

Les tâches et leurs preuves sont dans `tasks/todo.md`. Chaque domaine recevra sa propre spécification avant son premier changement de code.
