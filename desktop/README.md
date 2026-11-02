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

## Ethone Setup

Installeur personnalisé dans `setup/`. Il embarque le paquet NSIS d'Ethone et réutilise le catalogue, les flux et la vérification des signatures d'Ethone (`src-tauri/src`), sans copie.

```bash
node tools/build-setup.mjs "Notes de version"
```

Le résultat arrive dans `out/` : `Ethone-Setup-X.exe`, le paquet de mise à jour, sa signature et `latest.json`. La clé `~/.tauri/ethone-updater.key` est obligatoire : la perdre met fin aux mises à jour des installations existantes. Rien n'est publié par ce script.

Installation silencieuse :

```bash
Ethone-Setup-X.exe /S /MODULES=kairo,hdv-tracker /DIR=D:\Apps\Ethone /NODESKTOP
```

Le code de sortie vaut 0 si tout a réussi. Seuls les modules listés sont installés. Le journal se trouve dans la page Journal d'Ethone.

## Mises à jour d'Ethone

Ethone lit `latest.json` sur la dernière release de `Rub19/dashboard`, avec sa propre clé. Une release Ethone utilise le tag `desktop-vX.Y.Z`, marqué comme dernière version, avec `latest.json` et le paquet signé en assets. Tant qu'aucune release n'existe, Ethone n'affiche simplement rien.

## Organisation

| Chemin | Rôle |
|---|---|
| `catalog/catalog.json` | Modules connus : flux, clé publique, détection, règle de mise à jour, compatibilité |
| `src-tauri/src/auth.rs` | Connexion au compte Ethone, session dans le Gestionnaire d'identifiants |
| `src-tauri/src/action.rs` | Décide de l'action possible, sans effet de bord |
| `src-tauri/src/feed.rs` | Lit les flux de versions |
| `src-tauri/src/install.rs` | Télécharge, vérifie, installe, contrôle le résultat |
| `src-tauri/src/system.rs` | Registre Windows, processus, lancement |
| `src-tauri/src/journal.rs` | Journal local des opérations |
| `src/` | Interface, motion dans `src/motion.ts` |
| `setup/` | Ethone Setup : `src/engine.rs` pour le moteur, `ui/` pour l'interface |

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
