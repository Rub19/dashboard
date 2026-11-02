# Ethone Desktop

Application Windows qui détecte les modules Ethone, lit leurs versions et les installe après vérification de leur signature. Chaque module reste un programme indépendant, développé dans son propre dépôt, et fonctionne sans Ethone.

## Commandes

Depuis `desktop/`, avec Node 22+ et Rust stable :

```bash
npm install
npm run tauri dev
npm run build
npx tauri build --bundles nsis
```

Tests, depuis `desktop/src-tauri/` :

```bash
cargo test
cargo test -- --ignored real_
```

La seconde commande interroge les vrais flux et télécharge les vrais paquets.

Test d'installation réel, uniquement dans Windows Sandbox (rien n'est installé sur le PC) :

```bash
node tools/sandbox-test.mjs
```

Il installe Kairo et HDV, refuse une mise à jour si l'application tourne, puis met à jour.

## Organisation

| Chemin | Rôle |
|---|---|
| `catalog/catalog.json` | Modules connus : flux, clé publique, détection, règle de mise à jour, compatibilité |
| `src-tauri/src/action.rs` | Décide de l'action possible, sans effet de bord |
| `src-tauri/src/feed.rs` | Lit les flux de versions |
| `src-tauri/src/install.rs` | Télécharge, vérifie, installe, contrôle le résultat |
| `src-tauri/src/system.rs` | Registre Windows, processus, lancement |
| `src-tauri/src/journal.rs` | Journal local des opérations |
| `src/` | Interface |

## Ajouter un module

1. Le module publie un flux Tauri `latest.json` signé depuis son propre dépôt.
2. Ajouter son entrée dans `catalog/catalog.json`.
3. Lancer `cargo test`, puis `cargo test -- --ignored real_`.

Le code du module ne vient jamais dans ce dépôt.

## Règles de mise à jour

| Règle | Comportement | Modules |
|---|---|---|
| `delegated` | Ethone installe si l'application est fermée, sinon elle se met à jour elle-même | Kairo, HDV Tracker |
| `autonomous` | Ethone fait la première installation, puis l'application gère ses mises à jour | Interior Studio |
| `manual` | Ethone indique la version et ouvre la page officielle | Nova PC Suite |
| `web` | Ethone ouvre le site | Ethone Breach |
