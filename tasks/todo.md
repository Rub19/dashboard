# Tâches : dashboard Ethone Windows

## Ethone Setup

- [x] Construire Ethone Setup 0.1.0.
  - Preuve : build du 2 novembre 2026, code de sortie 0, quatre fichiers dans `desktop/out/`.
- [x] Tester Ethone Setup dans Windows Sandbox.
  - Preuve : installation Ethone/Kairo/HDV, réparation, refus d'un module inconnu, protection pendant l'exécution et désinstallation sélective réussis.
- [x] Refaire le test silencieux avec le build du code `b2e0a6b2`.
  - Preuve : scénario complet réussi dans Windows Sandbox le 2 novembre 2026 à 18 h 31 et 18 h 36. WebView2 ne démarre plus dans la Sandbox, y compris avec l'ancien Setup : fenêtres contrôlées sur le vrai PC à la place, sans installation.

## Fondation

- [x] Définir la navigation stable et testable.
  - Acceptation : domaines validés, page active déterministe, aucune route factice.
  - Vérification : test unitaire ciblé et contrôle TypeScript.
  - Fichiers : `desktop/src/navigation.ts`, `desktop/src/navigation.test.ts`, `desktop/package.json`.
- [x] Intégrer la navigation au shell Windows.
  - Acceptation : Accueil et Applications sont accessibles au clavier, les domaines futurs sont absents tant qu'ils ne fonctionnent pas.
  - Vérification : contrôle TypeScript et build frontend.
  - Fichiers : `desktop/src/Shell.tsx`, `desktop/src/style.css`, `desktop/src/i18n.ts`.
- [x] Livrer l'Accueil avec les données locales réelles.
  - Acceptation : identité, état des applications et mises à jour proviennent des commandes existantes ; chargement et erreur sont visibles.
  - Vérification : test de transformation, contrôle TypeScript et build frontend.
  - Fichiers : `desktop/src/HomePage.tsx`, `desktop/src/home.ts`, `desktop/src/home.test.ts`, `desktop/src/Shell.tsx`, `desktop/src/style.css`.

## Domaines suivants

- [x] Spécifier le contrat sécurisé de `productivity`.
- [x] Ajouter la lecture authentifiée Notes/Tâches côté Rust.
  - Acceptation : chemins allowlistés, session obligatoire, réponse validée.
  - Vérification : tests Rust ciblés puis suite Rust complète.
  - Fichiers : `desktop/src-tauri/src/auth.rs`, `desktop/src-tauri/src/sync.rs`, `desktop/src-tauri/src/main.rs`.
- [x] Afficher les vraies listes Notes/Tâches dans une page Windows.
  - Acceptation : chargement, vide et erreur ; aucune donnée de démonstration.
  - Vérification : tests frontend, contrôle TypeScript et build.
  - Fichiers : `desktop/src/api.ts`, `desktop/src/ProductivityPage.tsx`, `desktop/src/productivity.ts`, `desktop/src/productivity.test.mjs`, `desktop/src/Shell.tsx`.
- [x] Relier la création, la modification et la suppression de Notes/Tâches.
  - Preuve : tâche TEST créée, terminée, modifiée et supprimée sur le vrai compte le 2 novembre 2026. Notes non testées en écriture.
  - Acceptation : validation, confirmation de suppression et résultat Worker réel.
  - Vérification : tests Rust et frontend, build.
- [x] Livrer Calendrier comme tranche séparée.
  - Acceptation : lecture et mutations Worker, validation des dates, ordre chronologique et formulaire Début/Fin.
  - Vérification : onze tests frontend, 50 tests Rust, contrôle TypeScript, build Vite et ouverture réelle de l'exécutable release. Le formulaire a été annulé sans modifier les données.
- [ ] Tester avec Rub19 tout ce qui est marqué « Écrit » dans `docs/ecosystem/dashboard-capabilities.md`.
- [ ] Porter la liste « Non porté » de `docs/ecosystem/HANDOFF.md`.

## Vérification finale

- [ ] Tous les tests ciblés réussissent.
- [ ] Les tests Rust réussissent.
- [ ] Le contrôle TypeScript et le build réussissent.
- [ ] Aucun secret, donnée factice, bouton inactif ou page distante n'est présent.
- [ ] Le contrôle pré-commit réussit avant tout commit.
- [ ] Aucun push, aucune release et aucune modification de `main` sans accord explicite.
