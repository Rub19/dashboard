# Spécification : `productivity`

## Objectif

Rendre Notes, Tâches, Calendrier, Habitudes et Focus utilisables dans Ethone Desktop avec les mêmes données réelles que le site. La première tranche livre la lecture de Notes et Tâches ; les mutations viennent ensuite avec leurs propres tests.

## Technologies et contrats

- React affiche des modèles typés et n'accède jamais directement au réseau.
- Rust appelle le Worker Ethone avec le jeton conservé en mémoire.
- Le Worker reste la source de vérité via `/api/notes`, `/api/tasks` et `/api/events`.
- Les commandes Tauri sont limitées à `list`, `create`, `update` et `delete`. Le frontend ne fournit jamais une URL.

```ts
type ItemKind = "notes" | "tasks" | "events";

interface EthoneItem {
  id: string;
  title: string;
  body: string;
  done: boolean;
  startAt: string | null;
  endAt: string | null;
  data: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}
```

## Commandes

```powershell
cd desktop/src-tauri
cargo test
cd ..
npm test
npm run typecheck
npm run build
```

## Structure

- `desktop/src-tauri/src/sync.rs` : types, validation et appels Worker.
- `desktop/src-tauri/src/auth.rs` : accès authentifié et renouvellement de session.
- `desktop/src/api.ts` : contrat Tauri TypeScript.
- `desktop/src/ProductivityPage.tsx` : listes et actions Windows.
- `desktop/src/productivity.ts` : transformations pures testées.

## Stratégie de test

- Rust : types autorisés, limites des champs, validation de réponse et refus sans session.
- TypeScript : tri, libellés et séparation Notes/Tâches sans donnée inventée.
- Interface : chargement, vide, erreur et données réelles.

## Limites

- Toujours : échapper le texte via React, limiter les longueurs, valider les réponses Worker et conserver le jeton en Rust.
- Demander avant : modification de schéma Supabase, nouvel endpoint Worker ou nouvelle dépendance.
- Jamais : URL arbitraire fournie par React, jeton dans `localStorage`, HTML brut, note ou tâche de démonstration.

## Critères de réussite

- Une session connectée peut lire ses Notes et Tâches réelles.
- Une session absente ou expirée est refusée côté Rust.
- Les réponses mal formées et erreurs réseau produisent un état d'erreur lisible.
- Une liste vide est affichée comme vide, sans contenu de remplacement.
- Les mutations ne sont affichées que lorsqu'elles sont réellement reliées au Worker.
