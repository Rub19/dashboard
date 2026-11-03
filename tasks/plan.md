# Plan d'implémentation : Ethone Desktop Ultimate Edition

## Vue d'ensemble

Faire évoluer l'application Windows déjà complète vers une édition premium, sans reconstruire ce qui existe. Chaque amélioration part de l'audit `docs/ecosystem/ULTIMATE-AUDIT.md`, utilise les vraies données et reste livrée par tranche verticale vérifiable.

## Décisions d'architecture

- Garder Tauri 2 et les applications dans leurs dépôts respectifs.
- Le JavaScript appelle des commandes Tauri typées ; Rust conserve le jeton et contacte Supabase ou le Worker.
- La barre latérale montre des domaines stables. Les nombreuses sous-pages restent dans la navigation interne de leur domaine.
- Une tranche n'est annoncée comme terminée qu'après tests et vérification adaptée au risque.

## Ordre

1. Contrat de qualité et audit intégral.
2. Centre de préférences et sauvegarde versionnée.
3. Comportement Windows contrôlable.
4. Navigation, recherche et récents.
5. Retours, erreurs et tâches longues.
6. Mesures et optimisations de performance.
7. Revue de chaque domaine fonctionnel.
8. Vérification réelle multi-écran, clavier et scaling avec Rub19.

## Points de contrôle

- Après la fondation : tests frontend et contrôle TypeScript. Le build local attend l'accord de Rub19.
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
