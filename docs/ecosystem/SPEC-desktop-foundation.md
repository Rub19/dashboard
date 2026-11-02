# Spécification : `desktop-foundation`

## Objectif

Fournir la base de la nouvelle application Ethone pour Windows : une navigation locale cohérente, des données obtenues par Rust avec la session Ethone, et des états explicites pour chaque écran. Aucune page distante n'est intégrée dans la fenêtre.

## Technologies

- Tauri 2 et Rust pour la fenêtre, la session, le réseau et les secrets.
- React 19, TypeScript et Vite pour les vues locales.
- Framer Motion et `desktop/src/motion.ts` pour les transitions.
- Mica, Segoe UI Variable et les composants déjà présents dans `desktop/src/`.

## Commandes

Depuis `desktop/` :

```powershell
npm run typecheck
npm run build
```

Depuis `desktop/src-tauri/` :

```powershell
cargo test
```

Avant un commit, depuis la racine :

```powershell
node ./scripts/precommit-upload-check.mjs
node ./scripts/audit-security.mjs
```

Les builds complets Tauri et Windows Sandbox exigent l'accord préalable de Rub19.

## Structure

- `desktop/src/` : shell, navigation, pages et états d'interface.
- `desktop/src-tauri/src/` : session, appels réseau, système et commandes Tauri.
- `desktop/catalog/` : catalogue embarqué des applications.
- `docs/ecosystem/` : décisions, spécifications et preuves de vérification.

## Style de code

Les types décrivent les données réelles et les composants affichent chaque état sans valeur inventée :

```ts
export type Loadable<T> =
  | { state: "loading" }
  | { state: "ready"; data: T }
  | { state: "empty" }
  | { state: "error"; message: string };
```

Les noms sont explicites, les composants restent courts et aucun commentaire n'est ajouté dans le code conformément aux règles du projet.

## Stratégie de test

- Tests Rust pour l'authentification, les contrats réseau et les erreurs.
- Tests unitaires sans réseau pour la navigation et les transformations de données.
- `npm run typecheck` après chaque tranche d'interface.
- `npm run build` à chaque point de contrôle autorisé.
- Vérification réelle dans l'application uniquement avec l'accord de Rub19.

## Limites

- Toujours : conserver le jeton côté Rust, gérer chargement/vide/erreur, respecter clavier et réduction des animations, utiliser de vraies données.
- Demander avant : nouvelle dépendance d'exécution, changement de schéma Supabase, gros build, ouverture d'une fenêtre de test ou Windows Sandbox.
- Jamais : envoyer le jeton au JavaScript, intégrer une page web distante, inventer une donnée ou une action, publier, toucher `main`, demander un secret.

## Critères de réussite

- La navigation présente les sections validées sans exposer 170 routes au premier niveau.
- La session et les données distantes restent accessibles uniquement via des commandes Rust.
- Chaque page possède des états chargement, vide et erreur vérifiables.
- Accueil et Applications affichent uniquement l'état réel du compte et des programmes installés.
- Les tests Rust, le contrôle TypeScript et le build de la tranche réussissent.

## Questions ouvertes

Aucune pour cette fondation. Les contrats propres à chaque module seront précisés dans sa spécification avant son implémentation.
